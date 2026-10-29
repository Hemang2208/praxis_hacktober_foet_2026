import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Notification, { NotificationEventType } from "@/models/Notification";
import { sendNotificationEmail } from "@/lib/notificationEmail";
import Project from "@/models/Project";
import { Company, User } from "@/models/User";
import Task from "@/models/Task";
import AIFeedback from "@/models/AIFeedback";

type NotificationPriority = "low" | "medium" | "high" | "urgent";
type NotificationCategory =
  | "feedback"
  | "tasks"
  | "projects"
  | "system"
  | "achievements"
  | "reviews"
  | "assessments"
  | "support";

export interface EmitNotificationEventInput {
  user_id: string | Types.ObjectId;
  event_type: NotificationEventType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  event_key?: string;
  created_by?: string | Types.ObjectId;
}

export async function emit_notification_event(
  input: EmitNotificationEventInput,
) {
  await dbConnect();

  const user_object_id =
    typeof input.user_id === "string"
      ? new Types.ObjectId(input.user_id)
      : input.user_id;

  const created_by_object_id = input.created_by
    ? typeof input.created_by === "string"
      ? new Types.ObjectId(input.created_by)
      : input.created_by
    : undefined;

  try {
    const notification = await Notification.create({
      user_id: user_object_id,
      event_type: input.event_type,
      event_key: input.event_key,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
      is_read: false,
      priority: input.priority || "medium",
      category: input.category || "system",
      created_by: created_by_object_id,
    });

    sendNotificationEmail({
      user_id: String(user_object_id),
      notification_id: String(notification._id),
      event_type: input.event_type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    }).catch((err) => {
      console.error("[NOTIFICATION] Failed to queue email:", err);
    });

    return notification;
  } catch (error) {
    // If duplicate event_key is detected, fetch and return the existing notification.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000 &&
      input.event_key
    ) {
      return Notification.findOne({
        user_id: user_object_id,
        event_key: input.event_key,
      });
    }

    throw error;
  }
}

export async function mark_notification_as_read(
  user_id: string | Types.ObjectId,
  notification_id: string,
) {
  await dbConnect();

  const user_object_id =
    typeof user_id === "string" ? new Types.ObjectId(user_id) : user_id;

  return Notification.findOneAndUpdate(
    {
      _id: notification_id,
      user_id: user_object_id,
    },
    {
      $set: {
        is_read: true,
        isRead: true,
        read_at: new Date(),
        readAt: new Date(),
      },
    },
    { new: true },
  );
}

export async function mark_all_notifications_as_read(
  user_id: string | Types.ObjectId,
) {
  await dbConnect();

  const user_object_id =
    typeof user_id === "string" ? new Types.ObjectId(user_id) : user_id;

  return Notification.updateMany(
    {
      user_id: user_object_id,
      $or: [{ is_read: false }, { isRead: false }],
    },
    {
      $set: {
        is_read: true,
        isRead: true,
        read_at: new Date(),
        readAt: new Date(),
      },
    },
  );
}

export async function notify_company_supervisors({
  projectId,
  eventType,
  title,
  message,
  metadata = {},
  priority = "high",
  category = "tasks",
}: {
  projectId: string | Types.ObjectId;
  eventType: NotificationEventType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  priority?: "low" | "medium" | "high" | "urgent";
  category?: NotificationCategory;
}) {
  await dbConnect();

  const project = await Project.findById(projectId).select("companyId").lean().exec();
  if (!project) return;

  const companyId = (project as any).companyId;
  if (!companyId) return;

  const company = await Company.findById(companyId).lean().exec();
  if (!company || !Array.isArray(company.members)) return;

  const supervisorEmails = company.members
    .filter(
      (m: any) =>
        m.status === "active" &&
        ["owner", "admin", "manager"].includes(m.subrole)
    )
    .map((m: any) => String(m.email).toLowerCase());

  if (supervisorEmails.length === 0) return;

  const supervisors = await User.find({
    email: { $in: supervisorEmails },
  }).select("_id").lean().exec();

  for (const supervisor of supervisors) {
    try {
      await emit_notification_event({
        user_id: supervisor._id as any,
        event_type: eventType,
        title,
        message,
        category,
        priority,
        event_key: `${eventType}:${projectId}:${metadata.task_id || ""}:${metadata.assessment_id || ""}:${supervisor._id}`,
        metadata: {
          ...metadata,
          project_id: projectId,
        },
      });
    } catch (err) {
      console.error(`[NOTIFY_SUPERVISORS] Failed for supervisor ${supervisor._id}:`, err);
    }
  }
}

