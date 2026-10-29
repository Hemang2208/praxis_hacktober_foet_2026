import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { decrypt } from "@/lib/crypto";
import { createResultReleaseCycle } from "@/utils/resultReleaseCycleManager";
import { getCurrentUser } from "@/lib/auth";
import { normalizeCompanySubrole } from "@/lib/company-rbac";
import { emit_notification_event } from "@/lib/notificationEvents";

interface Resource {
  profile: string;
  skills?: string[];
  experience: string;
  description: string;
  type: string;
}

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
      encryptedBody.resources?.map((res: Resource) => ({
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

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and Description are required" },
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
      resources,
      user: user._id,
      created_by: user._id,
      ...(isCompanyCreator ? { companyId: user._id } : {}),
    });

    await newProject.save();

    // Notify project creator about the new project
    try {
      await emit_notification_event({
        user_id: String(user._id),
        event_type: "PROJECT_CREATED",
        title: "Project Created",
        message: `New project created: ${title}`,
        category: "projects",
        priority: "medium",
        event_key: `PROJECT_CREATED:${newProject._id}`,
        metadata: {
          project_id: newProject._id,
          project_title: title,
        },
      });
    } catch (notifError) {
      console.error("Failed to create project notification:", notifError);
    }

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
