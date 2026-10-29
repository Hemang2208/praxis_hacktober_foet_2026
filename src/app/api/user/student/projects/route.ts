import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { User } from "@/models/User";
import Project from "@/models/Project";

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

    const student = await User.findById(payload.id).lean();

    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const searchQuery = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const userEmail = student.email?.toLowerCase() || "";

    // Build filter conditions
    const projectConditions: Array<Record<string, unknown>> = [
      { user: student._id },
      { "team.user": student._id },
      { "team_members.user": student._id },
    ];

    if (userEmail) {
      projectConditions.push({ "team_members.email": userEmail });
    }

    let query = Project.find({
      $or: projectConditions,
    }).select({
      title: 1,
      description: 1,
      status: 1,
      progress: 1,
      deadline: 1,
      tags: 1,
      technologies: 1,
      team: 1,
      team_members: 1,
      created_at: 1,
      updated_at: 1,
      user: 1,
      companyId: 1,
      project_id: 1,
    });

    // Apply status filter if provided
    if (status) {
      query = query.where("status").equals(status);
    }

    // Apply search filter if provided
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      query = query.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
      });
    }

    // Get total count
    const totalCount = await Project.countDocuments(
      query.getFilter() || {
        $or: projectConditions,
      }
    );

    // Apply pagination and execute
    const projects = await query
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json(
      {
        projects,
        total: totalCount,
        limit,
        skip,
        hasMore: skip + projects.length < totalCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/student/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
