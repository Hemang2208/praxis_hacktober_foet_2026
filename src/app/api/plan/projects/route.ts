import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";
import Traction, { type ITraction } from "@/models/Traction";

type PlannerProjectResponse = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  isPlanGenerated: boolean;
};

type PlannerPlanResponse = {
  id: string;
  summary: string;
  milestones: NonNullable<ITraction["plan"]>["milestones"];
  tasks: NonNullable<ITraction["plan"]>["tasks"];
  createdAt: string;
  updatedAt: string;
  usedFallback?: boolean;
};

type CreateBody = {
  title?: string;
  description?: string;
};

const PLACEHOLDER_TITLE = "Untitled project";
const PLACEHOLDER_DESCRIPTION =
  "Project details will be updated after creation.";

function isPlaceholderProject(project: ITraction["project"]) {
  return (
    project.title === PLACEHOLDER_TITLE ||
    project.description === PLACEHOLDER_DESCRIPTION
  );
}

function serializeProject(doc: ITraction): PlannerProjectResponse {
  return {
    id: String(doc._id),
    userId: doc.user.uid,
    title: doc.project.title,
    description: doc.project.description,
    createdAt: doc.project.created_at.toISOString(),
    isPlanGenerated: doc.project.isPlanGenerated,
  };
}

function isEmptyPlan(plan: ITraction["plan"] | undefined | null) {
  if (!plan) {
    return true;
  }

  const hasContent =
    (typeof plan.summary === "string" && plan.summary.trim().length > 0) ||
    (Array.isArray(plan.milestones) && plan.milestones.length > 0) ||
    (Array.isArray(plan.tasks) && plan.tasks.length > 0);

  return !hasContent;
}

function serializePlan(doc: ITraction): PlannerPlanResponse | null {
  if (!doc.plan || isEmptyPlan(doc.plan)) {
    return null;
  }

  return {
    id: String(doc._id),
    summary: doc.plan.summary,
    milestones: doc.plan.milestones,
    tasks: doc.plan.tasks,
    createdAt: doc.plan.created_at.toISOString(),
    updatedAt: doc.plan.updated_at.toISOString(),
    usedFallback: doc.plan.usedFallback,
  };
}

export async function GET() {
  try {
    await dbConnect();

    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await Traction.findOne({ "user.uid": auth.uid }).exec();
    if (
      !project ||
      !project.project.title ||
      !project.project.description ||
      isPlaceholderProject(project.project)
    ) {
      return NextResponse.json({ project: null, plan: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        project: serializeProject(project),
        plan: serializePlan(project),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner projects GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch planner project" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateBody;
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();

    const existing = await Traction.findOne({ "user.uid": auth.uid }).exec();
    if (
      existing &&
      !isPlaceholderProject(existing.project) &&
      existing.project.title &&
      existing.project.description
    ) {
      return NextResponse.json(
        {
          project: serializeProject(existing),
          plan: serializePlan(existing),
          alreadyExists: true,
        },
        { status: 200 },
      );
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: "Project title and project description are required" },
        { status: 400 },
      );
    }

    const now = new Date();
    if (existing) {
      existing.project.title = title;
      existing.project.description = description;
      existing.project.isPlanGenerated = false;
      existing.project.updated_at = now;
      existing.history.push({ action: "project_created", at: now });
      existing.updated_at = now;
      await existing.save();

      return NextResponse.json(
        { project: serializeProject(existing), plan: serializePlan(existing) },
        { status: 200 },
      );
    }

    const created = await Traction.create({
      user: {
        uid: auth.uid,
        email: auth.email,
      },
      project: {
        title,
        description,
        isPlanGenerated: false,
        created_at: now,
        updated_at: now,
      },
      history: [{ action: "project_created", at: now }],
      created_at: now,
      updated_at: now,
    });

    if (!created) {
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { project: serializeProject(created), plan: null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Planner projects POST error:", error);
    return NextResponse.json(
      { error: "Failed to create planner project" },
      { status: 500 },
    );
  }
}
