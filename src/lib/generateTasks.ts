import { Types } from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Task from "@/models/Task";
import Project, { IProject } from "@/models/Project";
import dbConnect from "@/lib/dbConnect";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ProjectType {
  _id: Types.ObjectId | string;
  title: string;
  description: string;
  document: string;
  deadline: Date;
  tags: string[];
  status: string;
  progress: number;
  resources: Array<{
    profile: string;
    skills: string[];
    type: string;
  }>;
  tasks?: Types.ObjectId[];
}

interface TaskType {
  title: string;
  description: string;
  assigned: string;
  priority: "high" | "medium" | "low";
  due_date: string;
  sub_tasks: Array<{
    title: string;
    completed: boolean;
  }>;
}

export async function generateTasksFromProject(
  project: ProjectType | IProject
): Promise<Types.ObjectId[]> {
  await dbConnect();

  // Ensure we have a valid ObjectId
  let project_id: Types.ObjectId;
  try {
    project_id =
      project._id instanceof Types.ObjectId
        ? project._id
        : new Types.ObjectId(project._id.toString());
  } catch {
    throw new Error("Invalid project ID format");
  }

  const projectDoc = await Project.findById(project_id);
  if (!projectDoc) throw new Error("Project not found");

  const { title, description, document, deadline, tags, resources } =
    projectDoc;

  const prompt = `You are an experienced project manager. Based on the following project details, generate a JSON array of atleast 20 to 25 tasks. Each task should contain:
- title
- description
- assigned (from the roles in the resources array)
- priority (high, medium, low)
- due_date (within project deadline)
- sub_tasks (each with title and boolean completed = false)

Project:
Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}
Deadline: ${new Date(deadline).toISOString()}
Resources: ${resources
    .map(
      (r) =>
        `\n- ${r.profile} with skills: ${r.skills.join(", ")}, type: ${r.type}`
    )
    .join("")}

Project Document:
${document}

Important: The response must be a valid JSON array. Format example:
[
  {
    "title": "Task 1",
    "description": "Description 1",
    "assigned": "XYZ Developer",
    "priority": "high",
    "due_date": "2024-03-20T00:00:00.000Z",
    "sub_tasks": [
      {"title": "Subtask 1", "completed": false}
    ]
  }
]`;

  const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  const task_ids: Types.ObjectId[] = [];
  try {
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const tasksJson = JSON.parse(cleanedText) as TaskType[];

    if (!Array.isArray(tasksJson)) {
      throw new Error("Generated content is not an array");
    }

    await Promise.all(
      tasksJson.map(async (taskData: TaskType) => {
        const task = new Task({
          ...taskData,
          project: project_id,
          status: "pending",
        });
        await task.save();
        task_ids.push(task._id as Types.ObjectId);
      })
    );

    // Update project with generated tasks
    await Project.findByIdAndUpdate(
      project_id,
      { $addToSet: { tasks: { $each: task_ids } } },
      { new: true }
    );

    return task_ids;
  } catch (e) {
    console.error("Task generation or JSON parsing failed:", e);
    console.error("Raw response from Gemini:", text);
    throw new Error("Failed to generate tasks");
  }
}
