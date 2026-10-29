import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import AIFeedback from "@/models/AIFeedback";
import Task from "@/models/Task";
import { User, IStudent } from "@/models/User";
import { sendEmail } from "@/lib/mailer";
import { Types } from "mongoose";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kiyoai.in";

export interface NotificationServiceOptions {
  channels?: {
    inApp?: boolean;
    email?: boolean;
    push?: boolean;
  };
  priority?: "low" | "medium" | "high" | "urgent";
  scheduledFor?: Date;
}

const checkNotificationPreference = (
  userPrefs: any,
  key: "email" | "taskEmails" | "reviewEmails" | "projectEmails" | "assessmentEmails"
) => {
  if (!userPrefs) return true; // default all to true (on)
  if (userPrefs.email === false) return false;
  return userPrefs[key] !== false;
};

export class NotificationService {
  /**
   * Creates and sends AI feedback ready notification
   */
  static async notifyAIFeedbackReady(
    user_id: string | Types.ObjectId,
    task_id: string | Types.ObjectId,
    feedbackId: string | Types.ObjectId,
    options: NotificationServiceOptions = {},
  ) {
    try {
      await dbConnect();

      // Fetch required data
      const [task, feedback, user] = await Promise.all([
        Task.findById(task_id).select("title description project_id"),
        AIFeedback.findById(feedbackId).select("pull_request_url assessment"),
        User.findById(user_id).select("full_name email role notificationPreferences"),
      ]);

      if (!task || !feedback || !user) {
        throw new Error("Required data not found");
      }

      // Ensure the user is a student
      if (user.role !== "student") {
        throw new Error("User is not a student");
      }

      const studentUser = user as IStudent;

      // Create notification
      const notification = await Notification.createAIFeedbackReadyNotification(
        user_id as Types.ObjectId,
        task_id as Types.ObjectId,
        task.title,
        feedbackId as Types.ObjectId,
        feedback.pull_request_url,
      );

      // Apply custom options
      if (options.channels) {
        notification.channels = {
          ...notification.channels,
          ...options.channels,
        };
      }
      if (options.priority) {
        notification.priority = options.priority;
      }
      if (options.scheduledFor) {
        notification.scheduled_for = options.scheduledFor;
      }

      await notification.save();

      // Send notifications based on channels
      const deliveryPromises = [];

      // In-app notification (always delivered immediately)
      deliveryPromises.push(notification.markAsDelivered("inApp"));

      // Email notification
      if (notification.channels.email && checkNotificationPreference(user.notificationPreferences, "reviewEmails")) {
        // Build task URL - use nested route if project_id is available
        const taskUrl = task.project_id
          ? `${process.env.NEXTAUTH_URL}/student/projects/${task.project_id}/board/tasks/${task_id}?tab=feedback`
          : `${process.env.NEXTAUTH_URL}/student/tasks/${task_id}?tab=feedback`;
        const emailPromise = this.sendFeedbackReadyEmail(
          studentUser.email,
          studentUser.full_name,
          task.title,
          feedback.assessment.overall,
          taskUrl,
        )
          .then(() => {
            return notification.markAsDelivered("email");
          })
          .catch((error) => {
            return notification.markAsDelivered("email", error.message);
          });

        deliveryPromises.push(emailPromise);
      }

      // Push notification (if implemented)
      if (notification.channels.push) {
        // TODO: Implement push notification service
        deliveryPromises.push(
          notification.markAsDelivered(
            "push",
            "Push notifications not implemented yet",
          ),
        );
      }

      // Wait for all delivery attempts
      await Promise.allSettled(deliveryPromises);

      return notification;
    } catch (error) {
      console.error("Error in notifyAIFeedbackReady:", error);
      throw error;
    }
  }

  /**
   * Creates and sends task assignment notification
   */
  static async notifyTaskAssigned(
    user_id: string | Types.ObjectId,
    task_id: string | Types.ObjectId,
    options: NotificationServiceOptions = {},
  ) {
    try {
      await dbConnect();

      const [task, user] = await Promise.all([
        Task.findById(task_id).populate("project_id", "title"),
        User.findById(user_id).select("full_name email role notificationPreferences"),
      ]);

      if (!task || !user) {
        throw new Error("Required data not found");
      }

      // Ensure the user is a student
      if (user.role !== "student") {
        throw new Error("User is not a student");
      }

      const studentUser = user as IStudent;

      // Handle populated project data
      const project_id =
        task.project_id &&
        typeof task.project_id === "object" &&
        "title" in task.project_id
          ? (task.project_id as { _id: Types.ObjectId; title: string })
          : undefined;

      const notification = await Notification.createTaskAssignedNotification(
        user_id as Types.ObjectId,
        task_id as Types.ObjectId,
        task.title,
        project_id?._id,
        project_id?.title,
      );

      // Apply custom options
      if (options.channels) {
        notification.channels = {
          ...notification.channels,
          ...options.channels,
        };
      }
      if (options.priority) {
        notification.priority = options.priority;
      }

      await notification.save();

      // Send email if enabled
      if (notification.channels.email && checkNotificationPreference(user.notificationPreferences, "taskEmails")) {
        try {
          // Build task URL - use nested route if project_id is available
          const taskUrl = project_id?._id
            ? `${process.env.NEXTAUTH_URL}/student/projects/${project_id._id}/board/tasks/${task_id}`
            : `${process.env.NEXTAUTH_URL}/student/tasks/${task_id}`;
          await this.sendTaskAssignedEmail(
            studentUser.email,
            studentUser.full_name,
            task.title,
            project_id?.title,
            taskUrl,
          );
          await notification.markAsDelivered("email");
        } catch (error) {
          await notification.markAsDelivered("email", (error as Error).message);
        }
      }

      await notification.markAsDelivered("inApp");

      return notification;
    } catch (error) {
      console.error("Error in notifyTaskAssigned:", error);
      throw error;
    }
  }

