import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { College } from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const projectId = searchParams.get("projectId");
    const searchQuery = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const collegeId = college._id;

    // Get all projects the college owns/manages
    const projectConditions: Array<Record<string, unknown>> = [
      { user: collegeId },
      { "team.user": collegeId },
      { "team_members.user": collegeId },
    ];

    const ownedProjects = await Project.find({
      $or: projectConditions,
    })
      .select("_id")
      .lean()
      .exec();

    const ownedProjectIds = ownedProjects.map((p: any) => p._id);

    // Build task filter
    const taskFilter: Record<string, unknown> = {};

    if (ownedProjectIds.length > 0) {
      taskFilter.$or = [
        { project: { $in: ownedProjectIds } },
        { project_id: { $in: ownedProjectIds } },
      ];
    }

    // Apply status filter
    if (status) {
      taskFilter.status = status;
    }

    // Apply priority filter
    if (priority) {
      taskFilter.priority = priority;
    }

    // Apply project filter
    if (projectId) {
      taskFilter.project = projectId;
    }

    // Apply search filter
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      taskFilter.$and = [
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { tags: searchRegex },
          ],
        },
        taskFilter,
      ];
    }

    // Get total count
    const totalCount = await Task.countDocuments(taskFilter);

    // Fetch tasks with pagination
    const tasks = await Task.find(taskFilter)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json(
      {
        tasks,
        total: totalCount,
        limit,
        skip,
        hasMore: skip + tasks.length < totalCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/college/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
