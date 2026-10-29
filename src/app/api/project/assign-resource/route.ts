import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import {User} from "@/models/User";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { project_id, resourceIndex, user_id } = await request.json();

    if (!project_id || resourceIndex === undefined || !user_id) {
      return NextResponse.json(
        { error: "project_id, resourceIndex, and user_id are required" },
        { status: 400 }
      );
    }

    const project = await Project.findById(project_id).populate(
      "resources.user"
    );

    const user = await User.findById(user_id);

    if (!project || !user) {
      return NextResponse.json(
        { error: "Project or User not found" },
        { status: 404 }
      );
    }

    if (!project.resources[resourceIndex]) {
      return NextResponse.json(
        { error: "Invalid resource index" },
        { status: 400 }
      );
    }

    // project.resources[resourceIndex].user = user._id;

    await project.save();

    return NextResponse.json(
      { message: "Resource assigned successfully", project },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error assigning resource:", error);
    return NextResponse.json(
      { error: "Failed to assign resource" },
      { status: 500 }
    );
  }
}
