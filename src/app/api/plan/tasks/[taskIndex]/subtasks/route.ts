import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";
import Traction from "@/models/Traction";

function parseTaskIndex(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ taskIndex: string }> },
) {
  try {
    await dbConnect();

    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskIndex: taskIndexParam } = await context.params;
    const taskIndex = parseTaskIndex(taskIndexParam);
    if (taskIndex === null) {
      return NextResponse.json(
        { error: "Invalid task index" },
        { status: 400 },
      );
    }

    const traction = await Traction.findOne({ "user.uid": auth.uid }).exec();
    if (!traction || !traction.plan) {
      return NextResponse.json(
        { error: "Plan not found. Generate a plan first." },
        { status: 404 },
      );
    }

    const task = traction.plan.tasks?.[taskIndex];
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        taskIndex,
        taskTitle: task.title,
        subTasks: Array.isArray(task.subTasks) ? task.subTasks : [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner sub-tasks GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sub tasks" },
      { status: 500 },
    );
  }
}
