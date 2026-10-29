import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { Company, User, IStudent } from "@/models/User";
import { getProjectCompanyId } from "@/lib/project-ownership";
import {
  isPrivilegedProjectMemberRole,
  normalizeMemberEmail,
} from "@/lib/project-member-constraints";
import {
  sendEmail,
  generateProjectInviteHtml,
  generateProjectInviteText,
} from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { project_id, email, name, role } = await req.json();

    if (!project_id || !email) {
      return NextResponse.json(
        { message: "project_id and email are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const normalizedEmail = normalizeMemberEmail(email);

    const project = await Project.findById(project_id)
      .select("title companyId created_by user")
      .lean();
    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    // Case-insensitive lookup to avoid missing users due to casing differences
    const user = await User.findOne({
      email: { $regex: `^${normalizedEmail}$`, $options: "i" },
    }).select(
      "_id role full_name companyName collegeName contactPersonName username email profile_picture image_url notificationPreferences",
    );

    if (!user) {
      // User doesn't exist in system
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const directPrivilegedRole = isPrivilegedProjectMemberRole(user.role);
    let membershipPrivilegedRole = false;

    const projectCompanyId = String(getProjectCompanyId(project) || "").trim();
    if (projectCompanyId) {
      const company = await Company.findById(projectCompanyId)
        .select("members")
        .lean();
      if (company && Array.isArray((company as any).members)) {
        const membership = (company as any).members.find(
          (entry: any) =>
            normalizeMemberEmail(entry?.email) === normalizedEmail &&
            String(entry?.status ?? "").toLowerCase() === "active",
        );
        membershipPrivilegedRole = isPrivilegedProjectMemberRole(
          membership?.subrole,
        );
      }
    }

    if (directPrivilegedRole || membershipPrivilegedRole) {
      return NextResponse.json(
        {
          message:
            "Admin/Owner users already have implicit access and cannot be added manually.",
        },
        { status: 409 },
      );
    }

    // Send notification email to existing user, but don't fail the request if email sending fails
    const projectUrl = `${process.env.NEXTAUTH_URL}/user/projects/${project_id}`;

    const subject = `You were added to project: ${project.title}`;
    const html = generateProjectInviteHtml({
      recipientName:
        (user.role === "student" ? (user as IStudent).full_name : user.email) ||
        name,
      inviterName: undefined, // inviter name not provided in this route; components could pass when available
      projectTitle: project.title,
      projectUrl,
      role,
    });

    const text = generateProjectInviteText({
      recipientName:
        (user.role === "student" ? (user as IStudent).full_name : user.email) ||
        name,
      inviterName: undefined,
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
          "Invite email send failed, continuing and returning user info:",
          emailErr,
        );
      }
    } else {
      console.log(`Skipped sending project invite email to ${user.email} because they disabled Project Emails`);
    }

    const u = user as unknown as {
      _id?: string;
      role?: string;
      full_name?: string;
      companyName?: string;
      collegeName?: string;
      contactPersonName?: string;
      username?: string;
      email?: string;
      profile_picture?: string;
      image_url?: string;
    };

    const displayName =
      u.full_name?.trim() ||
      u.companyName?.trim() ||
      u.collegeName?.trim() ||
      u.contactPersonName?.trim() ||
      u.username?.trim() ||
      u.email?.split("@")[0] ||
      "User";

    return NextResponse.json(
      {
        message: "Email sent (or queued)",
        user: {
          _id: u._id,
          id: u._id,
          role: u.role,
          full_name: u.full_name,
          name: displayName,
          display_name: displayName,
          email: u.email,
          profile_picture: u.profile_picture || u.image_url || "",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in invite route:", error);
    return NextResponse.json(
      { message: "Failed to send email" },
      { status: 500 },
    );
  }
}
