import dbConnect from "../../src/lib/dbConnect";
import Project from "../../src/models/Project";
import { User } from "../../src/models/User";
import {
  sendEmail,
  generateProjectInviteHtml,
  generateProjectInviteText,
  generateProjectRemovalHtml,
  generateProjectRemovalText,
} from "../../src/lib/mailer";
import { emit_notification_event } from "../../src/lib/notificationEvents";
import { inngest } from "../client";

type MemberEventData = {
  projectId?: string;
  projectTitle?: string;
  recipientEmail?: string;
  recipientName?: string;
  role?: string;
  actorName?: string;
};

const getProjectName = async (
  projectId?: string,
  fallbackTitle?: string,
): Promise<string> => {
  if (!projectId) return fallbackTitle || "Project";
  try {
    await dbConnect();
    const project = await Project.findById(projectId).select("title").lean();
    return String((project as any)?.title || fallbackTitle || "Project");
  } catch {
    return fallbackTitle || "Project";
  }
};

const normalizeEmail = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase();

export const onProjectMemberAdded = inngest.createFunction(
  {
    id: "project-member-added-email",
    name: "Send Project Member Added Email",
    retries: 1,
  },
  { event: "project/member.added" },
  async ({ event, step }) => {
    await step.run("send-member-added-email", async () => {
      const data = (event.data || {}) as MemberEventData;
      const to = normalizeEmail(data.recipientEmail);
      if (!to) return { skipped: true, reason: "Missing recipient email" };

      const projectTitle = await getProjectName(data.projectId, data.projectTitle);
      const projectUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://kiyoai.in"}/dashboard/projects/${data.projectId || ""}`;

      const subject = `You were added to project: ${projectTitle}`;
      const html = generateProjectInviteHtml({
        recipientName: data.recipientName,
        inviterName: data.actorName,
        projectTitle,
        projectUrl,
        role: data.role,
      });
      const text = generateProjectInviteText({
        recipientName: data.recipientName,
        inviterName: data.actorName,
        projectTitle,
        projectUrl,
        role: data.role,
      });

      await sendEmail({ to, subject, html, text });
      return { sent: true, to, projectTitle };
    });

    await step.run("create-in-app-notification", async () => {
      const data = (event.data || {}) as MemberEventData;
      const email = normalizeEmail(data.recipientEmail);
      if (!email) return { skipped: true, reason: "Missing recipient email" };

      await dbConnect();
      const user = await User.findOne({ email }).select("_id").lean();
      if (!user) return { skipped: true, reason: "User not found by email" };

      const projectTitle = await getProjectName(data.projectId, data.projectTitle);

      await emit_notification_event({
        user_id: String(user._id),
        event_type: "PROJECT_MEMBER_ADDED",
        title: "Added to Project",
        message: `You were added to project: ${projectTitle}`,
        category: "projects",
        priority: "medium",
        event_key: `PROJECT_MEMBER_ADDED:${data.projectId}:${String(user._id)}`,
        metadata: {
          project_id: data.projectId as any,
          project_title: projectTitle,
        },
      });
      return { notified: true, userId: String(user._id) };
    });

    return { success: true };
  },
);

export const onProjectMemberRemoved = inngest.createFunction(
  {
    id: "project-member-removed-email",
    name: "Send Project Member Removed Email",
    retries: 1,
  },
  { event: "project/member.removed" },
  async ({ event, step }) => {
    await step.run("send-member-removed-email", async () => {
      const data = (event.data || {}) as MemberEventData;
      const to = normalizeEmail(data.recipientEmail);
      if (!to) return { skipped: true, reason: "Missing recipient email" };

      const projectTitle = await getProjectName(data.projectId, data.projectTitle);
      const projectUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://kiyoai.in"}/dashboard/projects/${data.projectId || ""}`;

      const subject = `You were removed from project: ${projectTitle}`;
      const html = generateProjectRemovalHtml({
        recipientName: data.recipientName,
        removerName: data.actorName,
        projectTitle,
        projectUrl,
        role: data.role,
      });
      const text = generateProjectRemovalText({
        recipientName: data.recipientName,
        removerName: data.actorName,
        projectTitle,
        projectUrl,
        role: data.role,
      });

      await sendEmail({ to, subject, html, text });
      return { sent: true, to, projectTitle };
    });

    return { success: true };
  },
);
