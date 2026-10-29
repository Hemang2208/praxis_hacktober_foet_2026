import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";
import Traction from "@/models/Traction";

function serializeTask(task: {
  title: string;
  description: string;
  subTasks?: Array<{
    title: string;
    description: string;
    estimatedHours: number;
  }>;
}) {
  return {
    title: task.title,
    description: task.description,
    subTasks: Array.isArray(task.subTasks) ? task.subTasks : [],
  };
}

export async function GET() {
  try {
    await dbConnect();

    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const traction = await Traction.findOne({ "user.uid": auth.uid }).exec();
    if (!traction || !traction.plan) {
      return NextResponse.json(
        { error: "Plan not found. Generate a plan first." },
        { status: 404 },
      );
    }

    const tasks = (traction.plan.tasks || []).map((task, index) => ({
      index,
      ...serializeTask(task),
    }));

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error("Planner tasks GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch planner tasks" },
      { status: 500 },
    );
  }
}
