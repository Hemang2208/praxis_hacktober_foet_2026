import { inngest } from "../client";
import { transporter } from "../../src/lib/mailer";
import dbConnect from "../../src/lib/dbConnect";
import Notification from "../../src/models/Notification";
import EmailDeliveryLog from "../../src/models/EmailDeliveryLog";
import { templates } from "../../src/lib/email-templates";

type EmailEventData = {
  user_id: string;
  user_email: string;
  user_name: string;
  notification_id: string;
  event_type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  idempotency_key: string;
};

const EVENT_SUBJECTS: Record<string, string> = {
  TASK_ASSIGNED: "New Task Assigned",
  TASK_COMPLETED: "Task Completed",
  TASK_IN_REVIEW: "Task In Review",
  TASK_REJECTED: "Task Revision Required",
  TASK_BLOCKED: "Task Blocked",
  TASK_DUE_SOON: "Task Due Soon",
  TASK_OVERDUE: "Task Overdue",
  PROJECT_APPROVED: "Project Approved",
  PROJECT_REJECTED: "Project Update",
  PROJECT_MEMBER_ADDED: "Added to Project",
  CODE_REVIEW_RESULT: "Code Review Ready",
  CODE_REVIEW_FAILED: "Code Review Needs Attention",
  ASSESSMENT_READY: "Assessment Ready",
  SUPPORT_ESCALATION: "Support Escalation",
  SUPERVISOR_TASK_SUBMITTED: "Student Task Submitted for Review",
  SUPERVISOR_TASK_BLOCKED: "Student Task Blocked",
  SUPERVISOR_CODE_REVIEW_READY: "Student Code Review Completed",
  SUPERVISOR_ASSESSMENT_CREATED: "New Assessment Created",
};

function buildHtmlContent(data: EmailEventData): string {
  const metadata = data.metadata || {};
  const name = data.user_name || undefined;

  switch (data.event_type) {
    case "TASK_ASSIGNED":
      return templates.taskAssigned({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
        assignedBy: metadata.assigned_by as string,
      });

    case "TASK_COMPLETED":
      return templates.taskCompleted({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
      });

    case "TASK_IN_REVIEW":
      return templates.taskInReview({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
      });

    case "TASK_REJECTED":
      return templates.taskRejected({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
      });

    case "TASK_BLOCKED":
      return templates.taskBlocked({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
      });

    case "TASK_DUE_SOON":
      return templates.taskDueSoon({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        dueDate: metadata.due_date as string,
      });

    case "TASK_OVERDUE":
      return templates.taskOverdue({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        dueDate: metadata.due_date as string,
      });

    case "PROJECT_APPROVED":
      return templates.projectApproved({
        recipientName: name,
        projectTitle: (metadata.project_title as string) || "Project",
        projectId: (metadata.project_id as string) || "",
      });

    case "PROJECT_REJECTED":
      return templates.projectRejected({
        recipientName: name,
        projectTitle: (metadata.project_title as string) || "Project",
        projectId: (metadata.project_id as string) || "",
      });

    case "PROJECT_MEMBER_ADDED":
      return templates.projectMemberAdded({
        recipientName: name,
        projectTitle: (metadata.project_title as string) || "Project",
        projectId: (metadata.project_id as string) || "",
        role: metadata.role as string,
      });

    case "CODE_REVIEW_RESULT":
      return templates.codeReviewReady({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
      });

    case "CODE_REVIEW_FAILED":
      return templates.codeReviewFailed({
        recipientName: name,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        score: metadata.overall_score as number,
      });

    case "ASSESSMENT_READY":
      return templates.assessmentReady({
        recipientName: name,
        assessmentTitle: metadata.assessment_title as string,
        assessmentId: (metadata.assessment_id as string) || "",
      });

    case "SUPPORT_ESCALATION":
      return templates.supportEscalation({
        recipientName: name,
        reason: metadata.reason as string,
      });

    case "SUPERVISOR_TASK_SUBMITTED":
      return templates.supervisorTaskSubmitted({
        recipientName: name,
        studentName: metadata.student_name as string,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
        pullRequestUrl: metadata.pull_request_url as string,
      });

    case "SUPERVISOR_TASK_BLOCKED":
      return templates.supervisorTaskBlocked({
        recipientName: name,
        studentName: metadata.student_name as string,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
      });

    case "SUPERVISOR_CODE_REVIEW_READY":
      return templates.supervisorCodeReviewReady({
        recipientName: name,
        studentName: metadata.student_name as string,
        taskTitle: (metadata.task_title as string) || "Untitled Task",
        taskId: (metadata.task_id as string) || "",
        projectId: metadata.project_id as string,
        projectTitle: metadata.project_title as string,
        score: metadata.overall_score as number,
      });

    case "SUPERVISOR_ASSESSMENT_CREATED":
      return templates.supervisorAssessmentCreated({
        recipientName: name,
        assessmentTitle: metadata.assessment_title as string,
        assessmentId: (metadata.assessment_id as string) || "",
        projectId: (metadata.project_id as string) || "",
        projectTitle: metadata.project_title as string,
      });

    default:
      return `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2>${data.title}</h2>
          <p>${data.message}</p>
        </div>
      `;
  }
}

export const onSendNotificationEmail = inngest.createFunction(
  {
    id: "kiyo-notification-email",
    name: "Send Notification Email",
    retries: 3,
    concurrency: {
      limit: 1,
    },
  },
  { event: "kiyo/notification.email" },
  async ({ event, step }) => {
    const data = event.data as EmailEventData;

    return await step.run("send-notification-email", async () => {
      await dbConnect();

      const defaultFrom =
        process.env.GODADDY_USER ||
        process.env.GMAIL_USER ||
        "support@kiyoai.in";

      const subject =
        EVENT_SUBJECTS[data.event_type] || data.title || "Notification from Kiyo";

      const htmlContent = buildHtmlContent(data);

      let deliveryStatus: "sent" | "failed" = "sent";
      let errorMsg: string | undefined;

      try {
        await transporter.sendMail({
          from: `"Kiyo" <${defaultFrom}>`,
          to: data.user_email,
          subject: `${subject} - Kiyo`,
          html: htmlContent,
          text: data.message,
        });

        await Notification.findByIdAndUpdate(data.notification_id, {
          $set: {
            delivered: {
              inApp: { status: true, deliveredAt: new Date() },
              email: { status: true, deliveredAt: new Date() },
              push: { status: false },
            },
          },
        });
      } catch (err) {
        deliveryStatus = "failed";
        errorMsg = err instanceof Error ? err.message : "Unknown error sending email";
        console.error(`[EMAIL] Failed to send ${data.event_type} to ${data.user_email}:`, errorMsg);

        await Notification.findByIdAndUpdate(data.notification_id, {
          $set: {
            "delivered.email.status": false,
            "delivered.email.deliveredAt": new Date(),
            "delivered.email.error": errorMsg,
          },
        });

        throw new Error(errorMsg);
      } finally {
        const retryCount = await EmailDeliveryLog.countDocuments({
          idempotency_key: data.idempotency_key,
          delivery_status: "failed",
        });

        await EmailDeliveryLog.findOneAndUpdate(
          { idempotency_key: data.idempotency_key },
          {
            $set: {
              email_sent: deliveryStatus === "sent",
              sent_at: new Date(),
              delivery_status: deliveryStatus,
              error: errorMsg,
              retry_count: retryCount,
            },
          },
          { upsert: true },
        );
      }

      return {
        sent: deliveryStatus === "sent",
        to: data.user_email,
        event_type: data.event_type,
        notification_id: data.notification_id,
      };
    });
  },
);
