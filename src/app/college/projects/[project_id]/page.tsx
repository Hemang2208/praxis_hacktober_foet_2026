"use client";

import React from "react";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
// import { useSelector } from "react-redux";
// import { RootState } from "@/redux/store";
import {
  Calendar,
  Users,
  GitBranch,
  BarChart3,
  ExternalLink,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  FolderKanban,
  Activity,
  Edit,
  Trash2,
  // Plus,
  Save,
  X,
  Clock,
  FileText,
  Brain,
  Loader2,
  Target,
  Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";

import { useProjects } from "@/hooks/useProjects";
import { useUser } from "@/hooks/useUser";
import { generateCertificate } from "@/utils/certificateGenerator";
import { useTasks } from "@/hooks/useTasks";
import { useAssessments } from "@/hooks/useAssessments";
import { useCachedProject } from "@/hooks/useCachedResources";
import {
  updateProject,
  Project,
  BackendTeamMember,
  createTaskInBoard,
  fetchProjectBoard,
  setSelectedProject,
  fetchProjectById,
} from "@/redux/slice/project.slice";
import { Task } from "@/redux/slice/task.slice";
import { fetchTasksByProject } from "@/redux/slice/task.slice";
import GeneratedTasksPreview, {
  PreviewTask,
  CreateTaskPayload as GeneratedCreateTaskPayload,
} from "@/components/tasks/GeneratedTasksPreview";
import { TASK_MGMT_AGENT_URL, PLANNER_AGENT_URL } from "@/utils/API_URL";

// Types for mapping generated tasks from external API
type GeneratedSubtask = {
  title?: string;
  name?: string;
  task_name?: string;
  description?: string;
  body?: string;
  completed?: boolean;
};

type GeneratedTask = {
  title?: string;
  task_name?: string;
  name?: string;
  description?: string;
  body?: string;
  due_date?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  sub_tasks?: GeneratedSubtask[];
  time_tracking?: { estimated?: number; logged?: number; remaining?: number };
  dependencies?: unknown[];
};

// Type for commits synced from external service
type SyncedCommit = {
  _id?: string;
  commit_sha?: string;
  message?: string;
  author?: string;
  repo?: string;
  username?: string;
  timestamp?: string;
  synced_at?: string;
};

// Use the CreateTaskPayload type exported by GeneratedTasksPreview for generated task creation
type CreateTaskPayload = GeneratedCreateTaskPayload;

// Try to extract a JS object encoded inside a string like "Task 1: {'task_name': 'Project Setup', ...}"
const tryParseEmbeddedObject = (s?: string): Record<string, unknown> | null => {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const jsonLike = m[0];
  // Heuristic: convert single quotes to double quotes so JSON.parse can handle it
  try {
    const normalized = jsonLike.replace(/'/g, '"');
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    // Fallback: extract common fields from python-dict-like strings even when
    // apostrophes inside values make JSON.parse fail.
    const extractString = (key: string) => {
      const re = new RegExp(
        String.raw`(?:'|\")${key}(?:'|\")\s*:\s*(?:'|\")(.*?)(?:'|\")`,
      );
      const match = jsonLike.match(re);
      return match?.[1]?.trim();
    };
    const task_name =
      extractString("task_name") ||
      extractString("title") ||
      extractString("name");
    const description = extractString("description") || extractString("body");
    if (task_name || description) {
      return { task_name, title: task_name, description } as Record<
        string,
        unknown
      >;
    }
    return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "in-progress":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "planning":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "on-hold":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case "milestone":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "review":
      return <BarChart3 className="h-4 w-4 text-sky-600" />;
    case "assessment":
      return <AlertCircle className="h-4 w-4 text-violet-600" />;
    default:
      return <Activity className="h-4 w-4 text-slate-600" />;
  }
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const project_id = params.project_id as string;

  const { currentProject, loading, error, dispatch } = useProjects();
  const { getTasksForProject } = useTasks();
  const { mongoUser } = useUser();
  const canManageProjectActions =
    String((mongoUser as any)?.role ?? "").toLowerCase() === "college";
  const {
    actions: assessmentActions,
    helpers: assessmentHelpers,
    loading: assessmentLoading,
    currentCreatedAssessment,
  } = useAssessments();

  const [, setCheckingAssessment] = useState<boolean>(false);

  // Local state for UI and editing
  const [project, setProject] = useState<Project | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editedProject, setEditedProject] = useState<Project | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState(""); // New state for due date
  // Add team member dialog state
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Contributor");
  const [addingMember, setAddingMember] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generatedPreviewTasks, setGeneratedPreviewTasks] = useState<
    PreviewTask[]
  >([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // Keep track of the toast shown while generating so we can update it when saved
  const [generationToastId, setGenerationToastId] = useState<
    string | number | null
  >(null);
  const [generatedTasksSaved, setGeneratedTasksSaved] =
    useState<boolean>(false);
  const [assessmentExists, setAssessmentExists] = useState<boolean>(false);

  useEffect(() => {
    try {
      const key = `kiyo:generatedTasksSaved:${project_id}`;
      setGeneratedTasksSaved(window.localStorage.getItem(key) === "1");
    } catch {
      setGeneratedTasksSaved(false);
    }
  }, [project_id]);

  // Project plan state
  const [projectPlanExists, setProjectPlanExists] = useState<boolean>(false);
  const [checkingProjectPlan, setCheckingProjectPlan] =
    useState<boolean>(false);

  // Synced commits state
  const [loadingSyncedCommits, setLoadingSyncedCommits] =
    useState<boolean>(false);
  const [syncedCommitsError, setSyncedCommitsError] = useState<string | null>(
    null,
  );
  const [syncedCommits, setSyncedCommits] = useState<SyncedCommit[] | null>(
    null,
  );

  const fetchSyncedCommits = useCallback(
    async (signal?: AbortSignal) => {
      if (!project_id) return;
      setLoadingSyncedCommits(true);
      setSyncedCommitsError(null);
      const backendUrl = TASK_MGMT_AGENT_URL;
      const backendURL = `${backendUrl}/projects/${encodeURIComponent(project_id)}/commits?limit=50`;
      try {
        const res = await fetch(backendURL, {
          signal,
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Failed to load commits: ${res.status} ${text}`);
        }
        const data = await res.json().catch(() => null);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.commits)
            ? data.commits
            : [];
        const toMs = (c: any): number => {
          const parse = (value: any): number => {
            if (value == null) return 0;
            if (typeof value === "number" && Number.isFinite(value))
              return value;
            if (typeof value === "string") {
              const ms = Date.parse(value);
              return Number.isFinite(ms) ? ms : 0;
            }
            return 0;
          };

          const commitMs = parse(c?.timestamp);
          const syncedMs = parse(c?.synced_at ?? c?.synced_at);
          return Math.max(commitMs, syncedMs);
        };

        const sorted = [...(list as any[])].sort((a, b) => toMs(b) - toMs(a));
        setSyncedCommits(sorted as SyncedCommit[]);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        setSyncedCommitsError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingSyncedCommits(false);
      }
    },
    [project_id],
  );

  // Get project tasks
  const projectTasks = getTasksForProject(project_id);
  const totalProjectTasks = Array.isArray(projectTasks)
    ? projectTasks.length
    : 0;
  const completedProjectTasks = Array.isArray(projectTasks)
    ? projectTasks.filter(
        (task: Task) =>
          typeof task === "object" &&
          "status" in task &&
          task.status === "completed",
      ).length
    : 0;

  // Calculate project progress
  const projectProgress = React.useMemo(() => {
    // Prefer Redux tasks (full objects). planner-agent `project.tasks` is often task IDs.
    if (Array.isArray(projectTasks) && projectTasks.length > 0) {
      return Math.round((completedProjectTasks / projectTasks.length) * 100);
    }

    if (project && typeof project.progress === "number") {
      return Math.round(project.progress);
    }

    return 0;
  }, [projectTasks, completedProjectTasks, project]);

  const progressCardDescription =
    totalProjectTasks > 0
      ? `${completedProjectTasks}/${totalProjectTasks} tasks completed${
          projectProgress >= 97 ? " 🏆 Certificate Ready!" : ""
        }`
      : "0 tasks completed";

  const timelineItems = (() => {
    const plannerTimeline = Array.isArray((project as any)?.timeline)
      ? (((project as any).timeline as Array<any>) ?? [])
      : [];

    const tasks = Array.isArray(projectTasks) ? (projectTasks as Task[]) : [];

    const normalizeDate = (value: unknown): string => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
      }
      if (typeof value === "string") return value;
      if (typeof value === "number" && Number.isFinite(value)) {
        return new Date(value).toISOString();
      }
      return "";
    };

    const toMs = (date: string): number => {
      const ms = Date.parse(date);
      return Number.isFinite(ms) ? ms : 0;
    };

    const derived = tasks
      .filter((t) => typeof t === "object" && t && typeof t.title === "string")
      .map((t) => {
        const tAny = t as any;
        const status = t.status;
        const hasLinkedPr = Boolean(
          (t as any)?.linked_pr_id ??
          (t as any)?.linked_pr_id ??
          (t as any)?.linked_pull_request,
        );
        const type =
          status === "completed"
            ? "milestone"
            : hasLinkedPr
              ? "review"
              : status === "blocked"
                ? "assessment"
                : "activity";

        const completed_at =
          (t as any)?.completed_at ?? tAny?.completed_at ?? tAny?.completed_at;
        const updated_at =
          (t as any)?.updated_at ?? tAny?.updated_at ?? tAny?.updated_at;
        const created_at =
          (t as any)?.created_at ?? tAny?.created_at ?? tAny?.created_at;
        const due_date =
          (t as any)?.due_date ?? tAny?.due_date ?? tAny?.due_date;

        const date = normalizeDate(
          status === "completed"
            ? (completed_at ?? updated_at ?? created_at ?? due_date)
            : (updated_at ?? created_at ?? due_date),
        );

        const titlePrefix =
          status === "completed"
            ? "Completed"
            : status === "in-progress"
              ? "In Progress"
              : status === "blocked"
                ? "Blocked"
                : "To Do";

        const description =
          t.description && String(t.description).trim().length > 0
            ? String(t.description).trim()
            : "";

        return {
          title: `${titlePrefix}: ${t.title}${hasLinkedPr ? " (PR linked)" : ""}`,
          description,
          type,
          date,
        };
      })
      .sort((a, b) => toMs(b.date) - toMs(a.date))
      .slice(0, 7);

    if (derived.length > 0) return derived;

    if (plannerTimeline.length > 0) {
      return plannerTimeline
        .map((e) => {
          const title = String(e?.title ?? "Activity");
          const description = String(e?.description ?? "");
          const type = String(e?.type ?? "activity");
          const date = String(e?.date ?? e?.created_at ?? e?.created_at ?? "");
          return { title, description, type, date };
        })
        .filter((e) => !!e.title);
    }

    return [];
  })();

  // Note: project progress is recalculated and persisted by the task-mgmt-agent.
  // Avoid patching planner-agent progress from this page to prevent overwriting correct values.

  // Check if project is eligible for certificate (97% or more completion)
  // const isCertificateEligible = projectProgress >= 97;

  // Handle certificate download
  const handleDownloadCertificate = () => {
    if (!mongoUser || !project) {
      toast.error(
        "Unable to generate certificate. User or project data not available.",
      );
      return;
    }

    try {
      generateCertificate(
        {
          full_name: mongoUser.full_name,
          email: mongoUser.email,
        },
        {
          title: project.title,
          description: project.description,
          completionDate: new Date(),
          progress: projectProgress,
          technologies: project.tags || [],
        },
      );
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate. Please try again.");
    }
  };

  // Initialize project data
  useEffect(() => {
    async function fetchProject() {
      if (project_id) {
        try {
          // Fetch both project and tasks data
          await Promise.all([
            dispatch(fetchProjectById(project_id)),
            dispatch(fetchTasksByProject(project_id)),
          ]);

          // Also fetch via API for consistency and to get enriched project data with tasks
          const res = await axios.get(
            `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}`,
          );
          const projectData = res.data?.project || res.data;

          console.log("Fetched project data:", {
            project_id,
            totalTasks: projectData.tasks?.length || 0,
            completedTasks: projectData.completedTasks || 0,
            storedProgress: projectData.progress,
          });

          setProject(projectData);
        } catch (error) {
          console.error("Failed to fetch project:", error);
        }
      }
    }

    fetchProject();
  }, [project_id, dispatch]);

  // Note: Auto-refresh mechanisms removed to prevent unnecessary page reloads
  // Data will be refreshed only when:
  // 1. Component initially mounts
  // 2. User performs actions that modify data
  // 3. Manual refresh if needed

  // Set edited project when current project changes
  useEffect(() => {
    if (currentProject) {
      setEditedProject(currentProject);
      setProject(currentProject);
    }
  }, [currentProject]);

  // Assessment existence is determined from redux state (createdAssessments/currentCreatedAssessment)
  // Fetch assessments for this project on mount to determine existence
  useEffect(() => {
    if (project_id) {
      setCheckingAssessment(true);
      assessmentActions
        .fetchAssessmentsByProject(project_id)
        .unwrap()
        .then((assessments: unknown[]) => {
          setAssessmentExists(
            Array.isArray(assessments) && assessments.length > 0,
          );
          setCheckingAssessment(false);
        })
        .catch((err) => {
          console.warn("Failed to fetch assessments for project:", err);
          setAssessmentExists(false);
          setCheckingAssessment(false);
        });
    }
  }, [project_id, assessmentActions]);

  // Check for existing project plan when project loads
  useEffect(() => {
    if (project_id) {
      setCheckingProjectPlan(true);
      // Use planner-agent endpoint exclusively to determine whether a plan exists.
      (async () => {
        try {
          const token = await fastAPIAuthService.getAccessToken();
          const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

          const agentRes = await fetch(
            `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}/plan`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeader },
              body: JSON.stringify({}),
            },
          );
          if (!agentRes.ok) {
            setProjectPlanExists(false);
            setCheckingProjectPlan(false);
            return;
          }

          // Try to inspect the response body to determine if a real plan exists.
          let body: unknown = null;
          try {
            body = await agentRes.json();
          } catch (e) {
            // If body is not JSON, treat OK response as plan exists (best-effort)
            console.warn(
              "planner-agent returned non-JSON response for plan check",
              e,
            );
            setProjectPlanExists(true);
            setCheckingProjectPlan(false);
            return;
          }

          // If the backend returned a queue response instead of actual plan
          // data, treat as "plan possibly exists" so the user can navigate to
          // the plan page for the real state.
          if (isQueueResponse(body)) {
            console.warn(
              "Plan check received queue response — treating as plan exists",
            );
            setProjectPlanExists(true);
            setCheckingProjectPlan(false);
            return;
          }

          // Narrow the unknown body into an indexable record for safe checks
          const b =
            body && typeof body === "object"
              ? (body as Record<string, unknown>)
              : null;

          // Heuristics: consider plan exists if any of these are true
          const hasPlan = Boolean(
            (b && b["plan"]) ||
            (b &&
              b["success"] === true &&
              (b["plan"] || b["summary"] || b["_id"])) ||
            // some agent responses may return the plan object directly with expected fields
            (b &&
              (b["summary"] ||
                b["high_level_tasks"] ||
                b["major_milestones"] ||
                b["_id"])),
          );

          setProjectPlanExists(hasPlan);
        } catch (error) {
          console.log("Project plan check failed:", error);
          setProjectPlanExists(false);
        } finally {
          setCheckingProjectPlan(false);
        }
      })();
    }
  }, [project_id]);

  // Fetch synced commits for this project from external API
  useEffect(() => {
    const controller = new AbortController();
    void fetchSyncedCommits(controller.signal);
    return () => controller.abort();
  }, [fetchSyncedCommits]);

  // Refresh commits after a sync action elsewhere in the app
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ project_id?: string }>;
      if (!ce?.detail?.project_id) return;
      if (String(ce.detail.project_id) !== String(project_id)) return;
      const controller = new AbortController();
      void fetchSyncedCommits(controller.signal);
    };
    window.addEventListener(
      "kiyo:project-commits-synced",
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "kiyo:project-commits-synced",
        handler as EventListener,
      );
  }, [fetchSyncedCommits, project_id]);

  // Update assessment exists state when currentCreatedAssessment changes
  useEffect(() => {
    if (
      currentCreatedAssessment &&
      currentCreatedAssessment.project_id === project_id
    ) {
      setAssessmentExists(true);
    }
  }, [currentCreatedAssessment, project_id]);

  // Note: Focus-based refresh removed to prevent unnecessary reloads on tab switching
  // Project plan status will be checked during initial load and when explicitly needed

  const handleSaveProject = async () => {
    if (!editedProject || !project) return;

    const loadingToast = toast.loading("Updating project...");

    try {
      await dispatch(
        updateProject({
          id: project._id,
          updates: editedProject,
        }),
      ).unwrap();

      setEditMode(false);
      setIsEditProjectOpen(false);
      setProject(editedProject);
      toast.success("Project updated successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Failed to update project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update project",
        { id: loadingToast },
      );
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (
      window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      const loadingToast = toast.loading("Deleting project...");

      try {
        // Soft-delete via planner-agent: set project status to 'deleted'
        const res = await fetch(
          `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project._id)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: project._id }),
          },
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Failed to soft-delete project: ${res.status} ${text}`,
          );
        }

        // Update local state to reflect soft-delete and navigate away
        setProject((prev) =>
          prev ? ({ ...prev, status: "deleted" } as unknown as Project) : prev,
        );
        toast.success("Project deleted successfully!", { id: loadingToast });
        router.push("/college/projects");
      } catch (error) {
        console.error("Failed to delete project:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to delete project",
          { id: loadingToast },
        );
      }
    }
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim() || !project) {
      toast.error("Please enter a task title");
      return;
    }
    if (!newTaskDueDate) {
      toast.error("Please select a due date");
      return;
    }

    const taskToCreate = {
      project_id: project._id,
      title: newTaskTitle,
      description: newTaskDescription,
      priority: "medium" as const,
      status: "todo",
      due_date: newTaskDueDate,
      tags: [],
    };

    // Close dialog, reset state, and navigate to board immediately
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskDueDate("");
    setIsTaskDialogOpen(false);
    router.push(`/college/projects/${project._id}/board`);

    // Fire-and-forget dispatch in the background
    dispatch(createTaskInBoard(taskToCreate))
      .unwrap()
      .then(() => {
        toast.success("Task created successfully!");
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to create task");
      });
  };

  const handleGenerateTasks = async () => {
    if (!project) return;
    if (generatedTasksSaved) return;

    setGeneratingTasks(true);
    const loadingToast = toast.loading("Generating tasks...");
    setGenerationToastId(loadingToast);

    try {
      // Call the external generate-tasks API.
      // If upstream is unavailable (e.g. 502), derive preview tasks from planner plan.
      let generatedRaw: unknown = [];
      try {
        const token = await fastAPIAuthService.getAccessToken();
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await queueAwareFetch(
          `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/generate-tasks`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeader,
            },
          },
          { maxPollAttempts: 45, pollIntervalMs: 2000 },
        );
        if (!res.ok) {
          const err: any = new Error("Failed");
          err.status = res.status;
          throw err;
        }
        const resData = await res.json();
        if (isQueueResponse(resData)) {
          toast.success("Task generation is in progress. Please wait a moment and refresh the page.", { id: loadingToast });
          setGenerationToastId(null);
          return;
        }
        generatedRaw =
          resData?.tasks || resData?.generatedTasks || resData || [];
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : (err as any)?.status;
        if (status === 502 || status === 500 || status === 404) {
          const token = await fastAPIAuthService.getAccessToken();
          const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

          const planRes = await fetch(
            `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}/plan`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeader },
              body: JSON.stringify({}),
            },
          );

          if (!planRes.ok) {
            throw err;
          }

          const pd = await planRes.json().catch(() => null);
          const planObj = pd?.plan || pd || null;
          generatedRaw = Array.isArray(planObj?.high_level_tasks)
            ? planObj.high_level_tasks
            : [];
        } else {
          throw err;
        }
      }

      // Support several possible response shapes
      const generated = generatedRaw;

      if (!Array.isArray(generated) || generated.length === 0) {
        toast.error("No tasks were generated.", { id: loadingToast });
        setGenerationToastId(null);
        return;
      }

      // Instead of creating immediately, map results into preview tasks
      const previewTasks: PreviewTask[] = [];
      for (const t of generated as GeneratedTask[]) {
        const normalizedStatus = (() => {
          const s = (t.status || "").toString().toLowerCase();
          const valid = ["todo", "in-progress", "completed", "blocked"];
          if (valid.includes(s)) return s;
          if (s === "pending" || s === "not-started") return "todo";
          return "todo";
        })();

        const parsedFromString = (() => {
          if (typeof t === "string") return tryParseEmbeddedObject(t);
          const tRec = (t || {}) as Record<string, unknown>;
          if (typeof tRec.title === "string" && tRec.title.includes("{"))
            return tryParseEmbeddedObject(tRec.title as string);
          if (
            typeof tRec.description === "string" &&
            tRec.description.includes("{")
          )
            return tryParseEmbeddedObject(tRec.description as string);
          return null;
        })();

        const externalSubtasks: GeneratedSubtask[] | undefined = (() => {
          if (!parsedFromString) return undefined;
          const p = parsedFromString as any;
          const raw =
            (Array.isArray(p.sub_tasks) && p.sub_tasks) ||
            (Array.isArray(p.sub_tasks) && p.sub_tasks) ||
            (Array.isArray(p.sub_tasks) && p.sub_tasks) ||
            undefined;
          return raw as GeneratedSubtask[] | undefined;
        })();

        const mappedSubtasks = (() => {
          const tAny = t as any;
          const rawA =
            (Array.isArray(tAny.sub_tasks) && tAny.sub_tasks) ||
            (Array.isArray(tAny.sub_tasks) && tAny.sub_tasks) ||
            (Array.isArray(tAny.sub_tasks) && tAny.sub_tasks) ||
            [];
          const a = rawA as GeneratedSubtask[];
          const b = Array.isArray(externalSubtasks) ? externalSubtasks : [];

          // Merge and deduplicate sub_tasks by normalized title+description (case-insensitive)
          const merged = [...a, ...b];
          const seen = new Set<string>();
          const unique: GeneratedSubtask[] = [];

          for (const st of merged) {
            const title = String(
              st.title || st.name || st.task_name || st.body || "",
            )
              .trim()
              .toLowerCase();
            const desc = String(st.description || st.body || "")
              .trim()
              .toLowerCase();
            const key = JSON.stringify({ title, desc });
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(st);
          }

          return unique.map((st: GeneratedSubtask) => ({
            title: st.title || st.name || st.task_name || "Subtask",
            description: st.description || st.body || "",
            completed: !!st.completed,
          }));
        })();

        const parsedTitle =
          parsedFromString &&
          (parsedFromString.task_name ||
            parsedFromString.title ||
            parsedFromString.name);
        const parsedDescription =
          parsedFromString && parsedFromString.description;

        previewTasks.push({
          title:
            (parsedTitle as string) ||
            t.title ||
            t.task_name ||
            t.name ||
            (typeof t === "string" ? t : undefined) ||
            "Untitled Task",
          description:
            (parsedDescription as string) || t.description || t.body || "",
          due_date: (() => {
            const raw =
              (t as any)?.due_date ??
              (t as any)?.due_date ??
              (parsedFromString as any)?.due_date ??
              (parsedFromString as any)?.due_date;
            if (!raw) return undefined;
            const d = new Date(String(raw));
            return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
          })(),
          status: normalizedStatus,
          priority: t.priority || "medium",
          tags: Array.isArray(t.tags) ? t.tags : [],
          sub_tasks: mappedSubtasks,
        });
      }

      setGeneratedPreviewTasks(previewTasks);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Failed to generate tasks:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate tasks",
        { id: loadingToast },
      );
      // clear stored toast id on error
      setGenerationToastId(null);
    } finally {
      setGeneratingTasks(false);
    }
  };

  // Save generated tasks after user preview/edits
  const handleSaveGeneratedTasks = async (payloads: CreateTaskPayload[]) => {
    if (!project) return;

    if (payloads.some((p) => !p.due_date)) {
      toast.error("Please set a due date for all tasks before saving");
      return;
    }

    // Reuse the generation toast if present so it transitions from "Generating..." to a success state
    const loadingToast =
      generationToastId ?? toast.loading("Saving generated tasks...");
    // If we created a new toast here, remember it so we can dismiss/replace it consistently
    if (!generationToastId) setGenerationToastId(loadingToast);
    const createdCount = { success: 0, failed: 0 };
    try {
      for (const payload of payloads) {
        try {
          await dispatch(
            createTaskInBoard({
              project_id: project._id,
              title: payload.title,
              description: payload.description || "",
              priority: (payload.priority as any) || "medium",
              status: (payload.status as any) || "todo",
              due_date: payload.due_date,
              tags: Array.isArray(payload.tags) ? payload.tags : [],
              sub_tasks: Array.isArray((payload as any).sub_tasks)
                ? ((payload as any).sub_tasks as Array<{
                    title: string;
                    description?: string;
                    completed?: boolean;
                  }>)
                : [],
            }),
          ).unwrap();
          createdCount.success += 1;
        } catch (e: unknown) {
          createdCount.failed += 1;
          const errMsg =
            typeof e === "string"
              ? e
              : e instanceof Error
                ? e.message
                : JSON.stringify(e);
          toast.error(`Failed to create task "${payload.title}": ${errMsg}`, {
            duration: 6000,
          });
        }
      }

      // Show a simple confirmation to match UX: Generated tasks
      // Ensure the toast id is passed as a string to satisfy types
      toast.success("Generated tasks", { id: String(loadingToast) });

      if (createdCount.success > 0) {
        try {
          const key = `kiyo:generatedTasksSaved:${project_id}`;
          window.localStorage.setItem(key, "1");
        } catch {
          // ignore
        }
        setGeneratedTasksSaved(true);
      }

      // Clear stored generation toast id now that we've turned it into a result
      setGenerationToastId(null);

      try {
        await dispatch(fetchProjectBoard(project._id)).unwrap();
        dispatch(fetchProjectById(project._id));
        // After successfully saving and refreshing, navigate to the board
        try {
          router.push(`/college/projects/${project._id}/board`);
        } catch (navErr) {
          console.warn("Navigation to board failed", navErr);
        }
      } catch (e) {
        console.warn("Failed to refresh after saving generated tasks", e);
      }
    } finally {
      // Ensure the loading toast is dismissed if it still exists (safe no-op if already replaced)
      try {
        // toast.dismiss expects a string id — coerce to string for type-safety
        toast.dismiss(String(loadingToast));
      } catch {}
      setGenerationToastId(null);
    }
  };

  // Only show the "Task creation cancelled" message when the preview was
  // previously open and then closed without saving. Use a ref to detect the
  // previous `isPreviewOpen` value so we don't trigger cancellation right
  // after starting generation (when `generationToastId` is set but preview
  // hasn't opened yet).
  const prevPreviewOpenRef = useRef<boolean>(isPreviewOpen);

  useEffect(() => {
    const prev = prevPreviewOpenRef.current;
    // closed transition: was open, now not open
    if (prev === true && isPreviewOpen === false && generationToastId != null) {
      try {
        toast.dismiss(String(generationToastId));
      } catch {}
      toast.error("Task creation cancelled");
      setGenerationToastId(null);
    }
    prevPreviewOpenRef.current = isPreviewOpen;
  }, [isPreviewOpen, generationToastId]);

  // Add team member handler
  const handleAddTeamMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error("Please enter an email for the new member");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!project) return;

    // Prevent duplicate emails
    const exists =
      Array.isArray(project.team_members) &&
      (
        project.team_members as {
          name?: string;
          avatar?: string;
          role?: string;
          email?: string;
        }[]
      ).some(
        (m) => String(m.email).toLowerCase() === newMemberEmail.toLowerCase(),
      );
    if (exists) {
      toast.error("A member with this email already exists on the project");
      return;
    }

    // Ensure email exists in system before adding (must be confirmed)
    if (emailExists !== true) {
      toast.error("Please enter a valid existing user email before adding.");
      return;
    }

    const loadingToast = toast.loading("Adding team member...");
    setAddingMember(true);

    try {
      // First try to call invite API to get existing user info and send email
      let serverUser: {
        full_name?: string;
        email?: string;
        profile_picture?: string;
      } | null = null;
      try {
        const inviteRes = await fetch(`/api/project/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project._id,
            email: newMemberEmail,
            role: newMemberRole,
          }),
        });

        if (inviteRes.ok) {
          const json = await inviteRes.json().catch(() => ({}));
          serverUser = json.user || null;
          toast.success("Invitation email sent to the user", {
            id: loadingToast,
          });
        } else if (inviteRes.status === 404) {
          toast("User not found in system; will add by email", {
            icon: "⚠️",
            id: loadingToast,
          });
        } else {
          const json = await inviteRes.json().catch(() => ({}));
          toast.error(json?.message || "Failed to send invitation email", {
            id: loadingToast,
          });
        }
      } catch (emailErr) {
        console.warn(
          "Invite API call failed, will continue to add member by email",
          emailErr,
        );
      }

      // Create new member object using server info when available
      const member = {
        name:
          (serverUser && serverUser.full_name) || newMemberEmail.split("@")[0],
        email: newMemberEmail,
        role: newMemberRole || "Contributor",
        avatar: (serverUser && serverUser.profile_picture) || "",
      };

      const updatedResources = Array.isArray(project.team_members)
        ? [...project.team_members, member]
        : [member];

      // Persist the `team` array to the database (server expects `team` field)
      try {
        await axios.put(`/api/project/${project._id}`, {
          team: updatedResources,
        });
      } catch (err) {
        console.error("Failed to persist team to DB:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to save member to database",
          { id: loadingToast },
        );
        setAddingMember(false);
        return;
      }

      // Update Redux (for UI/state consistency) and local state
      try {
        await dispatch(
          updateProject({
            id: project._id,
            updates: {
              team_members: updatedResources as Project["team_members"],
            },
          }),
        ).unwrap();

        setProject((prev) =>
          prev
            ? {
                ...(prev as Project),
                team_members: updatedResources as Project["team_members"],
              }
            : prev,
        );
      } catch (err) {
        console.warn("Failed to update redux after persisting team:", err);
        // We persisted to DB but failed to update redux; still proceed but notify.
        toast("Added member, but UI may not reflect change immediately", {
          icon: "⚠️",
        });
      }

      // Reset dialog fields and close
      setNewMemberEmail("");
      setNewMemberRole("Contributor");
      setIsMemberDialogOpen(false);

      if (!serverUser) {
        toast.success("Team member added (user not in system)", {
          id: loadingToast,
        });
      }
    } catch (error) {
      console.error("Failed to add team member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add member",
        { id: loadingToast },
      );
    } finally {
      setAddingMember(false);
    }
  };

  // Remove team member handler
  const handleRemoveTeamMember = async (email: string) => {
    if (!project) return;

    if (
      !window.confirm(
        "Are you sure you want to remove this member from the project?",
      )
    ) {
      return;
    }

    const loadingToast = toast.loading("Removing member...");

    try {
      // Find the member to remove by email in team_members
      const memberToRemove = Array.isArray(project.team_members)
        ? project.team_members.find(
            (m) =>
              String(m.email || "").toLowerCase() ===
              String(email).toLowerCase(),
          )
        : null;

      if (!memberToRemove) {
        toast.error("Member not found", { id: loadingToast });
        return;
      }

      // Filter out the member from team_members for frontend display
      const updatedResources = Array.isArray(project.team_members)
        ? (
            project.team_members as {
              name?: string;
              avatar?: string;
              role?: string;
              email?: string;
              user?: string;
            }[]
          ).filter(
            (m) =>
              String(m.email).toLowerCase() !== String(email).toLowerCase(),
          )
        : [];

      // Use project.team as source of truth for backend format
      // Filter out the member by user ID or email
      const updatedBackendTeam: BackendTeamMember[] = Array.isArray(
        project.team,
      )
        ? project.team.filter(
            (member) =>
              // Keep the member if neither user nor role match the one being removed
              !(
                member.user === memberToRemove.user ||
                (memberToRemove.email &&
                  member.user &&
                  String(member.user).toLowerCase() ===
                    String(memberToRemove.email).toLowerCase())
              ),
          )
        : [];

      // Persist removal to backend database FIRST
      try {
        const patchResponse = await axios.patch(
          `${PLANNER_AGENT_URL}/projects/${project._id}`,
          {
            team: updatedBackendTeam,
            team_members: updatedResources,
          },
        );
        console.log("Team update response:", patchResponse.data);
      } catch (err) {
        console.error("Failed to persist removal to DB:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to save removal to database",
          { id: loadingToast },
        );
        return;
      }

      // Update Redux and local state after successful persistence
      await dispatch(
        updateProject({
          id: project._id,
          updates: {
            team_members: updatedResources as Project["team_members"],
            team: updatedBackendTeam,
          },
        }),
      ).unwrap();

      setProject((prev) =>
        prev
          ? {
              ...(prev as Project),
              team_members: updatedResources as Project["team_members"],
              team: updatedBackendTeam,
            }
          : prev,
      );
      toast.success("Member removed", { id: loadingToast });

      // Try to notify user
      try {
        const res = await fetch(`/api/project/remove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: project._id, email }),
        });

        if (res.ok) {
          toast.success("Removal email sent to user");
        } else if (res.status === 404) {
          toast("User not found in system; removed from project record", {
            icon: "⚠️",
          });
        } else {
          const j = await res.json().catch(() => ({}));
          toast.error(j?.message || "Failed to send removal email");
        }
      } catch (e) {
        console.error("Notify remove error:", e);
        // Don't fail the whole operation if email sending fails
        toast.error("Failed to send removal email");
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member",
        { id: loadingToast },
      );
    }
  };

  // Debounced email existence check
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = async (email: string) => {
      if (!email) {
        setEmailExists(null);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailExists(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/user/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (res.ok) {
          setEmailExists(true);
        } else if (res.status === 404) {
          setEmailExists(false);
        } else {
          setEmailExists(null);
        }
      } catch (e) {
        console.error("Email check failed:", e);
        setEmailExists(null);
      } finally {
        setCheckingEmail(false);
      }
    };

    timer = setTimeout(() => check(newMemberEmail.trim()), 550);

    return () => {
      if (timer) clearTimeout(timer!);
    };
  }, [newMemberEmail]);

  if (loading.fetchProjects || !project) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-slate-500">Loading project...</p>
      </div>
    );
  }

  if (error.fetchProjects || !project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Project not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The project you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild className="mt-4">
            <Link href="/college/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {project?.title}
            </h1>
            <Badge
              variant="outline"
              className={getStatusColor(project?.status)}
            >
              {project?.status?.replace("-", " ")}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <>
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/college/projects/${project_id}/board`}>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Open Board
                </Link>
              </Button>
              {canManageProjectActions && (
                <>
                  <Button
                    asChild
                    variant={
                      assessmentExists ||
                      assessmentHelpers.isAssessmentExistsForProject(project_id)
                        ? "outline"
                        : "default"
                    }
                  >
                    <Link href={`/college/projects/${project_id}/assessment`}>
                      {assessmentExists ||
                      assessmentHelpers.isAssessmentExistsForProject(
                        project_id,
                      ) ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <FolderKanban className="mr-2 h-4 w-4" />
                      )}
                      {assessmentLoading.checkAssessment
                        ? "Checking..."
                        : assessmentExists ||
                            assessmentHelpers.isAssessmentExistsForProject(
                              project_id,
                            )
                          ? "View Assessment"
                          : "Create Assessment"}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant={projectPlanExists ? "outline" : "default"}
                    className="w-full sm:w-auto"
                  >
                    <Link href={`/college/projects/${project_id}/plan`}>
                      {projectPlanExists ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <Target className="mr-2 h-4 w-4" />
                      )}
                      {checkingProjectPlan
                        ? "Checking..."
                        : projectPlanExists
                          ? "View Project Plan"
                          : "Generate Project Plan"}
                    </Link>
                  </Button>
                  <Dialog
                    open={isTaskDialogOpen}
                    onOpenChange={setIsTaskDialogOpen}
                  >
                    <Button
                      variant="outline"
                      onClick={handleGenerateTasks}
                      disabled={generatingTasks || generatedTasksSaved}
                      className="mr-2"
                    >
                      {generatingTasks ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : generatedTasksSaved ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Generated Tasks
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-4 w-4" />
                          Generate Tasks
                        </>
                      )}
                    </Button>

                    {/* <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                      </Button>
                    </DialogTrigger> */}
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                          Add a new task to this project.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="task-title">Title</Label>
                          <Input
                            id="task-title"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="task-description">Description</Label>
                          <Textarea
                            id="task-description"
                            value={newTaskDescription}
                            onChange={(e) =>
                              setNewTaskDescription(e.target.value)
                            }
                            placeholder="Enter task description..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="task-due-date">Due Date</Label>
                          <DatePicker
                            value={newTaskDueDate}
                            onChange={(val) => setNewTaskDueDate(val)}
                            placeholder="Select due date..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsTaskDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTask}>Create Task</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <GeneratedTasksPreview
                    open={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    tasks={generatedPreviewTasks}
                    onSave={handleSaveGeneratedTasks}
                    project_id={project._id}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditedProject(project);
                        setIsEditProjectOpen(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Repository
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast("Coming soon")}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={handleDeleteProject}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
          </>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {[
          {
            title: "Progress",
            value: `${projectProgress}%`,
            description: progressCardDescription,
            icon: BarChart3,
            color: projectProgress >= 97 ? "text-emerald-600" : "text-sky-600",
            bgColor: projectProgress >= 97 ? "bg-emerald-100" : "bg-sky-100",
          },
          {
            title: "Team Members",
            value: project?.resources?.length?.toString() || "0",
            description: "Active contributors",
            icon: Users,
            color: "text-emerald-600",
            bgColor: "bg-emerald-100",
          },
          {
            title: "Days Remaining",
            value: Math.max(
              0,
              Math.ceil(
                (new Date(project?.deadline).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            ).toString(),
            description: `Due ${new Date(
              project?.deadline,
            ).toLocaleDateString()}`,
            icon: Calendar,
            color: projectTasks?.some(
              (task: Task) =>
                typeof task === "object" &&
                "due_date" in task &&
                "status" in task &&
                task.status !== "completed" &&
                task.due_date &&
                new Date(task.due_date) < new Date(),
            )
              ? "text-red-600"
              : "text-slate-600",
            bgColor: projectTasks?.some(
              (task: Task) =>
                typeof task === "object" &&
                "due_date" in task &&
                "status" in task &&
                task.status !== "completed" &&
                task.due_date &&
                new Date(task.due_date) < new Date(),
            )
              ? "bg-red-100"
              : "bg-slate-100",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Project Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Description
                  </h4>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{project?.description}</ReactMarkdown>
                  </div>
                </div>

                {/* Technologies */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Technologies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {project?.tags?.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-slate-100 text-slate-700"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sprint Progress */}
                {false && (
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                      Sprint Progress
                    </h4>
                    <div className="space-y-3">
                      {project?.sprints?.map(
                        (
                          sprint: {
                            name: string;
                            progress: number;
                            status: string;
                          },
                          index: number,
                        ) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {sprint.name}
                                </span>
                                <span className="text-sm text-slate-500">
                                  {sprint.progress}%
                                </span>
                              </div>
                              <Progress
                                value={sprint.progress}
                                className="h-2"
                              />
                            </div>
                            <Badge
                              variant="outline"
                              className={`ml-3 ${
                                sprint.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : sprint.status === "in-progress"
                                    ? "bg-sky-100 text-sky-700 border-sky-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {sprint.status}
                            </Badge>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                    Quick Actions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/college/projects/${project_id}/plan`}>
                        <Target className="mr-2 h-3 w-3" />
                        Project Plan
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/college/projects/${project_id}/board`}>
                        <FolderKanban className="mr-2 h-3 w-3" />
                        Open Board
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/college/github?project=${project_id}`}>
                        <GitBranch className="mr-2 h-3 w-3" />
                        View Repository
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="opacity-60 cursor-not-allowed"
                      onClick={() => toast("Coming soon")}
                    >
                      <BarChart3 className="mr-2 h-3 w-3" />
                      Analytics
                    </Button>
                    {projectProgress >= 97 && (
                      <Button
                        onClick={handleDownloadCertificate}
                        variant="default"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Award className="mr-2 h-3 w-3" />
                        Download Certificate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timelineItems.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No activity yet.
                      </div>
                    ) : (
                      timelineItems.map(
                        (
                          event: {
                            title: string;
                            description: string;
                            type: string;
                            date: string;
                          },
                          index: number,
                        ) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3"
                          >
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(event.type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {event.title}
                              </p>
                              {event.description ? (
                                <p className="text-xs text-slate-500 mt-1">
                                  {event.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Synced commits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Synced Commits</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSyncedCommits ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      Loading synced commits...
                    </div>
                  ) : syncedCommitsError ? (
                    <div className="text-sm text-rose-600">
                      {syncedCommitsError}
                    </div>
                  ) : syncedCommits && syncedCommits.length > 0 ? (
                    <div className="space-y-3">
                      {syncedCommits.slice(0, 7).map((c) => (
                        <div
                          key={String(c._id || c.commit_sha)}
                          className="flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {c.message || c.commit_sha}
                            </div>
                            <div className="text-xs text-slate-500">
                              {[c.author, c.repo, c.username]
                                .filter(Boolean)
                                .map(String)
                                .join(" • ")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      No commits synced yet for this project.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-6"
        >
          {/* Team Members */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg">Team Members</CardTitle>
              <div>
                <Dialog
                  open={isMemberDialogOpen}
                  onOpenChange={setIsMemberDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                      <DialogDescription>
                        Invite a member by email and optionally set their name
                        and role.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                      <div>
                        <Label htmlFor="member-email">Email</Label>
                        <Input
                          id="member-email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          placeholder="member@example.com"
                        />
                        <p className="mt-1 text-sm">
                          {checkingEmail ? (
                            <span className="text-slate-500">Checking...</span>
                          ) : emailExists === true ? (
                            <span className="text-emerald-600">
                              Member exists in system
                            </span>
                          ) : emailExists === false ? (
                            <span className="text-red-600">
                              Member not found
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Enter a valid email to check
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="member-role">Role</Label>
                        <select
                          id="member-role"
                          aria-label="Member role"
                          value={newMemberRole}
                          onChange={(e) => setNewMemberRole(e.target.value)}
                          className="w-full rounded-md border border-slate-200 px-3 py-2"
                        >
                          <option value="Contributor">Contributor</option>
                          <option value="Reviewer">Reviewer</option>
                          <option value="Lead">Lead</option>
                        </select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsMemberDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddTeamMember}
                        disabled={addingMember}
                      >
                        {addingMember ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Member"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project?.team_members?.map(
                  (
                    member: {
                      name: string;
                      avatar: string;
                      role: string;
                      email?: string;
                    },
                    index: number,
                  ) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={member.avatar || "https://placehold.co/30/svg"}
                          alt={member?.name || "User avatar"}
                        />
                        <AvatarFallback>
                          {member?.name
                            ?.split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {member?.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {member?.role}
                          </span>
                        </div>
                        {member?.email && (
                          <p className="text-xs text-slate-500">
                            {member.email}
                          </p>
                        )}
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTeamMember(member.email)}
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Tasks</span>
                  <span className="font-semibold">{projectTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Completed</span>
                  <span className="font-semibold text-emerald-600">
                    {
                      projectTasks.filter((t) => t.status === "completed")
                        .length
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">In Progress</span>
                  <span className="font-semibold text-sky-600">
                    {
                      projectTasks.filter((t) => t.status === "in-progress")
                        .length
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Todo</span>
                  <span className="font-semibold text-slate-600">
                    {projectTasks.filter((t) => t.status === "todo").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assessment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Status</span>
                  <div className="flex items-center gap-2">
                    {assessmentLoading.checkAssessment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                        <span className="text-sm text-slate-500">
                          Checking...
                        </span>
                      </>
                    ) : assessmentExists ||
                      assessmentHelpers.isAssessmentExistsForProject(
                        project_id,
                      ) ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">
                          Created
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-600">
                          Not Created
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {currentCreatedAssessment &&
                  currentCreatedAssessment.project_id === project_id && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Questions
                        </span>
                        <span className="font-semibold">
                          {currentCreatedAssessment?.questions?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Difficulty
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            currentCreatedAssessment.difficulty === "beginner"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : currentCreatedAssessment.difficulty ===
                                  "intermediate"
                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                : "bg-red-100 text-red-700 border-red-200"
                          }
                        >
                          {currentCreatedAssessment.difficulty}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Time Limit
                        </span>
                        <span className="font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {currentCreatedAssessment?.time_limit || 0}m
                        </span>
                      </div>
                    </>
                  )}

                <div className="pt-2">
                  <Button
                    asChild
                    size="sm"
                    variant={
                      assessmentExists ||
                      assessmentHelpers.isAssessmentExistsForProject(project_id)
                        ? "outline"
                        : "default"
                    }
                    className="w-full"
                  >
                    <Link href={`/college/projects/${project_id}/assessment`}>
                      {assessmentExists ||
                      assessmentHelpers.isAssessmentExistsForProject(
                        project_id,
                      ) ? (
                        <>
                          <FileText className="mr-2 h-3 w-3" />
                          View Assessment
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-3 w-3" />
                          Create Assessment
                        </>
                      )}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      {/* Edit Project Sheet Slider */}
      <Sheet open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <SheetContent className="sm:max-w-[550px] w-full flex flex-col h-full border-l bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-2xl p-6 overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-zinc-150 dark:border-zinc-800">
            <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Edit Project Details</SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-450">
              Update the project details below. Fields with * are required.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-4 space-y-4">
            {/* Title */}
            <div className="grid gap-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Project Title <span className="text-red-500">*</span>
                </Label>
                {(editedProject?.title || "").trim().length > 0 && (editedProject?.title || "").trim().length < 6 && (
                  <span className="text-[10px] text-red-500 font-medium">Min 6 characters ({(editedProject?.title || "").trim().length}/6)</span>
                )}
              </div>
              <Input
                id="edit-title"
                placeholder="Enter project title"
                value={editedProject?.title || ""}
                onChange={(e) =>
                  setEditedProject((prev) => ({ ...prev!, title: e.target.value }))
                }
                className={(editedProject?.title || "").trim().length > 0 && (editedProject?.title || "").trim().length < 6 ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
              />
            </div>

            {/* Description */}
            <div className="grid gap-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-description" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Description <span className="text-red-500">*</span>
                </Label>
                {(editedProject?.description || "").trim().length > 0 && (editedProject?.description || "").trim().length < 6 && (
                  <span className="text-[10px] text-red-500 font-medium">Min 6 characters ({(editedProject?.description || "").trim().length}/6)</span>
                )}
              </div>
              <Textarea
                id="edit-description"
                placeholder="Describe your project"
                value={editedProject?.description || ""}
                onChange={(e) =>
                  setEditedProject((prev) => ({ ...prev!, description: e.target.value }))
                }
                className={(editedProject?.description || "").trim().length > 0 && (editedProject?.description || "").trim().length < 6 ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                rows={4}
              />
            </div>

            {/* Tags */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-tags" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Tags (comma-separated)
              </Label>
              <Input
                id="edit-tags"
                placeholder="React, TypeScript, Node.js"
                value={editedProject?.tags ? editedProject.tags.join(", ") : ""}
                onChange={(e) => {
                  const tagsArray = e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag);
                  setEditedProject((prev) => ({ ...prev!, tags: tagsArray }));
                }}
                className="rounded-xl"
              />
              {editedProject?.tags && editedProject.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {editedProject.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[9px] font-medium px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 border border-zinc-200 dark:border-zinc-700">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Deadline */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-deadline" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Deadline
              </Label>
              <DatePicker
                value={editedProject?.deadline ? new Date(editedProject.deadline).toISOString().split("T")[0] : ""}
                onChange={(dateStr) =>
                  setEditedProject((prev) => ({ 
                    ...prev!, 
                    deadline: dateStr ? new Date(dateStr).toISOString() : undefined 
                  }))
                }
              />
            </div>

            {/* Status */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-status" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Project Status
              </Label>
              <select
                id="edit-status"
                className="border rounded-xl p-2 bg-white dark:bg-zinc-950 text-xs border-zinc-200 dark:border-zinc-800"
                value={editedProject?.status || "planning"}
                onChange={(e) =>
                  setEditedProject((prev) => ({
                    ...prev!,
                    status: e.target.value as any,
                  }))
                }
              >
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>

            {/* Progress */}
            <div className="grid gap-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-progress" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Progress (%)
                </Label>
                <span className="text-xs font-bold">{editedProject?.progress || 0}%</span>
              </div>
              <Input
                id="edit-progress"
                type="number"
                min="0"
                max="100"
                value={editedProject?.progress || 0}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                  setEditedProject((prev) => ({
                    ...prev!,
                    progress: val,
                  }));
                }}
                className="rounded-xl"
              />
            </div>

            {/* GitHub Repository */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-github" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                GitHub Repository (e.g. username/repo)
              </Label>
              <Input
                id="edit-github"
                placeholder="username/repo"
                value={editedProject?.github_repository || ""}
                onChange={(e) =>
                  setEditedProject((prev) => ({ ...prev!, github_repository: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-zinc-150 dark:border-zinc-800 flex flex-row items-center justify-between mt-auto gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditProjectOpen(false)}
              className="rounded-xl border-zinc-200 hover:bg-zinc-50 text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProject}
              className="rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold h-9 px-5 cursor-pointer bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              disabled={
                !editedProject?.title ||
                editedProject.title.trim().length < 6 ||
                !editedProject.description ||
                editedProject.description.trim().length < 6
              }
            >
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
}
