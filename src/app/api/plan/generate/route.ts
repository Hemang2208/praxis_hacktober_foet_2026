import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { PLAN_OPENROUTER_MODELS } from "@/lib/planOpenRouterModels";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";
import Traction, { type ITraction } from "@/models/Traction";

type Milestone = {
  title: string;
  timeline: string;
};

type Task = {
  title: string;
  description: string;
  subTasks?: {
    title: string;
    description: string;
    estimatedHours: number;
  }[];
};

type GeneratedPlan = {
  summary: string;
  milestones: Milestone[];
  tasks: Task[];
  usedFallback: boolean;
};

type ProjectNiche =
  | "web_development"
  | "mobile_app"
  | "data_science"
  | "devops"
  | "blockchain"
  | "machine_learning"
  | "saas"
  | "e_commerce"
  | "fintech"
  | "healthcare"
  | "iot"
  | "game_development"
  | "general";

type AiTask = {
  id?: string;
  title?: string;
  name?: string;
  task_name?: string;
  description?: string;
  acceptance_criteria?: string[];
  technical_requirements?: string[];
  estimated_duration?: string;
  deliverables?: string[];
  risk_factors?: string[];
};

type AiMilestone = {
  title?: string;
  name?: string;
  timeline?: string;
};

type AiPlanPayload = {
  summary?: string;
  milestones?: Array<AiMilestone | string>;
  tasks?: Array<AiTask | string>;
};

type OpenRouterChoice = {
  message?: {
    content?: string;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
};

const LOG_PREFIX = "[plan-generate]";

function detectNiche(title: string, description: string): ProjectNiche {
  const text = `${title} ${description}`.toLowerCase();

  const nicheKeywords: Array<{ niche: ProjectNiche; keywords: string[] }> = [
    {
      niche: "web_development",
      keywords: ["web", "frontend", "backend", "react", "next", "api"],
    },
    {
      niche: "mobile_app",
      keywords: ["mobile", "ios", "android", "flutter", "react native"],
    },
    {
      niche: "data_science",
      keywords: ["analytics", "dashboard", "insight", "data pipeline"],
    },
    {
      niche: "devops",
      keywords: ["devops", "docker", "kubernetes", "ci/cd", "deployment"],
    },
    {
      niche: "blockchain",
      keywords: ["blockchain", "web3", "smart contract", "solidity", "crypto"],
    },
    {
      niche: "machine_learning",
      keywords: ["machine learning", "ml", "model", "prediction", "ai"],
    },
    {
      niche: "saas",
      keywords: ["saas", "subscription", "multi-tenant", "workspace"],
    },
    {
      niche: "e_commerce",
      keywords: ["ecommerce", "shop", "store", "cart", "checkout"],
    },
    {
      niche: "fintech",
      keywords: ["fintech", "finance", "payment", "bank", "ledger"],
    },
    {
      niche: "healthcare",
      keywords: ["health", "hospital", "patient", "medical", "clinical"],
    },
    {
      niche: "iot",
      keywords: ["iot", "sensor", "hardware", "device", "embedded"],
    },
    {
      niche: "game_development",
      keywords: ["game", "unity", "unreal", "gameplay", "graphics"],
    },
  ];

  let best: ProjectNiche = "general";
  let bestScore = 0;

  for (const item of nicheKeywords) {
    const score = item.keywords.reduce(
      (total, keyword) => total + (text.includes(keyword) ? 1 : 0),
      0,
    );

    if (score > bestScore) {
      bestScore = score;
      best = item.niche;
    }
  }

  return best;
}

function getNicheGuidance(niche: ProjectNiche): string {
  const prompts: Record<ProjectNiche, string> = {
    web_development:
      "Focus on API design, database schema, frontend integration, testing, and deployment.",
    mobile_app:
      "Include app flow, API sync, offline handling, push notifications, and device testing.",
    data_science:
      "Cover data preparation, feature engineering, baseline model, evaluation, and reporting.",
    devops:
      "Include infrastructure setup, CI/CD, observability, rollout strategy, and security checks.",
    blockchain:
      "Cover smart contract design, audits, wallet integration, and deployment verification.",
    machine_learning:
      "Include data pipeline, model training, evaluation, inference integration, and monitoring.",
    saas: "Include tenant architecture, auth/roles, billing, analytics, and reliability.",
    e_commerce:
      "Focus on catalog, checkout flow, payment integration, inventory, and conversion analytics.",
    fintech:
      "Cover transaction integrity, security controls, compliance checks, and auditability.",
    healthcare:
      "Focus on patient data safety, compliance-sensitive workflows, and reliability.",
    iot: "Include device communication, data ingestion, telemetry monitoring, and edge reliability.",
    game_development:
      "Include gameplay loop, asset pipeline, performance tuning, and playtesting.",
    general:
      "Plan foundation, core features, testing, and launch tasks with clear dependencies.",
  };

  return prompts[niche];
}

function buildPlannerPrompt(
  project: ITraction["project"],
  niche: ProjectNiche,
): string {
  const lineCount = project.description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const targetTaskCount = lineCount <= 3 ? "6-8" : "8-10";

  return `You are a senior project manager generating practical, high-quality plans.
Project title: ${project.title}
Project description:\n${project.description}
Detected niche: ${niche}

Guidance for this niche: ${getNicheGuidance(niche)}

The user only entered title and short description (${lineCount} description lines), so infer realistic details but keep assumptions minimal and clearly practical.

Return ONLY valid JSON with this exact shape:
{
  "summary": "string",
  "milestones": [
    { "title": "string", "timeline": "string" }
  ],
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "acceptance_criteria": ["string", "string"],
      "technical_requirements": ["string", "string"],
      "estimated_duration": "string",
      "deliverables": ["string", "string"],
      "risk_factors": ["string"]
    }
  ]
}

Rules:
- Create ${targetTaskCount} tasks.
- Task titles must be specific and actionable.
- Keep milestones to 3-5 items.
- Ensure tasks match the entered project context.
- No markdown, no explanations, no extra keys outside JSON.`;
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

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }

  let inString = false;
  let escaping = false;
  let depth = 0;
  let end = -1;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  if (end === -1) {
    return null;
  }

  return text.slice(start, end + 1);
}