export async function check_and_notify_student_code_review(
  taskId: string | Types.ObjectId,
) {
  await dbConnect();

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      console.warn(`[NOTIFY_STUDENT_REVIEW] Task not found for ID: ${taskId}`);
      return;
    }

    // Only send the email if the task is completed
    if (task.status !== "completed") {
      console.log(`[NOTIFY_STUDENT_REVIEW] Task status is "${task.status}" (not completed). Delaying student notification.`);
      return;
    }

    const reviewDoc = await AIFeedback.findOne({ task_id: task._id }).sort({ created_at: -1 }).lean().exec();
    
    // Check if the review has actually generated (status completed or failed)
    if (!reviewDoc || (reviewDoc.status !== "completed" && reviewDoc.status !== "failed")) {
      console.log(`[NOTIFY_STUDENT_REVIEW] Code review not ready/pending for task ${task._id}. Waiting for generation to complete.`);
      return;
    }

    const assignedTo = task.assigned_to;
    if (!assignedTo) {
      console.warn(`[NOTIFY_STUDENT_REVIEW] Task ${task._id} has no assignee. Cannot notify.`);
      return;
    }

    if (reviewDoc.status === "completed") {
      // 1. Emit CODE_REVIEW_RESULT
      await emit_notification_event({
        user_id: String(assignedTo),
        event_type: "CODE_REVIEW_RESULT",
        title: "Code Review Result Ready",
        message: `Code review result is ready for task: ${task.title || "Task"}`,
        category: "feedback",
        priority: "medium",
        event_key: `CODE_REVIEW_RESULT:${task._id}:${reviewDoc._id}`,
        metadata: {
          task_id: task._id,
          task_title: task.title || "Task",
          feedback_id: reviewDoc._id,
          pull_request_url: reviewDoc.pull_request_url,
          review_status: "completed",
          project_id: task.project_id || (task as any).project,
        },
      });

      const overallScore = reviewDoc.assessment?.overall ?? 0;
      const passed = overallScore >= 50;

      // 2. Emit CODE_REVIEW_PASSED or CODE_REVIEW_FAILED
      await emit_notification_event({
        user_id: String(assignedTo),
        event_type: passed ? "CODE_REVIEW_PASSED" : "CODE_REVIEW_FAILED",
        title: passed ? "Code Review Passed" : "Code Review Failed",
        message: passed
          ? `Code review passed with score ${overallScore} for task: ${task.title || "Task"}`
          : `Code review failed with score ${overallScore} for task: ${task.title || "Task"}`,
        category: passed ? "reviews" : "feedback",
        priority: passed ? "medium" : "high",
        event_key: `CODE_REVIEW_${passed ? "PASSED" : "FAILED"}:${task._id}:${reviewDoc._id}`,
        metadata: {
          task_id: task._id,
          task_title: task.title || "Task",
          feedback_id: reviewDoc._id,
          pull_request_url: reviewDoc.pull_request_url,
          review_status: passed ? "passed" : "failed",
          overall_score: overallScore,
          project_id: task.project_id || (task as any).project,
        },
      });

      console.log(`[NOTIFY_STUDENT_REVIEW] Dispatched success code review emails/notifications for task: ${task._id}`);
    } else {
      // CODE_REVIEW_FAILED (generation failed)
      await emit_notification_event({
        user_id: String(assignedTo),
        event_type: "CODE_REVIEW_FAILED",
        title: "Code Review Failed",
        message: `Code review could not be generated for task: ${task.title || "Task"}. Please try again.`,
        category: "feedback",
        priority: "medium",
        event_key: `CODE_REVIEW_FAILED:${task._id}:${reviewDoc._id || Date.now()}`,
        metadata: {
          task_id: task._id,
          task_title: task.title || "Task",
          project_id: task.project_id || (task as any).project,
          review_status: reviewDoc?.status || "failed",
        },
      });

      console.log(`[NOTIFY_STUDENT_REVIEW] Dispatched failed code review email/notification for task: ${task._id}`);
    }
  } catch (error) {
    console.error("[NOTIFY_STUDENT_REVIEW] Error checking/notifying student review:", error);
  }
}
