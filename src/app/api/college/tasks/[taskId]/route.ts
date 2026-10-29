import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { College } from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
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

    // Validate task ID
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

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

    // Fetch task and verify access
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { project: { $in: ownedProjectIds } },
        { project_id: { $in: ownedProjectIds } },
      ],
    })
      .lean()
      .exec();

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error("/api/college/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}
