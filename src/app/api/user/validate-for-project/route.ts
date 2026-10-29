import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import Project from "@/models/Project";
import { Company, User } from "@/models/User";
import { normalizeCompanySubrole } from "@/lib/company-rbac";
import { getProjectCompanyId } from "@/lib/project-ownership";
import {
  isPrivilegedProjectMemberRole,
  normalizeMemberEmail,
} from "@/lib/project-member-constraints";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEmail(value: unknown): string {
  return normalizeMemberEmail(value);
}

function normalizeRawSubrole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = await verifyJwt(token);
    if (!auth || !auth.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      project_id?: string;
    };

    const normalizedEmail = normalizeEmail(body.email);
    const projectId = String(body.project_id ?? "").trim();

    if (!normalizedEmail || !projectId) {
      return NextResponse.json(
        { error: "email and project_id are required" },
        { status: 400 },
      );
    }

    if (!Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid project_id" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
    })
      .select(
        "_id role full_name companyName collegeName contactPersonName username email profile_picture image_url",
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          exists: false,
          normalized_email: normalizedEmail,
          message: "User not found in the system.",
        },
        { status: 200 },
      );
    }

    const userRecord = user as unknown as {
      _id?: Types.ObjectId | string;
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

    const userId = String(userRecord._id ?? "").trim();
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user record for supplied email" },
        { status: 500 },
      );
    }
    const displayName =
      String(userRecord.full_name || "").trim() ||
      String(userRecord.companyName || "").trim() ||
      String(userRecord.collegeName || "").trim() ||
      String(userRecord.contactPersonName || "").trim() ||
      String(userRecord.username || "").trim() ||
      normalizedEmail.split("@")[0] ||
      "User";

    const currentProject = await Project.findById(projectId)
      .select("_id title companyId created_by user team team_members")
      .lean();

    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const inCurrentProject = Boolean(
      (Array.isArray((currentProject as any).team) &&
        (currentProject as any).team.some(
          (member: any) => String(member?.user ?? "") === userId,
        )) ||
        (Array.isArray((currentProject as any).team_members) &&
          (currentProject as any).team_members.some((member: any) => {
            const sameUser = String(member?.user ?? "") === userId;
            const sameEmail = normalizeEmail(member?.email) === normalizedEmail;
            return sameUser || sameEmail;
          })),
    );

    const otherProjects = await Project.find({
      _id: { $ne: new Types.ObjectId(projectId) },
      status: { $ne: "deleted" },
      $or: [
        { "team.user": new Types.ObjectId(userId) },
        { "team_members.user": new Types.ObjectId(userId) },
        {
          "team_members.email": {
            $regex: `^${escapeRegex(normalizedEmail)}$`,
            $options: "i",
          },
        },
      ],
    })
      .select("_id title status")
      .lean();

    let companySubroleRaw = "";
    let companySubrole = "";

    const projectCompanyId = String(getProjectCompanyId(currentProject) || "");

    const companyQuery = Types.ObjectId.isValid(projectCompanyId)
      ? { _id: new Types.ObjectId(projectCompanyId) }
      : {
          members: {
            $elemMatch: {
              email: {
                $regex: `^${escapeRegex(normalizedEmail)}$`,
                $options: "i",
              },
              status: "active",
            },
          },
        };

    const company = await Company.findOne(companyQuery)
      .select("members")
      .lean();

    if (company && Array.isArray((company as any).members)) {
      const member = (company as any).members.find(
        (entry: any) =>
          normalizeEmail(entry?.email) === normalizedEmail &&
          String(entry?.status ?? "").toLowerCase() === "active",
      );

      if (member?.subrole) {
        companySubroleRaw = normalizeRawSubrole(member.subrole);
        companySubrole = normalizeCompanySubrole(member.subrole);
      }
    }

    const assignedToOtherActiveProject = otherProjects.length > 0;
    const isTrainee = companySubrole === "trainee";
    const isPrivilegedMember =
      isPrivilegedProjectMemberRole(companySubroleRaw || companySubrole) ||
      isPrivilegedProjectMemberRole(userRecord.role);

    let message = "Validation successful.";
    if (inCurrentProject) {
      message = "User is already part of this project.";
    } else if (isPrivilegedMember) {
      message =
        "Admin/Owner users already have implicit access and cannot be added manually.";
    } else if (isTrainee && assignedToOtherActiveProject) {
      message = "Trainee can only be assigned to one active project at a time.";
    } else if (assignedToOtherActiveProject) {
      message = "User is already assigned to another active project.";
    }

    return NextResponse.json(
      {
        exists: true,
        normalized_email: normalizedEmail,
        user: {
          user_id: userId,
          email: userRecord.email || normalizedEmail,
          name: displayName,
          profile_picture: userRecord.profile_picture || userRecord.image_url || "",
          role: userRecord.role || "",
          company_subrole: companySubrole,
          company_subrole_raw: companySubroleRaw,
        },
        is_already_in_current_project: inCurrentProject,
        is_privileged_company_member: isPrivilegedMember,
        is_assigned_to_other_active_project: assignedToOtherActiveProject,
        active_project_count: otherProjects.length,
        blocking_project:
          assignedToOtherActiveProject && otherProjects.length > 0
            ? {
                id: String((otherProjects[0] as any)?._id || ""),
                title: String((otherProjects[0] as any)?.title || ""),
                status: String((otherProjects[0] as any)?.status || ""),
              }
            : null,
        message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in validate-for-project route:", error);
    return NextResponse.json(
      { error: "Failed to validate user for project" },
      { status: 500 },
    );
  }
}
