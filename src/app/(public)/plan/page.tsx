"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Target,
  Clock,
  Zap,
  ChevronRight,
} from "lucide-react";
import { exportPlanToPdf } from "@/lib/plannerPdfExport";

type PlannerProject = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  isPlanGenerated: boolean;
};

type PlannerMilestone = {
  title: string;
  timeline: string;
};

type PlannerTask = {
  title: string;
  description: string;
  subTasks?: {
    title: string;
    description: string;
    estimatedHours: number;
  }[];
};

type PlannerPlan = {
  id: string;
  summary: string;
  milestones: PlannerMilestone[];
  tasks: PlannerTask[];
  createdAt: string;
  updatedAt: string;
  usedFallback?: boolean;
};

type ProjectFetchResponse = {
  project: PlannerProject | null;
  plan: PlannerPlan | null;
  error?: string;
};

type GenerateResponse = {
  project: {
    id: string;
    title: string;
    description: string;
    isPlanGenerated: boolean;
  };
  plan: PlannerPlan;
  alreadyGenerated: boolean;
  error?: string;
};

type GenerateSubTasksResponse = {
  taskIndex: number;
  taskTitle: string;
  usedFallback: boolean;
  subTasks: {
    title: string;
    description: string;
    estimatedHours: number;
  }[];
  error?: string;
};