function closeOpenJsonStructures(text: string): string {
  let inString = false;
  let escaping = false;
  const stack: string[] = [];

  for (const char of text) {
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" && stack[stack.length - 1] === "{") {
      stack.pop();
      continue;
    }

    if (char === "]" && stack[stack.length - 1] === "[") {
      stack.pop();
    }
  }

  let repaired = text;
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    repaired += stack[index] === "{" ? "}" : "]";
  }

  return repaired;
}

function parseAiJsonWithRecovery(raw: string): {
  parsed: unknown | null;
  strategy: string;
  error?: unknown;
} {
  const base = sanitizeAiJson(raw);

  const candidates: Array<{ strategy: string; value: string }> = [
    { strategy: "direct", value: base },
    {
      strategy: "trim-and-clean",
      value: base
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u00A0/g, " "),
    },
    {
      strategy: "remove-trailing-commas",
      value: base.replace(/,\s*([}\]])/g, "$1"),
    },
    {
      strategy: "insert-missing-object-commas",
      value: base
        .replace(/}\s*{/g, "},{")
        .replace(/"\s*\n\s*"/g, '",\n"')
        .replace(/]\s*\n\s*"/g, '],\n"'),
    },
  ];

  const balanced = extractBalancedJsonObject(base);
  if (balanced) {
    candidates.push({ strategy: "balanced-object", value: balanced });
    candidates.push({
      strategy: "balanced-remove-trailing-commas",
      value: balanced.replace(/,\s*([}\]])/g, "$1"),
    });
  }

  candidates.push({
    strategy: "close-open-structures",
    value: closeOpenJsonStructures(base).replace(/,\s*([}\]])/g, "$1"),
  });

  let lastError: unknown;
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.value)) {
      continue;
    }
    seen.add(candidate.value);

    try {
      return {
        parsed: JSON.parse(candidate.value) as unknown,
        strategy: candidate.strategy,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    parsed: null,
    strategy: "failed",
    error: lastError,
  };
}

function extractPlanCandidate(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;

  // Common wrapper keys from LLM responses
  if (record.plan && typeof record.plan === "object") {
    return record.plan;
  }
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (data.plan && typeof data.plan === "object") {
      return data.plan;
    }
    if (data.summary || data.tasks || data.milestones) {
      return data;
    }
  }

  return value;
}

function isValidPlan(value: unknown): value is AiPlanPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const plan = value as {
    summary?: unknown;
    milestones?: unknown;
    tasks?: unknown;
    overview?: unknown;
  };

  const validMilestones =
    Array.isArray(plan.milestones) &&
    plan.milestones.length > 0 &&
    plan.milestones.every(
      (item) =>
        (typeof item === "string" && item.trim().length > 0) ||
        (item &&
          typeof item === "object" &&
          (typeof (item as { title?: unknown }).title === "string" ||
            typeof (item as { name?: unknown }).name === "string")),
    );

  const validTasks =
    Array.isArray(plan.tasks) &&
    plan.tasks.length > 0 &&
    plan.tasks.every(
      (item) =>
        (typeof item === "string" && item.trim().length > 0) ||
        (item &&
          typeof item === "object" &&
          (typeof (item as { title?: unknown }).title === "string" ||
            typeof (item as { name?: unknown }).name === "string" ||
            typeof (item as { task_name?: unknown }).task_name === "string") &&
          (typeof (item as { description?: unknown }).description ===
            "string" ||
            typeof (item as { details?: unknown }).details === "string" ||
            typeof (item as { objective?: unknown }).objective === "string")),
    );

  const summary =
    typeof plan.summary === "string"
      ? plan.summary
      : typeof plan.overview === "string"
        ? plan.overview
        : "";
  const validSummary = summary.trim().length > 0;

  return validSummary && validMilestones && validTasks;
}

