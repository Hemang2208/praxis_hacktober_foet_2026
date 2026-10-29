import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { College } from "@/models/User";
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

    const college = await College.findById(payload.id).lean();

    if (!college || college.role !== "college") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const searchQuery = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const collegeId = college._id;

    // Build filter conditions
    const projectConditions: Array<Record<string, unknown>> = [
      { user: collegeId },
      { "team.user": collegeId },
      { "team_members.user": collegeId },
    ];

    let query = Project.find({
      $or: projectConditions,
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
    console.error("/api/college/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
