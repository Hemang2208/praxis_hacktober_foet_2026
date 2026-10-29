import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { PLAN_OPENROUTER_MODELS } from "@/lib/planOpenRouterModels";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";
import Traction from "@/models/Traction";

type GeneratedSubTask = {
  title: string;
  description: string;
  estimatedHours: number;
};

type OpenRouterChoice = {
  message?: {
    content?: string;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
};

const LOG_PREFIX = "[plan-generate-subtasks]";

function parseTaskIndex(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function sanitizeAiJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractBalancedJsonObject(input: string): string | null {
  let openBraces = 0;
  let startIndex = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      if (openBraces === 0) {
        startIndex = i;
      }
      openBraces++;
    } else if (char === "}") {
      openBraces--;
      if (openBraces === 0 && startIndex !== -1) {
        return input.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

function closeOpenJsonStructures(json: string): string {
  let inString = false;
  let escapeNext = false;
  let openBraces = 0;
  let openBrackets = 0;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      openBraces++;
    } else if (char === "}") {
      openBraces--;
    } else if (char === "[") {
      openBrackets++;
    } else if (char === "]") {
      openBrackets--;
    }
  }

  let result = json;
  for (let i = 0; i < openBrackets; i++) {
    result += "]";
  }
  for (let i = 0; i < openBraces; i++) {
    result += "}";
  }

  return result;
}

function parseAiJsonWithRecovery(raw: string): unknown {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // Strategy 2: Trim and retry
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // Strategy 3: Clean smart quotes
  const smartQuotesCleaned = trimmed
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
  try {
    return JSON.parse(smartQuotesCleaned);
  } catch {
    // continue
  }

  // Strategy 4: Remove trailing commas in arrays and objects
  const trailingCommaRemoved = smartQuotesCleaned.replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(trailingCommaRemoved);
  } catch {
    // continue
  }

  // Strategy 5: Extract balanced object
  const balanced = extractBalancedJsonObject(trailingCommaRemoved);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      // continue
    }
  }

  // Strategy 6: Balance + remove trailing commas
  const balancedAndCleaned = balanced
    ? balanced.replace(/,(\s*[}\]])/g, "$1")
    : trailingCommaRemoved;
  try {
    return JSON.parse(balancedAndCleaned);
  } catch {
    // continue
  }

  // Strategy 7: Close open structures
  const closed = closeOpenJsonStructures(balancedAndCleaned);
  try {
    return JSON.parse(closed);
  } catch {
    // continue
  }

  console.error(`${LOG_PREFIX} All JSON recovery strategies failed for input`);
  throw new Error("JSON parsing failed after all recovery strategies");
}

function normalizeSubTasks(value: unknown): GeneratedSubTask[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as {
    sub_tasks?: unknown;
    subTasks?: unknown;
    tasks?: unknown;
  };

  const source =
    (Array.isArray(record.sub_tasks) && record.sub_tasks) ||
    (Array.isArray(record.subTasks) && record.subTasks) ||
    (Array.isArray(record.tasks) && record.tasks) ||
    [];

  return source
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const subTask = item as {
        title?: unknown;
        name?: unknown;
        description?: unknown;
        estimated_hours?: unknown;
        estimatedHours?: unknown;
      };

      const title = String(
        subTask.title || subTask.name || `Sub task ${index + 1}`,
      ).trim();
      const description = String(subTask.description || "").trim();
      const estimatedRaw = Number(
        subTask.estimated_hours || subTask.estimatedHours || 4,
      );
      const estimatedHours =
        Number.isFinite(estimatedRaw) && estimatedRaw > 0
          ? Math.min(120, Math.floor(estimatedRaw))
          : 4;

      if (!title || !description) {
        return null;
      }

      return {
        title,
        description,
        estimatedHours,
      };
    })
    .filter((item): item is GeneratedSubTask => Boolean(item));
}

function buildSubTaskPrompt(input: {
  projectTitle: string;
  projectDescription: string;
  taskTitle: string;
  taskDescription: string;
  requestedCount: number;
}) {
  return `You are a senior engineering manager.
Generate exactly ${input.requestedCount} practical sub-tasks for one parent task.

Project title: ${input.projectTitle}
Project description: ${input.projectDescription}
Parent task title: ${input.taskTitle}
Parent task description: ${input.taskDescription}

Rules:
- Return ONLY valid JSON.
- JSON shape:
{
  "sub_tasks": [
    {
      "title": "string",
      "description": "string",
      "estimated_hours": number
    }
  ]
}
- Keep each title short and actionable.
- Description should be concrete and implementation-friendly.
- estimated_hours should be realistic (2-24).
- No markdown or extra keys.`;
}