  /**
   * Sends AI feedback ready email
   */
  private static async sendFeedbackReadyEmail(
    email: string,
    full_name: string,
    taskTitle: string,
    overallScore: number,
    feedbackUrl: string,
  ) {
    const subject = `🎯 AI Feedback Ready: ${taskTitle}`;

    const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
  <div style="margin-bottom: 32px;">
    <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height:32px;display:block;border:none;" />
  </div>
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">AI Feedback Ready</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 0;">Hi ${full_name},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
      Your code review is complete and the analysis is ready for your inspection. Our AI agent has conducted a comprehensive assessment of your submission, analyzing it for architectural consistency, performance efficiency, security best practices, and code cleanliness.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
      Reviewing these line-by-line suggestions is an excellent way to learn, improve code quality, and prepare your project for final approval.
    </p>
  </div>
  <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
    <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 12px 0; color: #111111;">Performance Details</h3>
    <p style="font-size: 14px; margin: 0 0 8px 0; color: #555555;"><strong>Task:</strong> ${taskTitle}</p>
    <p style="font-size: 14px; margin: 0; color: #555555;"><strong>Overall Score:</strong> ${overallScore}/100</p>
  </div>
  <div style="margin: 32px 0;">
    <a href="${feedbackUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; text-align: center;">
      View Review Feedback
    </a>
  </div>
  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
    <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 16px 0;">
      This is an automated notification from Kiyo Learning Platform.
    </p>
    <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
      &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
    </p>
  </div>
</div>
    `;

    const textContent = `
AI Feedback Ready: ${taskTitle}

Hi ${full_name},

Your AI-powered code review for "${taskTitle}" is now ready!

Overall Score: ${overallScore}/100

View your feedback: ${feedbackUrl}

Best regards,
Kiyo Learning Platform
    `;

    await sendEmail({
      to: email,
      subject,
      html: htmlContent,
      text: textContent,
    });
  }

  /**
   * Sends task assigned email
   */
  private static async sendTaskAssignedEmail(
    email: string,
    full_name: string,
    taskTitle: string,
    projectTitle?: string,
    taskUrl?: string,
  ) {
    const subject = `📋 New Task Assigned: ${taskTitle}`;

    const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
  <div style="margin-bottom: 32px;">
    <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height:32px;display:block;border:none;" />
  </div>
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">New Task Assigned</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 0;">Hi ${full_name},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
      You have been assigned a new task on your project board. To begin, please review the task description, check any associated checklist items, and ensure that your local repository is properly linked. Once you start working, you can update the task status directly on the project board so your team is aware of your progress.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
      If you have any questions or require clarification about the task's requirements, please reach out to your project supervisor or post a comment directly on the task board.
    </p>
  </div>
  <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
    <p style="font-size: 14px; margin: 0 0 8px 0; color: #555555;"><strong>Task:</strong> ${taskTitle}</p>
    ${projectTitle ? `<p style="font-size: 14px; margin: 0; color: #555555;"><strong>Project:</strong> ${projectTitle}</p>` : ""}
  </div>
  ${taskUrl ? `
  <div style="margin: 32px 0;">
    <a href="${taskUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; text-align: center;">
      View Task Details
    </a>
  </div>
  ` : ""}
  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
    <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 16px 0;">
      This is an automated notification from Kiyo Learning Platform.
    </p>
    <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
      &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
    </p>
  </div>
</div>
    `;

    await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  }

  /**
   * Gets notification statistics for a user
   */
  static async getNotificationStats(user_id: string | Types.ObjectId) {
    await dbConnect();

    const stats = await Notification.aggregate([
      { $match: { user_id: new Types.ObjectId(user_id.toString()) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          byCategory: {
            $push: {
              category: "$category",
              isRead: "$isRead",
            },
          },
        },
      },
      {
        $project: {
          total: 1,
          unread: 1,
          categoryStats: {
            $reduce: {
              input: "$byCategory",
              initialValue: {},
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    $arrayToObject: [
                      [
                        {
                          k: "$$this.category",
                          v: {
                            $add: [
                              {
                                $ifNull: [
                                  {
                                    $getField: {
                                      field: "$$this.category",
                                      input: "$$value",
                                    },
                                  },
                                  0,
                                ],
                              },
                              1,
                            ],
                          },
                        },
                      ],
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    ]);

    return stats[0] || { total: 0, unread: 0, categoryStats: {} };
  }

  /**
   * Cleans up old read notifications (runs as background job)
   */
  static async cleanupOldNotifications(daysOld: number = 30) {
    await dbConnect();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      isRead: true,
      readAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  }
}

export default NotificationService;