function normalizeAiPlan(
  value: AiPlanPayload,
): Omit<GeneratedPlan, "usedFallback"> {
  const summary = String(
    value.summary ||
      (value as { overview?: unknown }).overview ||
      "Project summary not provided by model.",
  );

  const milestones: Milestone[] = (value.milestones || []).map(
    (item, index) => ({
      title:
        typeof item === "string"
          ? item
          : String(item.title || item.name || `Milestone ${index + 1}`),
      timeline:
        typeof item === "string"
          ? `Week ${index + 1}`
          : String(item.timeline || "TBD"),
    }),
  );

  const tasks: Task[] = (value.tasks || []).map((item, index) => {
    if (typeof item === "string") {
      return {
        title: item,
        description: `Task generated from model output item ${index + 1}.`,
        subTasks: [],
      };
    }

    const baseTitle =
      item.title || item.name || item.task_name || `Task ${index + 1}`;

    const extras: string[] = [];
    if (
      Array.isArray(item.acceptance_criteria) &&
      item.acceptance_criteria.length > 0
    ) {
      extras.push(
        `Acceptance: ${item.acceptance_criteria.slice(0, 2).join("; ")}`,
      );
    }
    if (
      Array.isArray(item.technical_requirements) &&
      item.technical_requirements.length > 0
    ) {
      extras.push(
        `Tech: ${item.technical_requirements.slice(0, 2).join(", ")}`,
      );
    }
    if (item.estimated_duration) {
      extras.push(`Estimate: ${item.estimated_duration}`);
    }

    const baseDescription =
      item.description ||
      (item as { details?: string }).details ||
      (item as { objective?: string }).objective ||
      "Task details not provided by model.";

    const fullDescription = [baseDescription, ...extras]
      .filter(Boolean)
      .join(" | ");

    return {
      title: String(baseTitle),
      description: fullDescription,
      subTasks: [],
    };
  });

  return {
    summary,
    milestones,
    tasks,
  };
}

