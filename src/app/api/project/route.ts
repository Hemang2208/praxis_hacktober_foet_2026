import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { decrypt } from "@/lib/crypto";
import { generateTasksFromProject } from "@/lib/generateTasks";
import { Types } from "mongoose";
import { createResultReleaseCycle } from "@/utils/resultReleaseCycleManager";
import { getCurrentUser } from "@/lib/auth";
import { normalizeCompanySubrole } from "@/lib/company-rbac";

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

interface ResourceData {
  profile: string;
  skills: string[];
  experience: string;
  description: string;
  type: string;
}

interface TeamMemberData {
  name: string;
  avatar: string;
}

interface TimelineEventData {
  title: string;
  description: string;
  type: string;
  date: string;
}
interface SprintData {
  name: string;
  progress: string;
  status: string;
}

// interface TaskData {
//   title: string;
//   description: string;
//   priority: string;
//   due_date: Date | null;
//   assigned_to: string[];
//   completedBy: string[];
// }

export async function POST(request: Request) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const encryptedBody = await request.json();

    const title = decrypt(encryptedBody.title);
    const description = decrypt(encryptedBody.description);
    const deadline = decrypt(encryptedBody.deadline);
    const document = decrypt(encryptedBody.document);
    const tags =
      decrypt(encryptedBody.tags)
        ?.split(",")
        .map((tag) => tag.trim()) || [];

    const resources =
      encryptedBody.resources?.map((res: ResourceData) => ({
        profile: decrypt(res.profile),
        skills: Array.isArray(res.skills)
          ? res.skills.map((s: string) => decrypt(s).trim())
          : decrypt(res.skills)
              ?.split(",")
              .map((s: string) => s.trim()),
        experience: decrypt(res.experience),
        description: decrypt(res.description),
        type: decrypt(res.type),
      })) || [];

    const team =
      encryptedBody.team?.map((member: TeamMemberData) => ({
        name: decrypt(member.name),
        avatar: decrypt(member.avatar),
      })) || [];

    const timeline =
      encryptedBody.timeline?.map((event: TimelineEventData) => ({
        title: decrypt(event.title),
        description: decrypt(event.description),
        type: decrypt(event.type),
        date: new Date(decrypt(event.date) as string),
      })) || [];

    const sprints =
      encryptedBody.sprints?.map((sprint: SprintData) => ({
        name: decrypt(sprint.name),
        progress: Number(decrypt(sprint.progress)),
        status: decrypt(sprint.status),
      })) || [];

    if (!title || !description || !document) {
      return NextResponse.json(
        { error: "Title, description, and document are required" },
        { status: 400 },
      );
    }

    const currentMembers = Array.isArray((user as any).members)
      ? (user as any).members
      : [];
    const currentMember = currentMembers.find(
      (member: { email?: string; status?: string }) =>
        String(member.email || "").toLowerCase() ===
          String(user.email || "").toLowerCase() &&
        String(member.status || "").toLowerCase() === "active",
    );
    const currentSubrole = normalizeCompanySubrole(currentMember?.subrole);
    const isCompanyCreator = user.role === "company";

    if (
      isCompanyCreator &&
      currentSubrole !== "owner" &&
      currentSubrole !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newProject = await new Project({
      title,
      description,
      deadline,
      document,
      tags,
      status: "planning", // Explicitly set default status
      progress: 0, // Explicitly set default progress
      resources,
      tasks: [],
      team,
      // persist initial team members under team_members as well for frontend compatibility
      team_members: team,
      timeline,
      sprints,
      created_by: user._id,
      ...(isCompanyCreator ? { companyId: user._id } : {}),
      user: user._id,
    });
    await newProject.save();

    // Create result release cycle for this project (7 days from now)
    try {
      console.log("[ResultReleaseCycle Debug] newProject._id:", newProject._id);
      console.log(
        "[ResultReleaseCycle Debug] newProject.user:",
        newProject.user,
      );
      await createResultReleaseCycle(
        newProject._id.toString(),
        newProject.user?.toString() || "", // Add user field if available
        title,
      );
    } catch (cycleError) {
      console.error("Failed to create result release cycle:", cycleError);
      // Don't fail the project creation if cycle creation fails
    }

    console.log(newProject);

    const projectForTasks: ProjectType = {
      _id: newProject._id.toString(),
      title: newProject.title,
      description: newProject.description,
      document: newProject.document,
      deadline: newProject.deadline,
      tags: newProject.tags,
      status: newProject.status,
      progress: newProject.progress,
      resources: newProject.resources,
    };

    const task_ids = await generateTasksFromProject(projectForTasks);

    newProject.tasks = task_ids;
    await newProject.save();

    return NextResponse.json(
      { project: newProject, message: "Project Created Successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Project Creation Error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await dbConnect();

    const projects = await Project.find({})
      .select({
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
      })
      .sort({ created_at: -1 })
      .lean()
      .exec();

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error("Fetch Projects Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
