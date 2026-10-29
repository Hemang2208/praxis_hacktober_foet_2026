import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";
import Project from "@/models/Project";
import { Types } from "mongoose";
import { emit_notification_event } from "@/lib/notificationEvents";
import { User } from "@/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    // Validate required fields
    if (!body.title || !body.project_id) {
      console.log("Validation failed: missing title or project_id");
      return NextResponse.json(
        { error: "Title and project_id are required" },
        { status: 400 },
      );
    }

    // Check if project exists
    const project = await Project.findById(body.project_id);
    if (!project) {
      console.log("Project not found:", body.project_id);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create task with project reference
    const taskData = {
      ...body,
      project: body.project_id,
      project_id: body.project_id,
      // Ensure default values for required fields
      tags: body.tags || [],
      sub_tasks: body.sub_tasks || [],
      comments: body.comments || [],
      attachments: body.attachments || [],
      time_tracking: body.time_tracking || {
        estimated: 0,
        logged: 0,
        remaining: 0,
      },
      dependencies: body.dependencies || [],
    };

    // Validate status value explicitly
    const validStatuses = [
      "todo",
      "in-progress",
      "submitted",
      "completed",
      "blocked",
    ];
    if (!validStatuses.includes(taskData.status)) {
      console.log("Invalid status provided:", taskData.status);
      return NextResponse.json(
        {
          error: `Invalid status: ${
            taskData.status
          }. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const newTask = new Task(taskData);

    // Add additional validation logging
    const validationError = newTask.validateSync();
    if (validationError) {
      console.log("Validation error before save:", validationError);
      return NextResponse.json(
        { error: `Validation failed: ${validationError.message}` },
        { status: 400 },
      );
    }

    await newTask.save();

    if (newTask.assigned_to && Types.ObjectId.isValid(newTask.assigned_to)) {
      let assignedByName: string | undefined = undefined;
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get("aipm_token")?.value;
        if (token) {
          const payload = await verifyJwt(token);
          if (payload && payload.id) {
            const assigner = await User.findById(payload.id).select("full_name companyName collegeName").lean().exec();
            if (assigner) {
              assignedByName = (assigner as any).full_name || (assigner as any).companyName || (assigner as any).collegeName || undefined;
            }
          }
        }
      } catch (authErr) {
        console.warn("Failed to resolve task creator identity:", authErr);
      }

      await emit_notification_event({
        user_id: newTask.assigned_to,
        event_type: "TASK_ASSIGNED",
        title: "Task Assigned",
        message: `You have been assigned a new task: ${newTask.title}`,
        category: "tasks",
        priority: "high",
        event_key: `TASK_ASSIGNED:${newTask._id}:${newTask.assigned_to}`,
        metadata: {
          task_id: newTask._id,
          task_title: newTask.title,
          project_id: project._id,
          project_title: project.title,
          assigned_by: assignedByName,
        },
      });
    }

    // Add task to project's tasks array
    await Project.findByIdAndUpdate(
      body.project_id,
      { $push: { tasks: newTask._id } },
      { new: true },
    );

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Task creation failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");

    let tasks;
    if (project_id) {
      tasks = await Task.find({
        $or: [{ project: project_id }, { project_id: project_id }],
      }).select({
        ai_feedback: 0,
        comments: 0,
        "notes.content": 0,
        "notes.author": 0,
      });
    } else {
      // Return all tasks if no project_id is specified
      tasks = await Task.find({})
        .select({
          ai_feedback: 0,
          comments: 0,
          "notes.content": 0,
          "notes.author": 0,
        })
        .sort({ created_at: -1 });
    }

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}
