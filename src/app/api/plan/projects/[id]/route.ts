import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";
import Traction from "@/models/Traction";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 },
      );
    }

    const traction = await Traction.findOne({
      _id: id,
      "user.uid": auth.uid,
    }).exec();
    if (!traction) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        project: {
          id: String(traction._id),
          userId: traction.user.uid,
          title: traction.project.title,
          description: traction.project.description,
          createdAt: traction.project.created_at.toISOString(),
          isPlanGenerated: traction.project.isPlanGenerated,
        },
        plan: traction.plan
          ? {
              id: String(traction._id),
              summary: traction.plan.summary,
              milestones: traction.plan.milestones,
              tasks: traction.plan.tasks,
              createdAt: traction.plan.created_at.toISOString(),
              updatedAt: traction.plan.updated_at.toISOString(),
              usedFallback: traction.plan.usedFallback,
            }
          : null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner project by id GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch planner project" },
      { status: 500 },
    );
  }
}
