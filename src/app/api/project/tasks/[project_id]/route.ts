import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";
import { Company } from "@/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { normalizeCompanySubrole } from "@/lib/company-rbac";
import {
  projectBelongsToCompany,
  projectHasTeamMember,
} from "@/lib/project-ownership";
import Project from "@/models/Project";

async function resolveCompanyMembership(companyId: string, email?: unknown) {
  const company = await Company.findById(companyId).lean().exec();
  if (!company) return null;

  const membership = Array.isArray(company.members)
    ? company.members.find(
        (member: { email: string; status: string }) =>
          String(member.email).toLowerCase() ===
            String(email ?? "").toLowerCase() && member.status === "active",
      )
    : null;

  return {
    companyId: company._id.toString(),
    membership: membership
      ? {
          email: membership.email,
          subrole: normalizeCompanySubrole(membership.subrole),
          status: membership.status,
        }
      : null,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ project_id: string }> },
) {
  await dbConnect();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const para = await params;
    const { project_id } = para;

    if (!project_id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 },
      );
    }

    const project = await Project.findById(project_id)
      .select({
        title: 1,
        description: 1,
        companyId: 1,
        company_id: 1,
        created_by: 1,
        user: 1,
        team: 1,
        team_members: 1,
      })
      .lean()
      .exec();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (payload.role === "student") {
      if (!projectHasTeamMember(project, String(payload.id), payload.email)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const tasks = await Task.find({ project: project_id }).select({
      ai_feedback: 0,
      comments: 0,
      "notes.content": 0,
      "notes.author": 0,
    });

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "No tasks found for this project" },
        { status: 404 },
      );
    }

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error("Error fetching tasks for project:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 },
    );
  }
}