async function generatePlanWithOpenRouter(
  project: ITraction["project"],
): Promise<GeneratedPlan> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  console.log(
    `${LOG_PREFIX} OPENROUTER_API_KEY detected:`,
    `apiKeyPresent=${Boolean(apiKey)}`,
  );

  const niche = detectNiche(project.title, project.description);
  const systemPrompt =
    "You are a world-class technical project planner. Return ONLY strict JSON, no markdown, no explanations.";
  const userPrompt = buildPlannerPrompt(project, niche);

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
              process.env.OPENROUTER_HTTP_REFERER || "https://try.kiyoai.in",
            "X-Title": "Kiyo Planner",
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            max_tokens: 1200,
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
      console.log(
        `${LOG_PREFIX} Model ${model} returned choices:`,
        data?.choices?.length || 0,
      );
      const content = data.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        console.warn(`${LOG_PREFIX} Model ${model} returned empty content.`);
        continue;
      }

      console.log(
        `${LOG_PREFIX} Model ${model} content preview:`,
        content.slice(0, 300),
      );

      const parseResult = parseAiJsonWithRecovery(content);
      if (!parseResult.parsed) {
        console.error(
          `${LOG_PREFIX} JSON parse failed for model ${model}:`,
          parseResult.error,
        );
        continue;
      }

      if (parseResult.strategy !== "direct") {
        console.warn(
          `${LOG_PREFIX} Model ${model} required JSON recovery strategy: ${parseResult.strategy}`,
        );
      }

      const parsed = extractPlanCandidate(parseResult.parsed);
      if (!isValidPlan(parsed)) {
        console.warn(
          `${LOG_PREFIX} Model ${model} produced invalid plan shape. Keys:`,
          parsed && typeof parsed === "object"
            ? Object.keys(parsed as Record<string, unknown>)
            : "non-object",
        );
        continue;
      }

      const normalized = normalizeAiPlan(parsed);

      console.log(
        `${LOG_PREFIX} Model ${model} accepted. Milestones=${normalized.milestones.length}, Tasks=${normalized.tasks.length}`,
      );

      return {
        summary: normalized.summary,
        milestones: normalized.milestones,
        tasks: normalized.tasks,
        usedFallback: false,
      };
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} OpenRouter generation failed for model ${model}:`,
        error,
      );
    }
  }

  console.error(`${LOG_PREFIX} All OpenRouter models failed. Falling back.`);
  throw new Error("All OpenRouter model attempts failed");
}

function fallbackGenerate(project: ITraction["project"]): GeneratedPlan {
  const niche = detectNiche(project.title, project.description);
  const nicheGuidance = getNicheGuidance(niche);
  const description = project.description.toLowerCase();

  // Generate niche-specific tasks
  const nicheTaskMap: Record<ProjectNiche, Task[]> = {
    web_development: [
      {
        title: "Design and plan system architecture",
        description:
          "Define API endpoints, database schema, authentication flow, and deployment strategy.",
        subTasks: [],
      },
      {
        title: "Set up development environment and tooling",
        description:
          "Configure project structure, build tools, linting, testing frameworks, and version control.",
        subTasks: [],
      },
      {
        title: "Build core backend functionality",
        description:
          "Implement API routes, database models, business logic, and server middleware.",
        subTasks: [],
      },
      {
        title: "Develop frontend UI and components",
        description:
          "Create page layouts, components, state management, and user interactions.",
        subTasks: [],
      },
      {
        title: "Implement authentication and authorization",
        description:
          "Add user login/signup, session management, and role-based access control.",
        subTasks: [],
      },
      {
        title: "Set up testing and quality assurance",
        description:
          "Write unit tests, integration tests, and perform end-to-end testing.",
        subTasks: [],
      },
      {
        title: "Deploy and configure production environment",
        description:
          "Set up hosting, CI/CD pipeline, monitoring, logging, and rollout strategy.",
        subTasks: [],
      },
    ],
    mobile_app: [
      {
        title: "Define app architecture and design",
        description:
          "Plan screen flows, navigation, state management, and offline handling strategy.",
        subTasks: [],
      },
      {
        title: "Set up project and development environment",
        description:
          "Initialize mobile project, configure build tools, and testing frameworks.",
        subTasks: [],
      },
      {
        title: "Build core features and user flows",
        description:
          "Implement main screens, navigation, local data persistence, and core logic.",
        subTasks: [],
      },
      {
        title: "Integrate backend API and sync",
        description:
          "Connect to backend, handle API calls, data synchronization, and offline queuing.",
        subTasks: [],
      },
      {
        title: "Add push notifications and device features",
        description:
          "Implement push notifications, location services, camera, and native device access.",
        subTasks: [],
      },
      {
        title: "Perform testing across devices",
        description:
          "Test on different screen sizes, OS versions, and device capabilities.",
        subTasks: [],
      },
      {
        title: "Build and release to app stores",
        description:
          "Create release builds, app store listings, submission, and monitoring.",
        subTasks: [],
      },
    ],
    data_science: [
      {
        title: "Define analysis goals and success metrics",
        description:
          "Identify key business questions, required data, and success criteria.",
        subTasks: [],
      },
      {
        title: "Data collection and preparation",
        description:
          "Gather data sources, clean, validate, handle missing values, and structure data.",
        subTasks: [],
      },
      {
        title: "Exploratory data analysis and visualization",
        description:
          "Investigate patterns, correlations, distributions, and create visualizations.",
        subTasks: [],
      },
      {
        title: "Feature engineering and selection",
        description:
          "Create new features, select relevant ones, normalize, and prepare for modeling.",
        subTasks: [],
      },
      {
        title: "Build and train baseline model",
        description:
          "Select algorithms, train baseline models, tune hyperparameters, and validate.",
        subTasks: [],
      },
      {
        title: "Model evaluation and optimization",
        description:
          "Evaluate performance, cross-validate, analyze errors, and optimize models.",
        subTasks: [],
      },
      {
        title: "Production deployment and monitoring",
        description:
          "Containerize model, set up inference pipeline, monitoring, and alerts.",
        subTasks: [],
      },
    ],
    devops: [
      {
        title: "Plan infrastructure and deployment strategy",
        description:
          "Define architecture, scaling approach, disaster recovery, and rollout strategy.",
        subTasks: [],
      },
      {
        title: "Set up cloud infrastructure and networking",
        description:
          "Configure cloud resources, VPCs, load balancers, and security groups.",
        subTasks: [],
      },
      {
        title: "Containerize application with Docker",
        description:
          "Create Dockerfiles, build images, set up registries, and optimization.",
        subTasks: [],
      },
      {
        title: "Implement container orchestration",
        description:
          "Deploy Kubernetes clusters, configure services, and resource management.",
        subTasks: [],
      },
      {
        title: "Build CI/CD pipeline",
        description:
          "Set up automated build, test, and deployment workflows with proper gates.",
        subTasks: [],
      },
      {
        title: "Configure monitoring and logging",
        description:
          "Implement metrics collection, log aggregation, alerting, and dashboards.",
        subTasks: [],
      },
      {
        title: "Security hardening and compliance",
        description:
          "Apply security patches, secret management, access controls, and compliance checks.",
        subTasks: [],
      },
    ],
    blockchain: [
      {
        title: "Define blockchain architecture and smart contracts",
        description:
          "Plan contract design, data structures, security model, and gas optimization.",
        subTasks: [],
      },
      {
        title: "Develop and test smart contracts",
        description:
          "Write Solidity/contract code, local testing, unit tests, and edge cases.",
        subTasks: [],
      },
      {
        title: "Set up testnet deployment and testing",
        description:
          "Deploy to testnet, test interactions, verify functionality, and gas usage.",
        subTasks: [],
      },
      {
        title: "Conduct security audit and code review",
        description:
          "Internal code review, security vulnerability scan, and audit by third party.",
        subTasks: [],
      },
      {
        title: "Build backend and wallet integration",
        description:
          "Create transaction handlers, wallet connections, and API layer.",
        subTasks: [],
      },
      {
        title: "Deploy to mainnet with monitoring",
        description:
          "Production deployment, transaction monitoring, and incident response setup.",
        subTasks: [],
      },
      {
        title: "Create user interface and documentation",
        description:
          "Develop dApp UI, user guides, transaction history, and support docs.",
        subTasks: [],
      },
    ],
    machine_learning: [
      {
        title: "Define ML problem and success metrics",
        description:
          "Clarify objectives, identify data requirements, and define performance metrics.",
        subTasks: [],
      },
      {
        title: "Build data pipeline and preprocessing",
        description:
          "Collect data, clean, validate, augment, and structure for training.",
        subTasks: [],
      },
      {
        title: "Exploratory analysis and feature engineering",
        description:
          "Analyze data patterns, engineer features, and select relevant inputs.",
        subTasks: [],
      },
      {
        title: "Develop and train ML models",
        description:
          "Build baseline and advanced models, tune hyperparameters, and cross-validate.",
        subTasks: [],
      },
      {
        title: "Model evaluation and improvement",
        description:
          "Evaluate on test set, analyze errors, conduct ablation studies, and iterate.",
        subTasks: [],
      },
      {
        title: "Integrate model into production system",
        description:
          "Create inference API, set up serving infrastructure, and caching.",
        subTasks: [],
      },
      {
        title: "Monitor and retrain models",
        description:
          "Track model performance in production, set up retraining pipelines, and alerts.",
        subTasks: [],
      },
    ],
    saas: [
      {
        title: "Design multi-tenant architecture and data model",
        description:
          "Plan workspace/tenant isolation, shared infrastructure, and data partitioning.",
        subTasks: [],
      },
      {
        title: "Build authentication and authorization system",
        description:
          "Implement SSO, role-based access, team management, and permission controls.",
        subTasks: [],
      },
      {
        title: "Develop core product features and workflows",
        description:
          "Implement main features, user workflows, and essential functionality.",
        subTasks: [],
      },
      {
        title: "Set up billing and subscription management",
        description:
          "Implement payment processing, subscription tiers, usage tracking, and invoicing.",
        subTasks: [],
      },
      {
        title: "Build analytics and reporting dashboard",
        description:
          "Collect usage metrics, create dashboards, and generate insightful reports.",
        subTasks: [],
      },
      {
        title: "Implement reliability and disaster recovery",
        description:
          "Set up backups, failover systems, data recovery procedures, and monitoring.",
        subTasks: [],
      },
      {
        title: "Deploy and scale for production users",
        description:
          "Set up production environments, monitoring, logging, and scaling policies.",
        subTasks: [],
      },
    ],
    e_commerce: [
      {
        title: "Design product catalog and inventory system",
        description:
          "Plan database schema, product attributes, categories, and inventory tracking.",
        subTasks: [],
      },
      {
        title: "Build product listing and search functionality",
        description:
          "Create product pages, filtering, search, recommendations, and browsing.",
        subTasks: [],
      },
      {
        title: "Implement shopping cart and checkout flow",
        description:
          "Design cart management, checkout process, address validation, and order summary.",
        subTasks: [],
      },
      {
        title: "Integrate payment processing",
        description:
          "Set up payment gateway, handle transactions, refunds, and webhook processing.",
        subTasks: [],
      },
      {
        title: "Set up order and fulfillment management",
        description:
          "Create order tracking, fulfillment workflows, shipping integration, and notifications.",
        subTasks: [],
      },
      {
        title: "Optimize conversion and performance",
        description:
          "Implement analytics tracking, A/B testing, performance optimization, and UX improvements.",
        subTasks: [],
      },
      {
        title: "Deploy and monitor storefront",
        description:
          "Launch store, set up payment processing, monitoring, and customer support.",
        subTasks: [],
      },
    ],
    fintech: [
      {
        title: "Plan financial architecture and security model",
        description:
          "Define transaction model, security protocols, compliance requirements, and audit trails.",
        subTasks: [],
      },
      {
        title: "Build core financial transaction engine",
        description:
          "Implement transaction processing, ledger, account management, and balance tracking.",
        subTasks: [],
      },
      {
        title: "Integrate banking and payment APIs",
        description:
          "Connect to banks, payment processors, and regulatory reporting systems.",
        subTasks: [],
      },
      {
        title: "Implement security and encryption",
        description:
          "Add end-to-end encryption, secure authentication, fraud detection, and monitoring.",
        subTasks: [],
      },
      {
        title: "Build compliance and audit systems",
        description:
          "Implement transaction logging, compliance checks, audit trails, and reporting.",
        subTasks: [],
      },
      {
        title: "Test transaction integrity and edge cases",
        description:
          "Test transaction flows, error scenarios, data consistency, and reconciliation.",
        subTasks: [],
      },
      {
        title: "Deploy with regulatory approval and monitoring",
        description:
          "Obtain licenses/approvals, deploy production, compliance audits, and alerting.",
        subTasks: [],
      },
    ],
    healthcare: [
      {
        title: "Design HIPAA-compliant system architecture",
        description:
          "Plan data protection, access controls, encryption, and audit logging requirements.",
        subTasks: [],
      },
      {
        title: "Build patient data management system",
        description:
          "Implement patient records, medical history, data validation, and privacy controls.",
        subTasks: [],
      },
      {
        title: "Develop clinical workflows and features",
        description:
          "Create appointment scheduling, prescription management, and clinical workflows.",
        subTasks: [],
      },
      {
        title: "Implement security and data protection",
        description:
          "Add encryption, secure access, authentication, and data breach prevention.",
        subTasks: [],
      },
      {
        title: "Ensure compliance and certification",
        description:
          "Implement HIPAA controls, security audit, compliance testing, and documentation.",
        subTasks: [],
      },
      {
        title: "Conduct user testing with healthcare staff",
        description:
          "Gather feedback from clinicians, nurses, and staff on usability and workflows.",
        subTasks: [],
      },
      {
        title: "Deploy with regulatory oversight",
        description:
          "Obtain necessary approvals, deploy carefully, monitor compliance, and incident response.",
        subTasks: [],
      },
    ],
    iot: [
      {
        title: "Design IoT architecture and device communication",
        description:
          "Plan device types, connectivity protocols, edge computation, and cloud integration.",
        subTasks: [],
      },
      {
        title: "Develop device firmware and embedded software",
        description:
          "Write microcontroller code, optimize for resources, handle disconnections.",
        subTasks: [],
      },
      {
        title: "Build data ingestion and telemetry pipeline",
        description:
          "Create message queues, time-series storage, data aggregation, and processing.",
        subTasks: [],
      },
      {
        title: "Implement device management and updates",
        description:
          "Create device provisioning, remote configuration, firmware updates, and monitoring.",
        subTasks: [],
      },
      {
        title: "Develop dashboards and analytics",
        description:
          "Build real-time dashboards, alerts, data visualization, and reporting.",
        subTasks: [],
      },
      {
        title: "Test reliability and edge cases",
        description:
          "Test network failures, data loss recovery, device disconnections, and resilience.",
        subTasks: [],
      },
      {
        title: "Deploy and scale infrastructure",
        description:
          "Deploy edge nodes, manage device fleets, scale backends, and security hardening.",
        subTasks: [],
      },
    ],
    game_development: [
      {
        title: "Design game concept and mechanics",
        description:
          "Define gameplay loop, mechanics, progression, and win/lose conditions.",
        subTasks: [],
      },
      {
        title: "Set up development environment and tools",
        description:
          "Choose engine, configure project, set up version control, and build pipeline.",
        subTasks: [],
      },
      {
        title: "Develop core gameplay and systems",
        description:
          "Implement game mechanics, physics, input handling, and core features.",
        subTasks: [],
      },
      {
        title: "Create art and audio assets",
        description:
          "Develop graphics, animations, sound effects, music, and visual effects.",
        subTasks: [],
      },
      {
        title: "Build UI and player feedback systems",
        description:
          "Create menus, HUD, user feedback, tutorials, and settings interfaces.",
        subTasks: [],
      },
      {
        title: "Conduct playtesting and balance",
        description:
          "Gather player feedback, balance difficulty, tweak mechanics, and iterate.",
        subTasks: [],
      },
      {
        title: "Optimize performance and release",
        description:
          "Profile and optimize, build binaries, test on target platforms, and publish.",
        subTasks: [],
      },
    ],
    general: [
      {
        title: "Define project scope and requirements",
        description:
          "Clarify objectives, deliverables, constraints, and success criteria with stakeholders.",
        subTasks: [],
      },
      {
        title: "Create detailed project plan and timeline",
        description:
          "Break down work, estimate tasks, set milestones, and identify dependencies.",
        subTasks: [],
      },
      {
        title: "Set up development and testing environment",
        description:
          "Configure tools, version control, CI/CD, and testing infrastructure.",
        subTasks: [],
      },
      {
        title: "Implement core functionality",
        description:
          "Build main features and critical paths based on project requirements.",
        subTasks: [],
      },
      {
        title: "Add testing and quality assurance",
        description:
          "Write tests, perform QA, identify and fix bugs, and ensure reliability.",
        subTasks: [],
      },
      {
        title: "Documentation and knowledge transfer",
        description:
          "Write technical documentation, user guides, and onboard team members.",
        subTasks: [],
      },
      {
        title: "Deploy and monitor in production",
        description:
          "Release to production, set up monitoring, alerts, and incident response.",
        subTasks: [],
      },
    ],
  };

  // Get niche-specific tasks, or use general as fallback
  const nicheTasks = nicheTaskMap[niche] || nicheTaskMap.general;

  // Generate niche-specific milestones
  const niche_specific_milestones: Record<ProjectNiche, Milestone[]> = {
    web_development: [
      { title: "Architecture & Setup", timeline: "Week 1-2" },
      { title: "Backend Development", timeline: "Week 3-5" },
      { title: "Frontend Development", timeline: "Week 5-7" },
      { title: "Testing & Integration", timeline: "Week 8" },
      { title: "Deployment & Launch", timeline: "Week 9" },
    ],
    mobile_app: [
      { title: "Planning & Design", timeline: "Week 1" },
      { title: "Core Features", timeline: "Week 2-4" },
      { title: "API Integration", timeline: "Week 5" },
      { title: "Testing on Devices", timeline: "Week 6" },
      { title: "App Store Release", timeline: "Week 7" },
    ],
    data_science: [
      { title: "Data Collection", timeline: "Week 1-2" },
      { title: "Data Preparation", timeline: "Week 3-4" },
      { title: "Model Development", timeline: "Week 5-6" },
      { title: "Evaluation & Optimization", timeline: "Week 7" },
      { title: "Production Deployment", timeline: "Week 8" },
    ],
    devops: [
      { title: "Infrastructure Planning", timeline: "Week 1-2" },
      { title: "Container Setup", timeline: "Week 3" },
      { title: "Orchestration Setup", timeline: "Week 4-5" },
      { title: "CI/CD & Monitoring", timeline: "Week 6-7" },
      { title: "Security & Go-Live", timeline: "Week 8" },
    ],
    blockchain: [
      { title: "Contract Design", timeline: "Week 1-2" },
      { title: "Development & Testing", timeline: "Week 3-4" },
      { title: "Audit & Security", timeline: "Week 5-6" },
      { title: "Integration", timeline: "Week 7" },
      { title: "Mainnet Deployment", timeline: "Week 8" },
    ],
    machine_learning: [
      { title: "Problem Definition", timeline: "Week 1" },
      { title: "Data Preparation", timeline: "Week 2-3" },
      { title: "Model Development", timeline: "Week 4-6" },
      { title: "Evaluation & Improvement", timeline: "Week 7" },
      { title: "Production Integration", timeline: "Week 8" },
    ],
    saas: [
      { title: "Architecture Design", timeline: "Week 1" },
      { title: "Core Features", timeline: "Week 2-5" },
      { title: "Billing & Analytics", timeline: "Week 6" },
      { title: "Reliability Setup", timeline: "Week 7" },
      { title: "Launch & Scale", timeline: "Week 8" },
    ],
    e_commerce: [
      { title: "Catalog & Inventory", timeline: "Week 1-2" },
      { title: "Shopping Experience", timeline: "Week 3-4" },
      { title: "Payments & Orders", timeline: "Week 5" },
      { title: "Testing & Optimization", timeline: "Week 6" },
      { title: "Launch", timeline: "Week 7" },
    ],
    fintech: [
      { title: "Architecture & Security", timeline: "Week 1-2" },
      { title: "Transaction Engine", timeline: "Week 3-4" },
      { title: "Integration & Compliance", timeline: "Week 5-6" },
      { title: "Testing & Audit", timeline: "Week 7" },
      { title: "Regulatory Approval & Deployment", timeline: "Week 8" },
    ],
    healthcare: [
      { title: "HIPAA Architecture", timeline: "Week 1" },
      { title: "Patient Management", timeline: "Week 2-4" },
      { title: "Clinical Features", timeline: "Week 5" },
      { title: "Compliance & Testing", timeline: "Week 6-7" },
      { title: "Regulatory Approval & Launch", timeline: "Week 8" },
    ],
    iot: [
      { title: "Architecture & Protocols", timeline: "Week 1-2" },
      { title: "Device & Firmware", timeline: "Week 3-4" },
      { title: "Data Pipeline", timeline: "Week 5" },
      { title: "Dashboards & Analytics", timeline: "Week 6" },
      { title: "Deployment & Scaling", timeline: "Week 7-8" },
    ],
    game_development: [
      { title: "Design & Prototype", timeline: "Week 1-2" },
      { title: "Core Gameplay", timeline: "Week 3-5" },
      { title: "Assets & Content", timeline: "Week 6" },
      { title: "Playtesting & Balance", timeline: "Week 7" },
      { title: "Optimization & Release", timeline: "Week 8" },
    ],
    general: [
      { title: "Planning & Setup", timeline: "Week 1" },
      { title: "Core Development", timeline: "Week 2-5" },
      { title: "Testing & QA", timeline: "Week 6" },
      { title: "Documentation", timeline: "Week 7" },
      { title: "Deployment & Monitoring", timeline: "Week 8" },
    ],
  };

  const specificMilestones =
    niche_specific_milestones[niche] || niche_specific_milestones.general;

  // Generate summary based on niche and project description
  const summaryByNiche: Record<ProjectNiche, string> = {
    web_development: `Build a scalable web application for ${project.title}. Focus on clean architecture, responsive design, and reliable backend. Start with core features, ensure data integrity through testing, and deploy with monitoring.`,
    mobile_app: `Develop a mobile app for ${project.title} with offline support and seamless API integration. Plan for multiple devices, implement push notifications, and ensure smooth user experience across platforms.`,
    data_science: `Create a data-driven solution for ${project.title}. Collect and prepare data, build predictive models, evaluate performance, and integrate insights into production systems with monitoring.`,
    devops: `Build infrastructure for ${project.title} with containerization, automated deployment, and observability. Ensure reliability through redundancy, monitoring, security hardening, and compliance.`,
    blockchain: `Deploy a secure blockchain solution for ${project.title}. Design smart contracts, conduct audits, integrate wallets, and launch on mainnet with comprehensive transaction monitoring.`,
    machine_learning: `Create an ML-powered system for ${project.title}. Build data pipelines, train models, evaluate performance, integrate into production, and set up continuous monitoring and retraining.`,
    saas: `Build a multi-tenant SaaS platform for ${project.title}. Implement authentication, subscription billing, core features, analytics, and scale infrastructure for production users.`,
    e_commerce: `Launch an e-commerce store for ${project.title}. Create product catalog, shopping experience, payment processing, order management, and optimize for conversions.`,
    fintech: `Develop a secure fintech solution for ${project.title}. Build transaction systems, integrate with banks, implement compliance, security controls, and launch with regulatory approval.`,
    healthcare: `Create a HIPAA-compliant healthcare solution for ${project.title}. Implement patient management, clinical workflows, security measures, compliance checks, and regulatory approval.`,
    iot: `Build an IoT infrastructure for ${project.title}. Develop device firmware, data pipelines, real-time dashboards, device management, and scale edge computing infrastructure.`,
    game_development: `Develop a game for ${project.title}. Design mechanics, create assets, build gameplay systems, playtest for balance, optimize performance, and publish across platforms.`,
    general: `Build a solution for ${project.title}: deliver core features with solid foundation, ensure quality through testing, and deploy with monitoring for reliability and user satisfaction.`,
  };

  const summary = summaryByNiche[niche] || summaryByNiche.general;

  return {
    summary,
    milestones: specificMilestones,
    tasks: nicheTasks.slice(0, 8),
    usedFallback: true,
  };
}

function serializePlan(doc: ITraction) {
  if (!doc.plan) {
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

export async function POST() {
  try {
    console.log(`${LOG_PREFIX} POST /api/plan/generate called`);
    await dbConnect();

    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const traction = await Traction.findOne({ "user.uid": auth.uid }).exec();
    if (!traction) {
      return NextResponse.json(
        { error: "Project not found for this user" },
        { status: 404 },
      );
    }

    if (traction.project.isPlanGenerated && traction.plan) {
      return NextResponse.json(
        {
          project: {
            id: String(traction._id),
            title: traction.project.title,
            description: traction.project.description,
            isPlanGenerated: traction.project.isPlanGenerated,
          },
          plan: serializePlan(traction),
          alreadyGenerated: true,
        },
        { status: 200 },
      );
    }

    let generated: GeneratedPlan;
    try {
      generated = await generatePlanWithOpenRouter(traction.project);
    } catch (error) {
      console.error(
        `${LOG_PREFIX} OpenRouter generation failed, using fallback:`,
        error,
      );
      generated = fallbackGenerate(traction.project);
    }

    const now = new Date();
    const createdAt = traction.plan?.created_at ?? now;

    traction.project.isPlanGenerated = true;
    traction.project.updated_at = now;
    traction.plan = {
      summary: generated.summary,
      milestones: generated.milestones,
      tasks: generated.tasks,
      usedFallback: generated.usedFallback,
      created_at: createdAt,
      updated_at: now,
    };
    traction.history.push({ action: "plan_generated", at: now });
    traction.updated_at = now;

    await traction.save();

    console.log(
      `${LOG_PREFIX} Plan saved successfully. usedFallback=${generated.usedFallback}`,
    );

    return NextResponse.json(
      {
        project: {
          id: String(traction._id),
          title: traction.project.title,
          description: traction.project.description,
          isPlanGenerated: true,
        },
        plan: serializePlan(traction),
        alreadyGenerated: false,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner generate POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 },
    );
  }
}
