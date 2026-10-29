import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { Company } from "@/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import {
  COMPANY_ANALYTICS_ROLES,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";
import { projectBelongsToCompany } from "@/lib/project-ownership";
import { Types } from "mongoose";

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
): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await dbConnect();

    const para = await params;
    const { project_id } = para;

    if (!Types.ObjectId.isValid(project_id)) {
      return new Response(JSON.stringify({ error: "Invalid project ID" }), {
        status: 400,
      });
    }

    const project = await Project.findById(project_id)
      .select({
        title: 1,
        progress: 1,
        status: 1,
        deadline: 1,
        team: 1,
        team_members: 1,
        companyId: 1,
        company_id: 1,
        created_by: 1,
        user: 1,
      })
      .lean()
      .exec();
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
      });
    }

    if (payload.role !== "company") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    const companyAccess = await resolveCompanyMembership(
      String(payload.id),
      payload.email,
    );
    if (!companyAccess || !companyAccess.membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    if (!COMPANY_ANALYTICS_ROLES.includes(companyAccess.membership.subrole)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    if (!projectBelongsToCompany(project, companyAccess.companyId)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // Get all tasks for this project
    const tasks = await Task.find({
      $or: [{ project: project_id }, { project_id: project_id }],
    })
      .select({
        status: 1,
        time_tracking: 1,
        assigned_to: 1,
        due_date: 1,
      })
      .lean()
      .exec();

    // Calculate task distribution
    const taskDistribution = [
      { name: "To Do", count: tasks.filter((t) => t.status === "todo").length },
      {
        name: "In Progress",
        count: tasks.filter((t) => t.status === "in-progress").length,
      },
      {
        name: "Completed",
        count: tasks.filter((t) => t.status === "completed").length,
      },
      {
        name: "Blocked",
        count: tasks.filter((t) => t.status === "blocked").length,
      },
    ];

    // Calculate velocity data (mock data for now - you can enhance this based on your sprint system)
    const velocity = [
      { sprint: "Sprint 1", points: 20, completed: 18 },
      { sprint: "Sprint 2", points: 25, completed: 22 },
      { sprint: "Sprint 3", points: 30, completed: 28 },
      { sprint: "Current", points: 35, completed: 15 },
    ];

    // Calculate burndown data (mock data - you can enhance this with actual sprint data)
    const burndown = [
      { date: "Week 1", planned: 100, actual: 95 },
      { date: "Week 2", planned: 80, actual: 75 },
      { date: "Week 3", planned: 60, actual: 50 },
      { date: "Week 4", planned: 40, actual: 30 },
      { date: "Current", planned: 20, actual: 15 },
    ];

    // Calculate commit activity (mock data - you can integrate with GitHub API)
    const commits = [
      { date: "2025-01-01", count: 5 },
      { date: "2025-01-02", count: 3 },
      { date: "2025-01-03", count: 8 },
      { date: "2025-01-04", count: 2 },
      { date: "2025-01-05", count: 6 },
      { date: "2025-01-06", count: 4 },
      { date: "2025-01-07", count: 7 },
    ];

    // Calculate time tracking data
    const time_tracking = {
      totalEstimated: tasks.reduce(
        (sum, task) => sum + (task.time_tracking?.estimated || 0),
        0,
      ),
      totalLogged: tasks.reduce(
        (sum, task) => sum + (task.time_tracking?.logged || 0),
        0,
      ),
      totalRemaining: tasks.reduce(
        (sum, task) => sum + (task.time_tracking?.remaining || 0),
        0,
      ),
    };

    // Team performance data
    const teamPerformance =
      project.team?.map((member) => ({
        name: member.name,
        tasksAssigned: tasks.filter((task) => task.assigned_to === member.name)
          .length,
        tasksCompleted: tasks.filter(
          (task) =>
            task.assigned_to === member.name && task.status === "completed",
        ).length,
        productivity: Math.round(Math.random() * 100), // Mock data - calculate based on actual metrics
      })) || [];

    const analytics = {
      project: {
        title: project.title,
        progress: project.progress,
        status: project.status,
        deadline: project.deadline
          ? new Date(project.deadline).toISOString()
          : new Date().toISOString(),
      },
      taskDistribution,
      velocity,
      burndown,
      commits,
      time_tracking,
      teamPerformance,
      metrics: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        overdueTasks: tasks.filter(
          (t) =>
            t.due_date &&
            new Date(t.due_date) < new Date() &&
            t.status !== "completed",
        ).length,
        averageTaskDuration:
          Math.round(
            tasks.reduce(
              (sum, task) => sum + (task.time_tracking?.logged || 0),
              0,
            ) / tasks.length,
          ) || 0,
        teamSize: project.team?.length || 0,
      },
    };

    return new Response(JSON.stringify({ analytics }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching project analytics:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
