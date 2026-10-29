import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { User } from "@/models/User";
import Project from "@/models/Project";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
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

    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const userEmail = student.email?.toLowerCase() || "";

    // Verify student has access to this project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { user: student._id },
        { "team.user": student._id },
        { "team_members.user": student._id },
        { "team_members.email": userEmail },
      ],
    })
      .lean()
      .exec();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error("/api/student/projects/[projectId] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}