export default function PlanPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [project, setProject] = useState<PlannerProject | null>(null);
  const [plan, setPlan] = useState<PlannerPlan | null>(null);

  const [bootLoading, setBootLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingSubTasks, setGeneratingSubTasks] = useState<
    Record<number, boolean>
  >({});
  const [error, setError] = useState<string | null>(null);

  const shouldShowCreateForm = useMemo(
    () => !bootLoading && !project,
    [bootLoading, project],
  );

  const loadUserProject = useCallback(async () => {
    setBootLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plan/projects", {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/plan-login");
        return;
      }

      const data = (await response.json()) as ProjectFetchResponse;
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch planner project");
      }

      setProject(data.project);
      setPlan(data.plan);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load planner data",
      );
    } finally {
      setBootLoading(false);
    }
  }, [router]);

  const generateSubTasks = useCallback(
    async (taskIndex: number) => {
      setGeneratingSubTasks((previous) => ({
        ...previous,
        [taskIndex]: true,
      }));
      setError(null);

      try {
        const response = await fetch(
          `/api/plan/tasks/${taskIndex}/generate-subtasks`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({}),
          },
        );

        if (response.status === 401) {
          router.push("/plan-login");
          return;
        }

        const data = (await response.json()) as GenerateSubTasksResponse;
        if (!response.ok) {
          throw new Error(data.error || "Failed to generate sub tasks");
        }

        setPlan((previous) => {
          if (!previous) {
            return previous;
          }

          const tasks = [...previous.tasks];
          if (!tasks[taskIndex]) {
            return previous;
          }

          tasks[taskIndex] = {
            ...tasks[taskIndex],
            subTasks: data.subTasks,
          };

          return {
            ...previous,
            tasks,
            updatedAt: new Date().toISOString(),
          };
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate sub tasks",
        );
      } finally {
        setGeneratingSubTasks((previous) => ({
          ...previous,
          [taskIndex]: false,
        }));
      }
    },
    [router],
  );

  useEffect(() => {
    void loadUserProject();
  }, [loadUserProject]);

  const generatePlan = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/plan/generate", {
        method: "POST",
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/plan-login");
        return;
      }

      const data = (await response.json()) as GenerateResponse;
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate plan");
      }

      setProject((previous) =>
        previous
          ? {
              ...previous,
              isPlanGenerated: true,
            }
          : previous,
      );
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  }, [router]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/plan/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ title, description }),
      });

      if (response.status === 401) {
        router.push("/plan-login");
        return;
      }

      const data = (await response.json()) as ProjectFetchResponse & {
        alreadyExists?: boolean;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      if (data.project) {
        setProject(data.project);
      }

      if (data.plan) {
        setPlan(data.plan);
      } else {
        await generatePlan();
      }

      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    if (!bootLoading && project && !plan && project.isPlanGenerated === false) {
      void generatePlan();
    }
  }, [bootLoading, project, plan, generatePlan]);

  async function handleLogout() {
    await fetch("/api/plan/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/plan-login");
  }

  const handleExportPdf = useCallback(async () => {
    if (!project || !plan) return;

    try {
      const filename = `${project.title.replace(/\s+/g, "-").toLowerCase()}-plan.pdf`;
      await exportPlanToPdf(project, plan, filename);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      setError("Failed to export PDF. Please try again.");
    }
  }, [project, plan]);

  return (
    <div className="mt-20 min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      {/* <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              K
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Kiyo Planner
              </h1>
              <p className="text-xs text-muted-foreground">
                Project planning made simple
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {!bootLoading && project && plan && (
              <button
                type="button"
                onClick={() => void handleExportPdf()}
                className="group flex items-center gap-2 rounded-lg border border-border bg-background px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm active:scale-95"
                title="Export plan as PDF"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-border bg-background px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm active:scale-95"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">↪</span>
            </button>
          </div>
        </div>
      </div> */}

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Intro Message */}
        <div className="mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            {!bootLoading && project && plan && (
              <button
                type="button"
                onClick={() => void handleExportPdf()}
                className="group flex items-center gap-2 rounded-lg border border-border bg-background px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm active:scale-95"
                title="Export plan as PDF"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-border bg-background px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm active:scale-95"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">↪</span>
            </button>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 sm:p-5 mt-5">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
              Define your project, generate a comprehensive roadmap with AI, and
              break down tasks into actionable subtasks with estimated
              timelines.
            </p>
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <div className="mb-6 rounded-lg border border-border bg-red-50 dark:bg-red-950 p-4 sm:p-5">
            <p className="flex items-start gap-3 text-sm sm:text-base text-red-800 dark:text-red-200">
              <AlertCircle className="mt-1 flex-shrink-0 w-5 h-5" />
              <span className="font-medium">{error}</span>
            </p>
          </div>
        ) : null}

        {/* Loading State */}
        {bootLoading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-4 border-border border-t-primary animate-spin"></div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  Loading your planner
                </p>
                <p className="text-sm text-muted-foreground">
                  Preparing your project workspace...
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Create Project Form */}
        {shouldShowCreateForm ? (
          <div className="mb-10">
            <div className="rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 sm:px-8 py-5 sm:py-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      Create Your Project
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Start by defining your project's vision and scope
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleCreateProject}
                className="space-y-6 p-6 sm:p-8"
              >
                <div>
                  <label
                    htmlFor="title"
                    className="mb-2.5 block text-sm font-semibold text-foreground"
                  >
                    Project Title
                  </label>
                  <input
                    id="title"
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 hover:border-border"
                    placeholder="e.g., AI-Powered Task Planner, Mobile App, Data Dashboard"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2.5 block text-sm font-semibold text-foreground"
                  >
                    Project Description
                  </label>
                  <textarea
                    id="description"
                    required
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-36 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 hover:border-border resize-none"
                    placeholder="Describe your project: What problem does it solve? Who are the users? What are the key features?"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={creating || generating}
                    className="w-full rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3.5 text-base transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    {creating ? "Creating Project..." : "Generate AI Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Project Details */}
        {project ? (
          <div className="mb-10">
            <div className="rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 sm:px-8 py-5 sm:py-6">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary flex-shrink-0" />
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Project Details
                  </h2>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="space-y-6">
                  <div className="pb-6 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Title
                    </p>
                    <p className="text-2xl font-bold text-foreground line-clamp-2">
                      {project.title}
                    </p>
                  </div>

                  <div className="pb-6 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Description
                    </p>
                    <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </div>

                  {project.createdAt ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                          Created On
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(project.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                          Status
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          {project.isPlanGenerated ? "Generated" : "Pending"}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Generate Plan Loading */}
        {generating && !plan ? (
          <div className="mb-10 rounded-lg border border-border bg-muted/30 shadow-sm p-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative h-16 w-16">
                <div className="relative h-full w-full rounded-full border-4 border-border border-t-primary animate-spin"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-foreground">
                  Generating your plan...
                </p>
                <p className="text-sm text-muted-foreground">
                  Our AI is analyzing your project and creating a comprehensive
                  roadmap
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Generate Plan Button */}
        {project && !plan && !generating ? (
          <div className="mb-10">
            <button
              type="button"
              onClick={() => void generatePlan()}
              className="w-full rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-4 text-base transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Generate AI-Powered Plan
            </button>
          </div>
        ) : null}

        {/* Plan Generated Section */}
        {plan ? (
          <>
            {/* Summary */}
            <div className="mb-10">
              <div className="rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-6 sm:px-8 py-5 sm:py-6">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                        Plan Summary
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your AI-generated project roadmap
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <p className="text-base sm:text-lg text-foreground leading-relaxed">
                    {plan.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="mb-10">
              <div className="rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-6 sm:px-8 py-5 sm:py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                          Project Milestones
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.milestones.length} key phases
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  {plan.milestones.length > 0 ? (
                    <div className="space-y-3">
                      {plan.milestones.map((milestone, index) => (
                        <div
                          key={`${milestone.title}-${index}`}
                          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">
                              {milestone.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {milestone.timeline}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No milestones defined yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="mb-10">
              <div className="rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-6 sm:px-8 py-5 sm:py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                          Tasks & Subtasks
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.tasks.length} tasks to execute
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  {plan.tasks.length > 0 ? (
                    <div className="space-y-4">
                      {plan.tasks.map((task, index) => (
                        <div
                          key={`${task.title}-${index}`}
                          className="group rounded-lg border border-border hover:border-primary/30 bg-muted/30 p-5 sm:p-6 transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                                  {index + 1}
                                </span>
                                <h3 className="text-base font-bold text-foreground">
                                  {task.title}
                                </h3>
                              </div>
                              <p className="ml-10 text-foreground leading-relaxed">
                                {task.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-2 ml-10">
                            <button
                              type="button"
                              onClick={() => void generateSubTasks(index)}
                              disabled={
                                Boolean(generatingSubTasks[index]) ||
                                Boolean(
                                  task.subTasks && task.subTasks.length > 0,
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>
                                {generatingSubTasks[index]
                                  ? "Generating..."
                                  : task.subTasks && task.subTasks.length > 0
                                    ? "Subtasks Ready"
                                    : "Generate Subtasks"}
                              </span>
                            </button>
                            {task.subTasks && task.subTasks.length > 0 ? (
                              <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {task.subTasks.length} subtask
                                {task.subTasks.length !== 1 ? "s" : ""}
                              </span>
                            ) : null}
                          </div>

                          {task.subTasks && task.subTasks.length > 0 ? (
                            <div className="mt-5 ml-10 rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <ChevronRight className="w-3 h-3" />
                                Subtasks ({task.subTasks.length})
                              </p>
                              <div className="space-y-3">
                                {task.subTasks.map((subTask, subTaskIndex) => (
                                  <div
                                    key={`${subTask.title}-${subTaskIndex}`}
                                    className="rounded-lg border border-border bg-background p-4 hover:shadow-sm transition-shadow"
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="text-sm font-bold text-primary mt-0.5">
                                        {subTaskIndex + 1}.
                                      </span>
                                      <div className="flex-1">
                                        <p className="font-semibold text-foreground">
                                          {subTask.title}
                                        </p>
                                        <p className="mt-1.5 text-sm text-foreground">
                                          {subTask.description}
                                        </p>
                                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1 w-fit">
                                          <Clock className="w-3 h-3" />
                                          <span>{subTask.estimatedHours}h</span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground font-medium">
                        No tasks generated yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Last updated:{" "}
                <span className="font-medium">
                  {new Date(plan.updatedAt).toLocaleString()}
                </span>
              </p>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
