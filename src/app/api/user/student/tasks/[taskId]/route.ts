import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { User } from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const resolvedParams = await params;
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

    const student = await User.findById(payload.id).lean();

    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate task ID
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const userEmail = student.email?.toLowerCase() || "";

    // Get all projects the student is part of
    const projectConditions: Array<Record<string, unknown>> = [
      { user: student._id },
      { "team.user": student._id },
      { "team_members.user": student._id },
    ];

    if (userEmail) {
      projectConditions.push({ "team_members.email": userEmail });
    }

    const joinedProjects = await Project.find({
      $or: projectConditions,
    })
      .select("_id")
      .lean()
      .exec();

    const joinedProjectIds = joinedProjects.map((p: any) => p._id);

    // Fetch task and verify access
    const task = await Task.findOne({
      _id: resolvedParams.taskId,
      $or: [
        { project: { $in: joinedProjectIds } },
        { project_id: { $in: joinedProjectIds } },
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
    console.error("/api/student/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}