function decideSubTaskCount(input: {
  projectDescription: string;
  taskTitle: string;
  taskDescription: string;
}): number {
  const text =
    `${input.projectDescription} ${input.taskTitle} ${input.taskDescription}`.toLowerCase();
  const lengthScore = Math.min(4, Math.floor(text.length / 220));

  const complexityKeywords = [
    "integration",
    "authentication",
    "security",
    "payment",
    "api",
    "database",
    "migration",
    "deployment",
    "analytics",
    "realtime",
    "queue",
    "performance",
    "testing",
    "monitoring",
  ];

  const keywordHits = complexityKeywords.reduce(
    (total, keyword) => total + (text.includes(keyword) ? 1 : 0),
    0,
  );

  const keywordScore = Math.min(4, Math.floor(keywordHits / 2));
  const count = 4 + lengthScore + keywordScore;

  return Math.max(4, Math.min(12, count));
}

function fallbackSubTasks(
  parentTask: {
    title: string;
    description: string;
  },
  count: number,
): GeneratedSubTask[] {
  const phases = [
    {
      title: "Analyze",
      description:
        "Review scope, constraints, and technical requirements from the parent task before implementation starts.",
      estimatedHours: 3,
    },
    {
      title: "Design",
      description:
        "Define implementation approach, interfaces, data flow, and acceptance criteria for this part of work.",
      estimatedHours: 4,
    },
    {
      title: "Implement",
      description:
        "Build the core feature increment for the parent task with clear completion boundaries.",
      estimatedHours: 6,
    },
    {
      title: "Validate",
      description:
        "Verify expected behavior and confirm edge-case handling with realistic input scenarios.",
      estimatedHours: 4,
    },
    {
      title: "Harden",
      description:
        "Address error handling, reliability concerns, and performance checks for production readiness.",
      estimatedHours: 4,
    },
    {
      title: "Test",
      description:
        "Add automated and manual testing coverage for this parent task increment.",
      estimatedHours: 4,
    },
    {
      title: "Document",
      description:
        "Document implementation details and operational notes for maintainability and handoff.",
      estimatedHours: 3,
    },
    {
      title: "Review",
      description:
        "Run code review and final checklist to ensure completion quality for the parent task.",
      estimatedHours: 3,
    },
  ];

  const normalizedCount = Math.max(3, Math.min(12, count));
  const result: GeneratedSubTask[] = [];
  for (let index = 0; index < normalizedCount; index += 1) {
    const phase = phases[index % phases.length];
    result.push({
      title: `${phase.title} ${parentTask.title}`,
      description: `${phase.description} Parent task context: ${parentTask.description}`,
      estimatedHours: phase.estimatedHours,
    });
  }

  return result;
}

