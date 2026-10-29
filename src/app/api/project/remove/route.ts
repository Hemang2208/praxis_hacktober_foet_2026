import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { User, IStudent } from "@/models/User";
import {
  sendEmail,
  generateProjectRemovalHtml,
  generateProjectRemovalText,
} from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { project_id, email, name, role } = await req.json();

    if (!project_id || !email) {
      return NextResponse.json(
        { message: "project_id and email are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const normalizedEmail = String(email).toLowerCase().trim();

    const project = await Project.findById(project_id).select("title");
    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const user = await User.findOne({
      email: { $regex: `^${normalizedEmail}$`, $options: "i" },
    }).select("full_name email profile_picture image_url notificationPreferences");

    if (!user) {
      // User doesn't exist in system
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Send notification email to existing user, but continue even if mail fails
    const projectUrl = `${process.env.NEXTAUTH_URL}/user/projects/${project_id}`;

    const subject = `You were removed from project: ${project.title}`;
    const html = generateProjectRemovalHtml({
      recipientName:
        (user.role === "student" ? (user as IStudent).full_name : user.email) ||
        name,
      removerName: undefined, // remover name not passed to this route currently
      projectTitle: project.title,
      projectUrl,
      role,
    });

    const text = generateProjectRemovalText({
      recipientName:
        (user.role === "student" ? (user as IStudent).full_name : user.email) ||
        name,
      removerName: undefined,
      projectTitle: project.title,
      projectUrl,
      role,
    });

    const checkNotificationPreference = (
      userPrefs: any,
      key: "email" | "taskEmails" | "reviewEmails" | "projectEmails" | "assessmentEmails"
    ) => {
      if (!userPrefs) return true; // default all to true (on)
      if (userPrefs.email === false) return false;
      return userPrefs[key] !== false;
    };

    if (checkNotificationPreference((user as any).notificationPreferences, "projectEmails")) {
      try {
        await sendEmail({ to: user.email, subject, html, text });
      } catch (emailErr) {
        console.error(
          "Remove email send failed, continuing and returning user info:",
          emailErr,
        );
      }
    } else {
      console.log(`Skipped sending project removal email to ${user.email} because they disabled Project Emails`);
    }

    const profile_picture =
      (user.role === "student" ? (user as IStudent).profile_picture : null) ||
      user.image_url ||
      "";

    return NextResponse.json(
      {
        message: "Email sent (or queued)",
        user: {
          full_name:
            user.role === "student" ? (user as IStudent).full_name : user.email,
          email: user.email,
          profile_picture,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in remove route:", error);
    return NextResponse.json(
      { message: "Failed to send email" },
      { status: 500 },
    );
  }
}
