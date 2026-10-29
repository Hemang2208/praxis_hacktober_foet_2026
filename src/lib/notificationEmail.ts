import dbConnect from "@/lib/dbConnect";
import { User } from "@/models/User";
import Notification from "@/models/Notification";
import EmailDeliveryLog from "@/models/EmailDeliveryLog";
import { inngest } from "../../inngest/client";

export interface SendNotificationEmailInput {
  user_id: string;
  notification_id: string;
  event_type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const HIGH_PRIORITY_EVENTS = new Set([
  "TASK_ASSIGNED",
  "TASK_COMPLETED",
  "TASK_IN_REVIEW",
  "TASK_REJECTED",
  "TASK_BLOCKED",
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "PROJECT_APPROVED",
  "PROJECT_REJECTED",
  "PROJECT_MEMBER_ADDED",
  "CODE_REVIEW_RESULT",
  "CODE_REVIEW_FAILED",
  "ASSESSMENT_READY",
  "SUPPORT_ESCALATION",
  "SUPERVISOR_TASK_SUBMITTED",
  "SUPERVISOR_TASK_BLOCKED",
  "SUPERVISOR_CODE_REVIEW_READY",
  "SUPERVISOR_ASSESSMENT_CREATED",
]);

function requiresEmail(eventType: string): boolean {
  return HIGH_PRIORITY_EVENTS.has(eventType);
}

function eventCategory(eventType: string): "task" | "review" | "project" | "assessment" | null {
  if (eventType.startsWith("TASK_") || eventType.startsWith("SUPERVISOR_TASK_")) return "task";
  if (eventType.startsWith("CODE_REVIEW_") || eventType === "AI_FEEDBACK_READY" || eventType === "SUPERVISOR_CODE_REVIEW_READY") return "review";
  if (eventType.startsWith("PROJECT_")) return "project";
  if (eventType.startsWith("ASSESSMENT_") || eventType === "SUPERVISOR_ASSESSMENT_CREATED") return "assessment";
  if (eventType === "SUPPORT_ESCALATION") return "project";
  return null;
}

function checkPreference(
  prefs: Record<string, unknown> | undefined,
  eventType: string,
): boolean {
  if (!prefs) return true;
  if ((prefs as Record<string, boolean>)?.email === false) return false;

  const category = eventCategory(eventType);
  if (!category) return true;

  const key = `${category}Emails` as keyof typeof prefs;
  return (prefs as Record<string, boolean>)?.[key] !== false;
}

export async function sendNotificationEmail(
  input: SendNotificationEmailInput,
) {
  if (!requiresEmail(input.event_type)) {
    return { skipped: true, reason: "Event type does not require email" };
  }

  await dbConnect();

  const user = await User.findById(input.user_id).select("email notificationPreferences").lean();
  if (!user || !user.email) {
    return { skipped: true, reason: "User not found or no email" };
  }

  if (!checkPreference(user.notificationPreferences as Record<string, unknown> | undefined, input.event_type)) {
    return { skipped: true, reason: "User has disabled this email category" };
  }

  const idempotencyKey = `email:${input.notification_id}:${input.event_type}`;

  const existing = await EmailDeliveryLog.findOne({ idempotency_key: idempotencyKey }).lean();
  if (existing) {
    return { skipped: true, reason: "Email already sent (idempotency)" };
  }

  await EmailDeliveryLog.create({
    user_id: input.user_id,
    notification_id: input.notification_id,
    event_type: input.event_type,
    email_sent: false,
    delivery_status: "pending",
    idempotency_key: idempotencyKey,
    retry_count: 0,
  });

  const userEmail = user.email;
  const userUnknown = user as unknown;
  const userRecord = userUnknown as Record<string, unknown>;
  const userName = String(userRecord?.full_name || userRecord?.companyName || userRecord?.collegeName || "");

  await inngest.send({
    name: "kiyo/notification.email",
    data: {
      user_id: input.user_id,
      user_email: userEmail,
      user_name: userName,
      notification_id: input.notification_id,
      event_type: input.event_type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
      idempotency_key: idempotencyKey,
    },
  });

  return { queued: true, idempotency_key: idempotencyKey };
}
