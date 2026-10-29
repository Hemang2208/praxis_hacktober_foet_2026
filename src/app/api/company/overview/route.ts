import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { Company } from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.id || payload.role !== "company") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const company = await Company.findById(payload.id).lean();
    if (!company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = company._id;

    const projectConditions: Array<Record<string, unknown>> = [
      { companyId },
      { company_id: companyId },
      { created_by: companyId },
      { user: companyId },
      { "team.user": companyId },
      { "team_members.user": companyId },
    ];

    const ownedProjects = await Project.find({
      $or: projectConditions,
    })
      .lean()
      .exec();

    const projectIds = ownedProjects.map((p: any) => p._id);

    const tasks = projectIds.length
      ? await Task.find({
          $or: [
            { project: { $in: projectIds } },
            { project_id: { $in: projectIds } },
          ],
        })
          .lean()
          .exec()
      : [];

    const taskSummary = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === "completed").length,
      inProgressTasks: tasks.filter((t: any) => t.status === "in-progress")
        .length,
      todoTasks: tasks.filter((t: any) => t.status === "todo").length,
      blockedTasks: tasks.filter((t: any) => t.status === "blocked").length,
    };

    // Add full_name for frontend compatibility (uses company name)
    const companyWithFullName = {
      ...company,
      full_name: company.companyName || "Company",
    };

    return NextResponse.json(
      {
        user: companyWithFullName,
        companies: [],
        joinedProjects: ownedProjects,
        tasks,
        taskSummary,
        projectSummary: {
          totalProjects: ownedProjects.length,
          completedProjects: ownedProjects.filter(
            (p: any) => p.status === "completed",
          ).length,
          inProgressProjects: ownedProjects.filter(
            (p: any) => p.status === "in-progress",
          ).length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("/api/company/overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch company overview" },
      { status: 500 },
    );
  }
}
