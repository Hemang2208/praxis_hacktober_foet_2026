import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const para = await params;
    const task_id: string = para.id;

    const task = await Task.findById(task_id).lean().exec();
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const sub_tasks = Array.isArray((task as any).sub_tasks)
      ? (task as any).sub_tasks.map((st: any) => ({
          id: String(st?._id ?? ""),
          title: String(st?.title ?? ""),
          completed: Boolean(st?.completed ?? false),
          description: typeof st?.description === "string" ? st.description : "",
          created_at: st?.created_at ? new Date(st.created_at).toISOString() : undefined,
        }))
      : [];

    return NextResponse.json({ success: true, sub_tasks });
  } catch (error) {
    console.error("Error fetching sub_tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch sub_tasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const para = await params;
    const task_id: string = para.id;
    const { title, description } = await req.json();

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await Task.findById(task_id);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    task.sub_tasks.push({ title: title.trim(), completed: false, description: typeof description === "string" ? description : "" });
    await task.save();

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error adding subtask:", error);
    return NextResponse.json(
      { error: "Failed to add subtask" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const para = await params;
    const task_id: string = para.id;
    const { subtask_id, title, completed, description } = await req.json();

    const task = await Task.findById(task_id);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const subtask = task.sub_tasks.id(subtask_id);
    if (!subtask)
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });

  if (title !== undefined) subtask.title = title;
  if (completed !== undefined) subtask.completed = completed;
  if (description !== undefined) subtask.description = description;

    await task.save();
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating subtask:", error);
    return NextResponse.json(
      { error: "Failed to update subtask" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const para = await params;
    const task_id = para.id;
    const { subtask_id } = await req.json();

    const task = await Task.findById(task_id);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    task.sub_tasks.pull(subtask_id);
    await task.save();

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json(
      { error: "Failed to delete subtask" },
      { status: 500 }
    );
  }
}
