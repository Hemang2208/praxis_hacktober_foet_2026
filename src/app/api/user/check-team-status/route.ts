import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { Company, User } from "@/models/User";
import { Types } from "mongoose";
import { normalizeCompanySubrole } from "@/lib/company-rbac";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check whether a user can be assigned to another project.
 * POST /api/user/check-team-status
 *
 * Body:
 * - user_id: MongoDB user ID
 * - excludeproject_id: (optional) Project ID to exclude from check (current project)
 *
 * Returns:
 * - isTeamMember: boolean - whether user has reached current assignment limit
 * - companySubrole: user's active company subrole (if found)
 * - projectName/project_id: one blocking project when limit is reached
 *
 * Rules:
 * - trainee: max 1 active project
 * - manager: can join multiple projects
 * - others: default max 1 active project
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, excludeproject_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Convert user_id to ObjectId for MongoDB query
    let userObjectId: Types.ObjectId;
    try {
      userObjectId = new Types.ObjectId(user_id);
    } catch {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 },
      );
    }

    // Build query to find if this user is a team member in any project
    const query: Record<string, unknown> = {
      $or: [
        { "team.user": userObjectId },
        { "team_members.user": userObjectId },
      ],
    };

    // Exclude the current project if specified
    if (excludeproject_id) {
      try {
        const excludeProjectObjectId = new Types.ObjectId(excludeproject_id);
        query._id = { $ne: excludeProjectObjectId };
      } catch {
        // Invalid project ID format, continue without excluding
        console.warn("Invalid excludeproject_id format:", excludeproject_id);
      }
    }

    const existingProjects = await Project.find(query)
      .select("title _id")
      .lean();

    const userDoc = await User.findById(userObjectId).select("email").lean();
    const userEmail = String((userDoc as any)?.email || "")
      .trim()
      .toLowerCase();

    let companySubrole: "owner" | "admin" | "manager" | "trainee" | null = null;

    if (userEmail) {
      const companyDoc = await Company.findOne({
        members: {
          $elemMatch: {
            email: { $regex: `^${escapeRegex(userEmail)}$`, $options: "i" },
            status: "active",
          },
        },
      })
        .select("members")
        .lean();

      if (companyDoc && Array.isArray((companyDoc as any).members)) {
        const activeMember = (companyDoc as any).members.find(
          (member: any) =>
            String(member?.email || "")
              .trim()
              .toLowerCase() === userEmail &&
            String(member?.status || "")
              .trim()
              .toLowerCase() === "active",
        );

        if (activeMember?.subrole) {
          companySubrole = normalizeCompanySubrole(activeMember.subrole);
        }
      }
    }

    const currentProjectsCount = existingProjects.length;
    const canJoinMultipleProjects = companySubrole === "manager";
    const maxProjects = canJoinMultipleProjects ? null : 1;
    const hasReachedLimit =
      maxProjects !== null && currentProjectsCount >= maxProjects;

    if (hasReachedLimit) {
      const firstProject = existingProjects[0] as any;
      const limitMessage =
        companySubrole === "trainee"
          ? "Trainee can join only one project at a time."
          : "This user is already part of a different project.";

      return NextResponse.json({
        isTeamMember: true,
        projectName: firstProject?.title || "Unknown Project",
        project_id: firstProject?._id?.toString?.() || null,
        companySubrole,
        currentProjectsCount,
        maxProjects,
        message: limitMessage,
      });
    }

    return NextResponse.json({
      isTeamMember: false,
      companySubrole,
      currentProjectsCount,
      maxProjects,
    });
  } catch (error) {
    console.error("Error checking team status:", error);
    return NextResponse.json(
      { error: "Failed to check team status" },
      { status: 500 },
    );
  }
}
