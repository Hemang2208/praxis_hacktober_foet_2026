import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { College } from "@/models/User";
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
    if (!payload?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const college = await College.findById(payload.id).lean();

    if (!college || college.role !== "college") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const collegeId = college._id;

    const projectConditions: Array<Record<string, unknown>> = [
      { user: collegeId },
      { "team.user": collegeId },
      { "team_members.user": collegeId },
    ];

    const ownedProjects = await Project.find({
      $or: projectConditions,
    })
      .lean()
      .exec();

    const projectIds = ownedProjects.map((p: any) => p._id);

    const tasks = projectIds.length
      ? await Task.find({
          $or: [{ project: { $in: projectIds } }, { project_id: { $in: projectIds } }],
        })
          .lean()
          .exec()
      : [];

    const taskSummary = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === "completed").length,
      inProgressTasks: tasks.filter((t: any) => t.status === "in-progress").length,
      todoTasks: tasks.filter((t: any) => t.status === "todo").length,
      blockedTasks: tasks.filter((t: any) => t.status === "blocked").length,
    };

    // Add full_name for frontend compatibility (uses college name)
    const collegeWithFullName = {
      ...college,
      full_name: college.collegeName || "College",
    };

    return NextResponse.json(
      {
        user: collegeWithFullName,
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
    console.error("/api/college/overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch college overview" },
      { status: 500 },
    );
  }
}