async function generateSubTasksWithOpenRouter(input: {
  projectTitle: string;
  projectDescription: string;
  taskTitle: string;
  taskDescription: string;
  requestedCount: number;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const systemPrompt =
    "You generate strict JSON task planning outputs. Return only JSON.";
  const userPrompt = buildSubTaskPrompt(input);

  for (const model of PLAN_OPENROUTER_MODELS) {
    try {
      console.log(`${LOG_PREFIX} Trying model: ${model}`);
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
            "X-Title": "Kiyo Planner",
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            max_tokens: 900,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `${LOG_PREFIX} Model ${model} failed with status ${response.status}`,
          errorText.slice(0, 500),
        );
        continue;
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        continue;
      }

      const sanitized = sanitizeAiJson(content);
      const parsed = parseAiJsonWithRecovery(sanitized) as unknown;
      const subTasks = normalizeSubTasks(parsed);
      if (subTasks.length === 0) {
        continue;
      }

      return {
        usedFallback: false,
        subTasks,
      };
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed for model ${model}:`, error);
    }
  }

  throw new Error(
    "All OpenRouter model attempts failed for sub-task generation",
  );
}

export async function PUT(
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

    const targetTask = traction.plan.tasks?.[taskIndex];
    if (!targetTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (Array.isArray(targetTask.subTasks) && targetTask.subTasks.length > 0) {
      return NextResponse.json(
        {
          error:
            "Sub tasks already created for this main task. One-time creation only.",
        },
        { status: 409 },
      );
    }

    const requestedCount = decideSubTaskCount({
      projectDescription: traction.project.description,
      taskTitle: targetTask.title,
      taskDescription: targetTask.description,
    });

    let generated = {
      usedFallback: false,
      subTasks: [] as GeneratedSubTask[],
    };

    try {
      generated = await generateSubTasksWithOpenRouter({
        projectTitle: traction.project.title,
        projectDescription: traction.project.description,
        taskTitle: targetTask.title,
        taskDescription: targetTask.description,
        requestedCount,
      });
    } catch (error) {
      console.error(`${LOG_PREFIX} OpenRouter failed, using fallback:`, error);
      generated = {
        usedFallback: true,
        subTasks: fallbackSubTasks(targetTask, requestedCount),
      };
    }

    const subTasksToSave =
      Array.isArray(generated.subTasks) && generated.subTasks.length > 0
        ? generated.subTasks
        : fallbackSubTasks(targetTask, requestedCount);

    const now = new Date();
    const historyAction = `sub_tasks_generated_${taskIndex}`;

    console.log(`${LOG_PREFIX} Attempting update for task ${taskIndex}`, {
      documentId: traction._id,
      userId: auth.uid,
      subTasksCount: subTasksToSave.length,
    });

    try {
      // Directly modify the traction document in memory
      if (
        traction.plan &&
        traction.plan.tasks &&
        traction.plan.tasks[taskIndex]
      ) {
        traction.plan.tasks[taskIndex].subTasks = subTasksToSave;
        traction.plan.updated_at = now;
        traction.project.updated_at = now;
        traction.updated_at = now;
        traction.history.push({
          action: historyAction,
          at: now,
        });

        // Explicitly mark nested fields as modified for Mongoose to detect changes
        traction.markModified("plan.tasks");

        // Use save() which respects Mongoose schemas and validation
        const saveResult = await traction.save();
        console.log(`${LOG_PREFIX} Document saved successfully`, {
          taskIndex,
          subTasksCount:
            saveResult.plan?.tasks?.[taskIndex]?.subTasks?.length ?? 0,
        });

        return NextResponse.json(
          {
            taskIndex,
            taskTitle: targetTask.title,
            usedFallback: generated.usedFallback,
            subTasks: subTasksToSave,
          },
          { status: 200 },
        );
      } else {
        console.error(`${LOG_PREFIX} Task structure invalid`, {
          hasplan: !!traction.plan,
          hasTask: !!traction.plan?.tasks?.[taskIndex],
        });
        return NextResponse.json(
          {
            error: "Invalid task structure in database",
          },
          { status: 500 },
        );
      }
    } catch (dbError) {
      console.error(`${LOG_PREFIX} Database error:`, dbError);

      // Try one more time with a fresh fetch + update
      try {
        console.log(`${LOG_PREFIX} Attempting recovery with fresh fetch...`);
        const freshTraction = await Traction.findOne({
          _id: traction._id,
          "user.uid": auth.uid,
        }).exec();

        if (freshTraction?.plan?.tasks?.[taskIndex]) {
          freshTraction.plan.tasks[taskIndex].subTasks = subTasksToSave;
          freshTraction.plan.updated_at = now;
          freshTraction.project.updated_at = now;
          freshTraction.updated_at = now;
          freshTraction.history.push({
            action: historyAction,
            at: now,
          });

          // Explicitly mark nested fields as modified for Mongoose to detect changes
          freshTraction.markModified("plan.tasks");

          await freshTraction.save();
          console.log(`${LOG_PREFIX} Recovery attempt successful`);

          return NextResponse.json(
            {
              taskIndex,
              taskTitle: targetTask.title,
              usedFallback: generated.usedFallback,
              subTasks: subTasksToSave,
            },
            { status: 200 },
          );
        }
      } catch (recoveryError) {
        console.error(`${LOG_PREFIX} Recovery failed:`, recoveryError);
      }

      return NextResponse.json(
        { error: "Database error while saving sub tasks" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Planner generate sub-tasks POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate sub tasks" },
      { status: 500 },
    );
  }
}

// Backward compatibility: if any old client still calls POST, route through PUT.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskIndex: string }> },
) {
  return PUT(request, context);
}
