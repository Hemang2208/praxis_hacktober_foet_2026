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
  Save,
  X,
  Clock,
  FileText,
  Brain,
  Loader2,
  Target,
  Award,
  Github,
  Share2,
  ChevronRight,
  Briefcase,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { queueAwareFetch, isQueueResponse, isQueueTimeoutResponse } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";

import { useCachedProject } from "@/hooks/useCachedResources";
import useUserProfile from "@/hooks/useUserProfile";
import { generateCertificate } from "@/utils/certificateGenerator";
import { useTasks } from "@/hooks/useTasks";
import { useAssessments } from "@/hooks/useAssessments";
import {
  deleteProject,
  updateProject,
  updateProjectTeam,
  linkProjectRepo,
  generateProjectTasks,
  Project,
  BackendTeamMember,
  FrontendTeamMember,
  createTaskInBoard,
  fetchProjectBoard,
  fetchProjectById,
} from "@/redux/slice/project.slice";
import { useAppDispatch } from "@/redux/hooks";
import { Task } from "@/redux/slice/task.slice";
import { fetchTasksByProject } from "@/redux/slice/task.slice";
import {
  canManageCompanyProjects,
  getViewerCompanySubrole,
} from "@/lib/company-rbac";
import GeneratedTasksPreview, {
  PreviewTask,
  CreateTaskPayload as GeneratedCreateTaskPayload,
} from "@/components/tasks/GeneratedTasksPreview";
import ProjectMemberManagementDialog, {
  AssignMemberInput,
  CreateRoleInput,
} from "@/components/projects/ProjectMemberManagementDialog";
import { PLANNER_AGENT_URL, TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import {
  isPrivilegedCompanyRole,
  isResourceRoleOccupied,
  isRestrictedResourceRoleName,
  normalizeEmail,
  normalizeRoleKey,
} from "@/lib/project-member-rules";

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

type ProjectMemberAction = "add" | "remove";
type ProjectMemberRole =
  | "super_owner"
  | "owner"
  | "admin"
  | "manager"
  | "trainee"
  | "unknown";

type ValidateForProjectResponse = {
  exists: boolean;
  normalized_email: string;
  user?: {
    user_id?: string;
    email?: string;
    name?: string;
    profile_picture?: string;
    role?: string;
    company_subrole?: string;
    company_subrole_raw?: string;
  };
  is_already_in_current_project?: boolean;
  is_assigned_to_other_active_project?: boolean;
  active_project_count?: number;
  blocking_project?: { id?: string; title?: string; status?: string } | null;
  message?: string;
};

const ROLE_WEIGHT: Record<ProjectMemberRole, number> = {
  unknown: 0,
  trainee: 1,
  manager: 2,
  admin: 3,
  owner: 4,
  super_owner: 5,
};

const normalizeProjectMemberRole = (value: unknown): ProjectMemberRole => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (raw === "super_owner" || raw === "superowner" || raw === "superadmin") {
    return "super_owner";
  }
  if (raw === "owner") return "owner";
  if (raw === "admin") return "admin";
  if (raw === "manager") return "manager";
  if (raw === "trainee") return "trainee";
  return "unknown";
};

const checkRolePermissions = (
  currentUserRole: ProjectMemberRole,
  targetUserRole: ProjectMemberRole,
  action: ProjectMemberAction,
): { allowed: boolean; reason?: string } => {
  if (currentUserRole !== "owner" && currentUserRole !== "admin") {
    return {
      allowed: false,
      reason: "Only Owner/Admin can manage project members.",
    };
  }

  if (targetUserRole === "super_owner") {
    return {
      allowed: false,
      reason: "Super Owner membership cannot be changed from this page.",
    };
  }

  if (
    action === "remove" &&
    ROLE_WEIGHT[targetUserRole] >= ROLE_WEIGHT[currentUserRole]
  ) {
    return {
      allowed: false,
      reason: "You cannot remove a member with equal or higher privilege.",
    };
  }

  return { allowed: true };
};

const buildTeamPayload = (
  existingTeam: BackendTeamMember[] | undefined,
  newMember: BackendTeamMember,
): BackendTeamMember[] => {
  const source = Array.isArray(existingTeam) ? existingTeam : [];
  const normalizedUserId = String(newMember.user || "").trim();

  return [
    ...source.filter(
      (member) => String(member.user || "").trim() !== normalizedUserId,
    ),
    newMember,
  ];
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

type ProjectStatus = "planning" | "in-progress" | "completed" | "on-hold";

const deriveProjectStatusFromCounts = (args: {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
}): ProjectStatus => {
  const total = Math.max(0, args.total);
  const completed = Math.max(0, Math.min(args.completed, total));
  const inProgress = Math.max(0, args.inProgress);
  const blocked = Math.max(0, args.blocked);

  if (total === 0) return "planning";
  if (completed >= total) return "completed";
  if (inProgress > 0 || completed > 0) return "in-progress";
  if (blocked > 0) return "on-hold";
  return "planning";
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

// Skeleton Loading Component
function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
          </div>
          <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
          <div className="h-4 w-1/2 mt-2 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 mb-2 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <div className="h-4 w-28 mb-2 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                <div className="h-20 w-full bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
              </div>

              {/* Technologies */}
              <div>
                <div className="h-4 w-28 mb-2 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"
                    />
                  ))}
                </div>
              </div>

              {/* Sprint Progress */}
              <div>
                <div className="h-4 w-40 mb-3 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-3 w-32 mb-2 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                      </div>
                      <div className="h-5 w-24 ml-3 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <div className="h-4 w-32 mb-3 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="h-4 w-4 mt-1 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-40 mb-1 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                      <div className="h-3 w-full mt-1 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                      <div className="h-3 w-24 mt-1 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const project_id = (params?.project_id as string) || "";

  const {
    project: currentProject,
    loading,
    error,
    isCached,
  } = useCachedProject(project_id);
  const { getTasksForProject, loading: taskLoading } = useTasks();
  const { mongoUser } = useUserProfile();
  const {
    actions: assessmentActions,
    helpers: assessmentHelpers,
    loading: assessmentLoading,
    currentCreatedAssessment,
  } = useAssessments();
  const canManageProjectActions = canManageCompanyProjects(mongoUser as any);

  const validateUserForProject = useCallback(
    async (
      email: string,
      projectId: string,
    ): Promise<ValidateForProjectResponse> => {
      const normalizedEmail = normalizeEmail(email);
      const response = await fetch(`/api/user/validate-for-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, project_id: projectId }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as ValidateForProjectResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          String(
            payload.error ||
              payload.message ||
              "Unable to validate member for project.",
          ),
        );
      }

      return payload;
    },
    [],
  );

  const syncProjectState = useCallback(
    async (projectId: string) => {
      try {
        await dispatch(fetchProjectById(projectId)).unwrap();
      } catch (err) {
        console.warn("Failed to sync latest project state:", err);
      }
    },
    [dispatch],
  );

  const triggerProjectMemberJob = useCallback(
    async (
      eventName: "project/member.added" | "project/member.removed",
      payload: Record<string, unknown>,
    ) => {
      try {
        await fetch(`/api/project/member-events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ eventName, payload }),
        });
      } catch (err) {
        console.warn("Failed to enqueue project member event:", err);
      }
    },
    [],
  );

  const [, setCheckingAssessment] = useState<boolean>(false);

  // Local state for UI and editing
  const [project, setProject] = useState<Project | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "activity" | "settings">("overview");
  const [editedProject, setEditedProject] = useState<Project | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState(""); // New state for due date
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const [creatingResource, setCreatingResource] = useState(false);
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

  // Repository selection state
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [linkingRepo, setLinkingRepo] = useState(false);

  const extractGitHubUsername = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)/);
    return match ? match[1] : null;
  };

  const handleOpenRepoDialog = async () => {
    const owner = mongoUser?.socialLinks?.github
      ? extractGitHubUsername(mongoUser.socialLinks.github)
      : null;
    if (!owner) {
      toast.error(
        "GitHub not connected. Please connect it in your profile first.",
      );
      return;
    }
    setIsRepoDialogOpen(true);
    setLoadingRepos(true);
    try {
      const res = await fetch(`/api/github/user?username=${owner}`);
      if (!res.ok) throw new Error("Failed to fetch repositories");
      const data = await res.json();
      setRepos(data.repositories || []);
    } catch (err) {
      console.error("Error fetching repos:", err);
      toast.error("Failed to load your repositories");
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleLinkRepo = async (repoPath: string) => {
    if (!project) return;
    setLinkingRepo(true);
    try {
      await dispatch(
        linkProjectRepo({ project_id: project._id, repoPath }),
      ).unwrap();
      setIsRepoDialogOpen(false);
    } catch (err) {
      console.error("Error linking repo:", err);
      toast.error("Failed to link repository");
    } finally {
      setLinkingRepo(false);
    }
  };

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

          // Prefer the most recent of commit time vs sync time.
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
  const projectRef = useRef<Project | null>(null);
  const projectTasksRef = useRef<Task[]>([]);
  const hasInitializedFetch = useRef(false);

  // Force fetch fresh tasks on component mount and when project_id changes
  // Always fetch on mount to ensure fresh data, not relying on stale Redux cache
  useEffect(() => {
    if (!project_id) return;

    // Reset the flag when project_id changes
    hasInitializedFetch.current = false;
  }, [project_id]);

  // Fetch tasks for this project from task-mgmt-agent on demand;
  // Always fetch on mount to ensure fresh data
  useEffect(() => {
    if (!project_id) return;

    // Only fetch once per project to avoid unnecessary requests
    if (hasInitializedFetch.current) return;
    hasInitializedFetch.current = true;

    if (!taskLoading.fetchTasksByProject) {
      dispatch(fetchTasksByProject(project_id));
    }
  }, [project_id, dispatch, taskLoading.fetchTasksByProject]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    projectTasksRef.current = Array.isArray(projectTasks) ? projectTasks : [];
  }, [projectTasks]);
  const [projectProgress, setProjectProgress] = useState(0);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("planning");
  const [progressCardDescription, setProgressCardDescription] =
    useState("0 tasks completed");

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
          (t as any)?.completed_at ??
          tAny?.completed_at ??
          tAny?.completed_at ??
          tAny?.completed_at;
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

  const coerceProgressValue = useCallback((value: unknown): number => {
    if (value == null) return 0;

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const wrapped =
        record.$numberDouble ??
        record.$numberDecimal ??
        record.$numberInt ??
        record.$numberLong;
      if (wrapped !== undefined) return coerceProgressValue(wrapped);
    }

    const n =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number.parseFloat(value)
          : Number.NaN;

    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, n));
  }, []);

  function isTask(obj: unknown): obj is Task {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "status" in obj &&
      typeof (obj as Task).status === "string"
    );
  }

  useEffect(() => {
    let cancelled = false;

    const setFromCounts = (
      completed: number,
      total: number,
      progressPct: number,
      inProgress: number,
      blocked: number,
    ) => {
      const safeTotal = Math.max(0, total);
      const safeCompleted = Math.max(0, Math.min(completed, safeTotal));
      const rounded = Math.round(coerceProgressValue(progressPct));
      if (cancelled) return;
      setProjectProgress(rounded);
      setProjectStatus(
        deriveProjectStatusFromCounts({
          total: safeTotal,
          completed: safeCompleted,
          inProgress,
          blocked,
        }),
      );
      setProgressCardDescription(
        safeTotal > 0
          ? `${safeCompleted}/${safeTotal} tasks completed${
              rounded >= 97 ? " 🏆 Certificate Ready!" : ""
            }`
          : "0 tasks completed",
      );
    };

    async function fetchProgressFromTaskMgmt() {
      if (!project_id) return;
      try {
        const res = await fetch(
          `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/statistics`,
        );

        if (!res.ok) throw new Error(`Failed to fetch progress: ${res.status}`);

        const data = (await res.json().catch(() => null)) as any;

        const progressPct = coerceProgressValue(
          data?.completion_percentage ??
            data?.progress ??
            data?.project?.progress,
        );

        const total =
          typeof data?.total_tasks === "number"
            ? data.total_tasks
            : typeof data?.totalTasks === "number"
              ? data.totalTasks
              : 0;
        const completed =
          typeof data?.completed_tasks === "number"
            ? data.completed_tasks
            : typeof data?.completedTasks === "number"
              ? data.completedTasks
              : 0;

        const inProgress =
          typeof data?.in_progress_tasks === "number"
            ? data.in_progress_tasks
            : typeof data?.inProgressTasks === "number"
              ? data.inProgressTasks
              : 0;

        const blocked =
          typeof data?.blocked_tasks === "number"
            ? data.blocked_tasks
            : typeof data?.blockedTasks === "number"
              ? data.blockedTasks
              : 0;

        setFromCounts(completed, total, progressPct, inProgress, blocked);
        return;
      } catch (err) {
        console.warn("Failed to load task-mgmt progress; falling back", err);
      }

      // Fallback 1: compute from Redux tasks if available
      const reduxTasks: Task[] = Array.isArray(projectTasksRef.current)
        ? (projectTasksRef.current as unknown[]).filter(isTask)
        : [];

      const total = reduxTasks.length;
      const completed = reduxTasks.filter(
        (t) => t.status === "completed",
      ).length;
      const inProgress = reduxTasks.filter(
        (t) => t.status === "in-progress",
      ).length;
      const blocked = reduxTasks.filter((t) => t.status === "blocked").length;

      if (total > 0) {
        setFromCounts(
          completed,
          total,
          (completed / total) * 100,
          inProgress,
          blocked,
        );
        return;
      }

      // Fallback 2: persisted progress from planner-agent project
      const persisted = coerceProgressValue(
        (projectRef.current as any)?.progress,
      );
      setFromCounts(0, 0, persisted, 0, 0);
    }

    void fetchProgressFromTaskMgmt();

    return () => {
      cancelled = true;
    };
  }, [project_id, coerceProgressValue]);

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

  // Project data is fetched via useCachedProject hook,
  // no additional dispatch needed (hooks handle caching automatically)

  // Set edited project when current project changes
  useEffect(() => {
    if (currentProject) {
      // console.log("Setting project from Redux:", {
      //   id: currentProject._id,
      //   title: currentProject.title,
      //   resourcesCount: currentProject.resources?.length || 0,
      //   resources: currentProject.resources
      // });
      setEditedProject(currentProject);
      setProject(currentProject);
    }
  }, [currentProject]);

  // Debug effect to monitor project state
  useEffect(() => {
    // console.log("Project state changed:", {
    //   project: project?._id,
    //   hasResources: !!project?.resources,
    //   resourcesLength: project?.resources?.length || 0,
    //   resources: project?.resources
    // });
  }, [project]);

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
              credentials: "include",
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
          // data (e.g. queue system intercepted this request), treat the plan
          // as "unknown but possibly exists" and let the user navigate to the
          // plan page to see the real state.
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
          console.error("Project plan check failed:", error);
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
        await dispatch(deleteProject(project._id)).unwrap();
        router.push("/dashboard/projects");
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
    router.push(`/dashboard/projects/${project._id}/board`);

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
      // Call the external generate-tasks API
      const token = await fastAPIAuthService.getAccessToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      console.log("🔍 QUEUE_COMPLETED — handleGenerateTasks polling finished");
      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/generate-tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
        },
        { maxPollAttempts: 60, pollIntervalMs: 2000 },
      );

      if (isQueueTimeoutResponse(res)) {
        toast.success("Task generation is in progress. Please wait a moment and refresh the page.", { id: loadingToast });
        setGenerationToastId(null);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to generate tasks (status ${res.status})`);
      }

      const resData = await res.json();
      console.log("🔍 RESULT_RECEIVED — handleGenerateTasks got data");

      if (isQueueResponse(resData)) {
        toast.success("Task generation is in progress. Please wait a moment and refresh the page.", { id: loadingToast });
        setGenerationToastId(null);
        return;
      }

      // Support several possible response shapes
      const generated =
        resData?.tasks || resData?.generatedTasks || resData || [];

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
        console.log("🔍 BOARD_REFETCHED — fetchProjectBoard after saving generated tasks");
        // After successfully saving and refreshing, navigate to the board
        try {
          router.push(`/dashboard/projects/${project._id}/board`);
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

  // Create new resource handler
  const handleCreateNewResource = async (input: CreateRoleInput) => {
    const profile = String(input.profile || "").trim();
    if (!profile) {
      toast.error("Please enter a role/profile name");
      return;
    }

    if (isRestrictedResourceRoleName(profile)) {
      toast.error(
        "Admin/Owner roles are managed implicitly and cannot be added as project resources.",
      );
      return;
    }

    if (!project) return;

    // Check if role already exists
    const roleExists = project.resources?.some(
      (resource) =>
        normalizeRoleKey(resource.profile) === normalizeRoleKey(profile),
    );

    if (roleExists) {
      toast.error("A role with this name already exists");
      return;
    }

    const loadingToast = toast.loading("Creating new role...");
    setCreatingResource(true);

    try {
      const newResource = {
        profile,
        skills: Array.isArray(input.skills) ? input.skills : [],
        experience: String(input.experience || "").trim() || undefined,
        description: String(input.description || "").trim() || undefined,
      };

      const existingResources = Array.isArray(project.resources)
        ? project.resources
        : [];
      await dispatch(
        updateProject({
          id: project._id,
          updates: { resources: [...existingResources, newResource] as any },
        }),
      ).unwrap();
    } catch (error) {
      console.error("Error creating new resource:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create new role",
        { id: loadingToast },
      );
    } finally {
      setCreatingResource(false);
    }
  };

  // Add team member handler
  const handleAddTeamMember = async ({
    email,
    roleProfile,
  }: AssignMemberInput) => {
    if (!project?._id) {
      toast.error("Project context is missing.");
      return;
    }

    if (!canManageProjectActions) {
      toast.error("Only Owner/Admin can add project members.");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      toast.error("Please enter an email for the new member");
      return;
    }

    if (!roleProfile) {
      toast.error("Please select a role from available project resources");
      return;
    }

    const selectedResource = project.resources?.find(
      (resource) =>
        normalizeRoleKey(resource.profile) === normalizeRoleKey(roleProfile),
    );

    if (!selectedResource) {
      toast.error("Selected role not found in project resources");
      return;
    }

    const roleAlreadyFilled =
      Array.isArray(project.team_members) &&
      (
        project.team_members as {
          name?: string;
          avatar?: string;
          role?: string;
          email?: string;
        }[]
      ).some(
        (member) =>
          normalizeRoleKey(member.role) ===
          normalizeRoleKey(selectedResource.profile),
      );

    if (roleAlreadyFilled) {
      toast.error(`The ${selectedResource.profile} role is already filled`);
      return;
    }

    const isDuplicateEmail = Array.isArray(project.team_members)
      ? (
          project.team_members as {
            email?: string;
          }[]
        ).some(
          (member) => normalizeEmail(member.email || "") === normalizedEmail,
        )
      : false;

    if (isDuplicateEmail) {
      toast.error("A member with this email already exists on the project");
      return;
    }

    const viewerEmail = String(mongoUser?.email ?? "")
      .trim()
      .toLowerCase();
    const targetEmail = normalizedEmail;

    if (viewerEmail && targetEmail && viewerEmail === targetEmail) {
      toast.error(
        "You already have project access. Admin/Owner users cannot add themselves as members.",
      );
      return;
    }

    const loadingToast = toast.loading("Adding team member...");
    setAddingMember(true);

    try {
      const validation = await validateUserForProject(
        normalizedEmail,
        project._id,
      );
      if (!validation.exists || !validation.user) {
        throw new Error(
          validation.message || "User does not exist in the system.",
        );
      }

      if (validation.is_already_in_current_project) {
        throw new Error(
          validation.message ||
            "This user already has access to the current project.",
        );
      }

      if (
        isPrivilegedCompanyRole(
          validation.user.company_subrole_raw ||
            validation.user.company_subrole ||
            validation.user.role,
        )
      ) {
        throw new Error(
          "Admin/Owner users already have implicit access and cannot be added manually.",
        );
      }

      const currentRole = normalizeProjectMemberRole(
        getViewerCompanySubrole(mongoUser as any) || mongoUser?.subrole,
      );
      const targetRole = normalizeProjectMemberRole(
        validation.user.company_subrole_raw ||
          validation.user.company_subrole ||
          validation.user.role,
      );

      const rolePermission = checkRolePermissions(
        currentRole,
        targetRole,
        "add",
      );
      if (!rolePermission.allowed) {
        throw new Error(
          rolePermission.reason || "Insufficient role permissions.",
        );
      }

      if (
        targetRole === "trainee" &&
        validation.is_assigned_to_other_active_project
      ) {
        throw new Error(
          validation.message ||
            "Trainee is already assigned to another active project.",
        );
      }

      const targetUserId = String(validation.user.user_id || "").trim();
      if (!targetUserId) {
        throw new Error("Validated user record is missing a user ID.");
      }

      const backendMember: BackendTeamMember = {
        user: targetUserId,
        role: selectedResource.profile,
      };

      const displayName =
        String(validation.user.name || "").trim() ||
        normalizedEmail.split("@")[0];
      const frontendMember: FrontendTeamMember = {
        name: displayName,
        avatar:
          String(validation.user.profile_picture || "") ||
          selectedResource.avatar ||
          "",
        email: normalizedEmail,
        role: selectedResource.profile,
        user: targetUserId,
        ...(selectedResource.username &&
        selectedResource.username !== displayName
          ? { username: selectedResource.username }
          : { username: normalizedEmail.split("@")[0] }),
      };

      const existingTeamMembers = Array.isArray(project.team_members)
        ? (project.team_members as FrontendTeamMember[])
        : [];

      if (
        isResourceRoleOccupied(existingTeamMembers, selectedResource.profile)
      ) {
        throw new Error(
          `The ${selectedResource.profile} role is already assigned to another member.`,
        );
      }

      const updatedTeamMembers: FrontendTeamMember[] = [
        ...existingTeamMembers.filter(
          (member) => String(member.user || "").trim() !== targetUserId,
        ),
        frontendMember,
      ];
      const updatedBackendTeam = buildTeamPayload(project.team, backendMember);

      await dispatch(
        updateProjectTeam({
          id: project._id,
          team: updatedBackendTeam,
          team_members: updatedTeamMembers,
        }),
      ).unwrap();

      void triggerProjectMemberJob("project/member.added", {
        projectId: project._id,
        projectTitle: project.title,
        recipientEmail: normalizedEmail,
        recipientName: displayName,
        role: selectedResource.profile,
        actorName:
          mongoUser?.full_name || mongoUser?.username || mongoUser?.email,
      });
      setIsMemberDialogOpen(false);

      toast.success(
        `Team member assigned to ${selectedResource.profile} role (linked to user account)`,
        { id: loadingToast },
      );
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
  const handleRemoveTeamMember = async (member: {
    name?: string;
    role?: string;
    email?: string;
    user?: string;
  }) => {
    if (!project?._id) return;

    if (!canManageProjectActions) {
      toast.error("Only Owner/Admin can remove project members.");
      return;
    }

    const normalizedTargetEmail = normalizeEmail(member.email || "");

    let targetUserId = String(member.user || "").trim();
    let targetRole = normalizeProjectMemberRole(member.role);

    if (normalizedTargetEmail) {
      try {
        const validation = await validateUserForProject(
          normalizedTargetEmail,
          project._id,
        );
        targetUserId = String(
          validation.user?.user_id || targetUserId || "",
        ).trim();
        targetRole = normalizeProjectMemberRole(
          validation.user?.company_subrole_raw ||
            validation.user?.company_subrole ||
            member.role,
        );
      } catch (err) {
        console.warn("Could not load full member role metadata:", err);
      }
    }

    if (!targetUserId) {
      toast.error("Cannot remove member without a stable user ID.");
      return;
    }

    const currentRole = normalizeProjectMemberRole(
      getViewerCompanySubrole(mongoUser as any) || mongoUser?.subrole,
    );
    const rolePermission = checkRolePermissions(
      currentRole,
      targetRole,
      "remove",
    );
    if (!rolePermission.allowed) {
      toast.error(rolePermission.reason || "Insufficient role permissions.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to remove this member from the project?",
      )
    ) {
      return;
    }

    const loadingToast = toast.loading("Removing member...");

    try {
      const updatedResources: FrontendTeamMember[] = Array.isArray(
        project.team_members,
      )
        ? (project.team_members as FrontendTeamMember[]).filter(
            (projectMember) => {
              const projectMemberUser = String(projectMember.user || "").trim();
              if (projectMemberUser) {
                return projectMemberUser !== targetUserId;
              }
              // Legacy fallback when historical entries do not have user IDs.
              return (
                normalizeEmail(projectMember.email || "") !==
                normalizedTargetEmail
              );
            },
          )
        : [];

      const updatedBackendTeam: BackendTeamMember[] = Array.isArray(
        project.team,
      )
        ? project.team.filter(
            (backendMember) =>
              String(backendMember.user || "").trim() !== targetUserId,
          )
        : [];

      await dispatch(
        updateProjectTeam({
          id: project._id,
          team: updatedBackendTeam,
          team_members: updatedResources,
        }),
      ).unwrap();

      void triggerProjectMemberJob("project/member.removed", {
        projectId: project._id,
        projectTitle: project.title,
        recipientEmail: normalizedTargetEmail,
        recipientName: member.name,
        role: member.role,
        actorName:
          mongoUser?.full_name || mongoUser?.username || mongoUser?.email,
      });

      toast.success("Member removed", { id: loadingToast });
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member",
        { id: loadingToast },
      );
    }
  };

  if (loading) {
    return <ProjectDetailSkeleton />;
  }

  if (error && !project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Project Not Found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {typeof error === "string"
              ? error
              : "The project you're looking for doesn't exist or has been deleted."}
          </p>
          <Button asChild>
            <Link href="/dashboard/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getObjectives = (desc?: string) => {
    if (!desc) return [];
    const lines = desc.split("\n");
    const bullets = lines
      .map(line => line.trim())
      .filter(line => line.startsWith("-") || line.startsWith("*") || line.startsWith("+"))
      .map(line => line.replace(/^[-*+]\s*/, ""));
    
    if (bullets.length > 0) return bullets;

    const sentences = desc
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.toLowerCase().includes("generator"));
    
    return sentences.slice(0, 4);
  };

  const handleShareProject = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Project link copied to clipboard!");
    }
  };

  const daysRemainingVal = project?.deadline
    ? Math.ceil(
        (new Date(project.deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div className="space-y-6 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            {/* Project icon square */}
            <div className="h-14 w-14 rounded-2xl bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-950 flex-shrink-0 shadow-sm">
              <Calendar className="h-6 w-6" />
            </div>
            
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words leading-tight">
                  {project?.title}
                </h1>
                <Badge variant="outline" className={getStatusColor(projectStatus) + " text-[10px] px-2 py-0.5 rounded-md font-medium tracking-wide uppercase"}>
                  {projectStatus.replace("-", " ")}
                </Badge>
              </div>

              <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
                {project?.description}
              </p>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-[11px] text-zinc-400 font-medium">
                {project?.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Created {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                {project?.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Due {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  Company Workspace
                </span>
              </div>
            </div>
          </div>

          {/* Right side navigation buttons */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <>
              <Button asChild className="rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold h-9 px-4 cursor-pointer border-none shadow-sm">
                  <Link href={`/dashboard/projects/${project_id}/board`}>
                    <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                    Board
                  </Link>
                </Button>
                {(projectPlanExists || canManageProjectActions) && (
                  <Button asChild variant="outline" className="rounded-xl border-zinc-200 hover:bg-zinc-50 text-xs font-semibold h-9 px-4 cursor-pointer">
                    <Link href={`/dashboard/projects/${project_id}/plan`}>
                      <Target className="mr-1.5 h-3.5 w-3.5 text-zinc-550" />
                      Plan
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-xl border-zinc-200 hover:bg-zinc-50 text-xs font-semibold h-9 px-4 cursor-pointer">
                  <Link href={`/dashboard/projects/${project_id}/board`}>
                    <FileText className="mr-1.5 h-3.5 w-3.5 text-zinc-550" />
                    Tasks
                  </Link>
                </Button>
                {(assessmentExists ||
                  assessmentHelpers.isAssessmentExistsForProject(project_id) ||
                  canManageProjectActions) && (
                  <Button asChild variant="outline" className="rounded-xl border-zinc-200 hover:bg-zinc-50 text-xs font-semibold h-9 px-4 cursor-pointer">
                    <Link href={`/dashboard/projects/${project_id}/assessment`}>
                      <Brain className="mr-1.5 h-3.5 w-3.5 text-zinc-550" />
                      Assessment
                    </Link>
                  </Button>
                )}
                <Button onClick={handleShareProject} variant="outline" className="rounded-xl border-zinc-200 hover:bg-zinc-50 text-xs font-semibold h-9 px-3.5 cursor-pointer gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-zinc-650" />
                  <span>Share</span>
                </Button>
                
                {canManageProjectActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="rounded-xl border-zinc-200 hover:bg-zinc-50 text-xs font-semibold h-9 px-3 cursor-pointer">
                        <MoreHorizontal className="h-3.5 w-3.5 text-zinc-650" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border border-zinc-250/60 rounded-xl shadow-md p-1 min-w-44">
                      {project?.github_repository && project.github_repository.includes("/") ? (
                        <DropdownMenuItem
                          className="text-xs rounded-lg cursor-pointer flex items-center py-2"
                          onClick={() => window.open(`https://github.com/${project.github_repository}`, "_blank")}
                        >
                          <Github className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                          View on GitHub
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={handleOpenRepoDialog} className="text-xs rounded-lg cursor-pointer flex items-center py-2">
                          <ExternalLink className="mr-2 h-3.5 w-3.5 text-zinc-550" />
                          Link Repository
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => {
                        setEditedProject(project);
                        setIsEditProjectOpen(true);
                      }} className="text-xs rounded-lg cursor-pointer flex items-center py-2">
                        <Edit className="mr-2 h-3.5 w-3.5 text-zinc-550" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-100" />
                      <DropdownMenuItem
                        className="text-xs rounded-lg cursor-pointer text-red-650 flex items-center py-2 hover:bg-red-50 hover:text-red-750"
                        onClick={handleDeleteProject}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </>
          </div>
        </Card>
      </motion.div>

      {/* ── PROJECT METRICS ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Metric 1: Progress */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[115px]">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">Progress</span>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-550 mt-2">{projectProgress}%</div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1 truncate">{progressCardDescription}</p>
        </Card>

        {/* Metric 2: Team Members */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">Team Members</span>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                {project?.team_members?.length || 0}
              </div>
            </div>
            <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1">Active contributors</p>
        </Card>

        {/* Metric 3: Days Remaining */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">Days Remaining</span>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                {daysRemainingVal === null ? "—" : Math.max(0, daysRemainingVal)}
              </div>
            </div>
            <div className="h-7 w-7 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1 truncate">
            {daysRemainingVal === null
              ? "No deadline set"
              : daysRemainingVal < 0
                ? `Overdue by ${Math.abs(daysRemainingVal)} days`
                : daysRemainingVal === 0
                  ? "Due today"
                  : `Due on ${new Date(project?.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          </p>
        </Card>

        {/* Metric 4: Priority */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">Priority</span>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                {((project as any)?.priority) ? String((project as any).priority).charAt(0).toUpperCase() + String((project as any).priority).slice(1) : "High"}
              </div>
            </div>
            <div className="h-7 w-7 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1">Project priority</p>
        </Card>
      </motion.div>

      {/* ── TABS NAVIGATION ─────────────────────────────────────────── */}
      <div className="border-b border-zinc-100 dark:border-zinc-850 px-2 pt-1 overflow-x-auto hide-scrollbar select-none">
        <div className="flex space-x-6 min-w-max h-10 items-end">
          {[
            { id: "overview", name: "Overview" },
            { id: "team", name: `Team (${project?.team_members?.length || 0})` },
            { id: "activity", name: `Activity (${timelineItems?.length || 0})` },
            ...(canManageProjectActions ? [{ id: "settings", name: "Settings" }] : []),
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative pb-2.5 text-xs font-semibold tracking-wide transition-colors outline-none cursor-pointer ${
                  isActive
                    ? "text-zinc-900 dark:text-zinc-50 font-bold"
                    : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-350"
                }`}
              >
                {tab.name}
                {isActive && (
                  <motion.div
                    layoutId="projectDetailTabLine"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950 dark:bg-zinc-5"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN GRID ────────────────────────────────────── */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left Column (Main Tab Content) */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 space-y-6">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Project Overview</h3>
                
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</h4>
                  <div className="text-xs leading-relaxed text-zinc-500 prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{project?.description}</ReactMarkdown>
                  </div>
                </div>

                {/* Dynamic Objectives list */}
                {getObjectives(project?.description).length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Objectives</h4>
                    <div className="space-y-2">
                      {getObjectives(project?.description).map((objective, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-500">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                          <span>{objective}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tech Stack Chips */}
                {project?.tags && project.tags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tech Stack</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-zinc-50 border border-zinc-150 text-zinc-700 dark:bg-zinc-850 dark:border-zinc-750 dark:text-zinc-300 text-[10px] px-2.5 py-0.5 rounded-lg font-medium"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Tasks Summary component */}
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Tasks Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 border border-zinc-150 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center">
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{projectTasks.length}</div>
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Total Tasks</div>
                  </div>
                  <div className="p-3 border border-zinc-150 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
                      {projectTasks.filter((t) => t.status === "completed").length}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Completed</div>
                  </div>
                  <div className="p-3 border border-zinc-150 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-500">
                      {projectTasks.filter((t) => t.status === "in-progress").length}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">In Progress</div>
                  </div>
                  <div className="p-3 border border-zinc-150 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center">
                    <div className="text-lg font-bold text-zinc-500">
                      {projectTasks.filter((t) => t.status === "todo").length}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Todo</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* TAB 2: TEAM */}
          {activeTab === "team" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-3">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Project Roles Overview</h3>
                  {canManageProjectActions && (
                    <ProjectMemberManagementDialog
                      open={isMemberDialogOpen}
                      onOpenChange={setIsMemberDialogOpen}
                      project={project || currentProject || null}
                      addingMember={addingMember}
                      creatingRole={creatingResource}
                      onAssignMember={handleAddTeamMember}
                      onCreateRole={handleCreateNewResource}
                      validateEmailForProject={async (email: string) => {
                        if (!project?._id) return false;
                        try {
                          const validation = await validateUserForProject(email, project._id);
                          if (!validation.exists || !validation.user) return false;
                          if (validation.is_already_in_current_project) return false;
                          return !isPrivilegedCompanyRole(
                            validation.user.company_subrole_raw || validation.user.company_subrole || validation.user.role
                          );
                        } catch {
                          return false;
                        }
                      }}
                      trigger={
                        <Button size="sm" variant="outline" className="rounded-xl border-zinc-200 text-xs font-semibold h-8 cursor-pointer hover:bg-zinc-50">
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add Member
                        </Button>
                      }
                    />
                  )}
                </div>

                {((project?.resources && project.resources.length > 0) ||
                  (currentProject?.resources && currentProject.resources.length > 0)) ? (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {(project?.resources || currentProject?.resources || []).map((resource, index) => {
                      const projectData = project || currentProject;
                      const assignedMember = Array.isArray(projectData?.team_members)
                        ? (projectData.team_members as FrontendTeamMember[]).find((m) => m.role === resource.profile)
                        : null;

                      return (
                        <div key={index} className="border border-zinc-250/60 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/40 dark:bg-zinc-950/10 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">{resource.profile}</span>
                            {resource.skills && resource.skills.length > 0 && (
                              <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                                Skills: {resource.skills.join(", ")}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            {assignedMember ? (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider block">Assigned</span>
                                  <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-350">{assignedMember.name}</p>
                                </div>
                                <Avatar className="h-7 w-7 border border-zinc-100">
                                  <AvatarImage src={assignedMember.avatar || "https://placehold.co/28/svg"} alt={assignedMember.name} />
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {assignedMember.name?.split(" ").map((n) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            ) : (
                              <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Available</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-400 text-xs">No project roles defined.</div>
                )}

                {/* Assigned Team Members detail list */}
                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <h4 className="text-xs font-semibold text-zinc-700">Assigned Team Members</h4>
                  {project?.team_members && project.team_members.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {project.team_members.map((member, index) => {
                        const isMe = member.email === mongoUser?.email || member.user === mongoUser?._id;
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border border-zinc-250/60 rounded-xl bg-white dark:bg-zinc-950/20">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar || "https://placehold.co/30/svg"} alt={member.name} />
                                <AvatarFallback className="text-xs font-semibold">
                                  {member.name?.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate">{member.name}</span>
                                  {isMe && (
                                    <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-50 border border-zinc-200/50 px-1 rounded">You</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-400 truncate">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md">
                                {member.role}
                              </Badge>
                              {canManageProjectActions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveTeamMember(member)}
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-zinc-200 rounded-xl">
                      <p className="text-xs text-zinc-400 font-medium">No team members assigned yet.</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* TAB 3: ACTIVITY */}
          {activeTab === "activity" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid gap-6 sm:grid-cols-2"
            >
              {/* Timeline Card */}
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Project Timeline</h3>
                <div className="space-y-4">
                  {timelineItems.length === 0 ? (
                    <div className="text-xs text-zinc-450 py-4">No activity logged yet.</div>
                  ) : (
                    timelineItems.map((event: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5 p-1 rounded-lg bg-zinc-50 dark:bg-zinc-850">
                          {getActivityIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{event.title}</p>
                          {event.description && (
                            <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">{event.description}</p>
                          )}
                          <span className="text-[9px] text-zinc-400 font-medium block mt-1">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Synced Commits Card */}
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Synced Commits</h3>
                {loadingSyncedCommits ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading commits...</span>
                  </div>
                ) : syncedCommitsError ? (
                  <div className="text-xs text-red-600 py-4">{syncedCommitsError}</div>
                ) : syncedCommits && syncedCommits.length > 0 ? (
                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 hide-scrollbar">
                    {syncedCommits.map((c) => (
                      <div key={String(c._id || c.commit_sha)} className="flex items-start justify-between gap-4 border-b border-zinc-50 dark:border-zinc-850 pb-2.5 last:border-b-0 last:pb-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{c.message || c.commit_sha}</p>
                          <p className="text-[10px] text-zinc-450 leading-relaxed mt-0.5">
                            {[c.author, c.repo, c.username].filter(Boolean).map(String).join(" • ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-450 py-4">No commits synced yet for this project.</div>
                )}
              </Card>
            </motion.div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === "settings" && canManageProjectActions && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 space-y-6">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Settings</h3>
                
                {/* Repository Settings */}
                <div className="space-y-2 border-b border-zinc-100 dark:border-zinc-850 pb-4">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">GitHub Connection</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Link a GitHub repository to track commits and synchronize checkmarks on task developments.
                  </p>
                  <div className="pt-2">
                    <Button
                      onClick={handleOpenRepoDialog}
                      variant="outline"
                      className="rounded-xl border-zinc-200 text-xs font-semibold cursor-pointer h-9 px-4"
                    >
                      <Github className="mr-1.5 h-3.5 w-3.5" />
                      {project?.github_repository ? "Change Repository" : "Link Repository"}
                    </Button>
                  </div>
                </div>

                {/* Edit Project details */}
                <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-850">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Project Detail Information</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Update the title, description, tags, deadline, status, progress, and other details of this project.
                  </p>
                  <div className="pt-2">
                    <Button 
                      onClick={() => {
                        setEditedProject(project);
                        setIsEditProjectOpen(true);
                      }} 
                      className="rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold h-9 px-5 flex items-center cursor-pointer"
                    >
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      Edit Project Details
                    </Button>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-red-600">Danger Zone</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Permanently delete this project, all associated tasks, board status, and developer progress trackers. This action is irreversible.
                  </p>
                  <div className="pt-2">
                    <Button onClick={handleDeleteProject} className="rounded-xl bg-red-650 hover:bg-red-750 text-white text-xs font-semibold h-9 px-4 cursor-pointer">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete Project
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column (Sidebar Cards) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Card 1: Team Members Preview */}
          <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-50 tracking-wide uppercase">Team Members</h3>
                <button
                  onClick={() => setActiveTab("team")}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-900 cursor-pointer"
                >
                  View all
                </button>
              </div>

              <div className="space-y-3.5">
                {project?.team_members && project.team_members.length > 0 ? (
                  project.team_members.slice(0, 4).map((member: any, index: number) => {
                    const isMe = member.email === mongoUser?.email || member.user === mongoUser?._id;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar || "https://placehold.co/30/svg"} alt={member.name} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {member.name?.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate leading-tight">{member.name}</span>
                            {isMe && (
                              <span className="text-[8px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200/50 px-1 rounded flex-shrink-0">You</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-450 leading-relaxed truncate">{member.role}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-zinc-400 py-2">No team members assigned yet.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Project Tags */}
          <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-50 tracking-wide uppercase">Project Tags</h3>
                {canManageProjectActions && (
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-900 cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {project?.tags && project.tags.length > 0 ? (
                  project.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] px-2.5 py-0.5 rounded-lg border-zinc-200 text-zinc-650 bg-white font-medium"
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <div className="text-xs text-zinc-400 py-1">No tags set.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Quick Actions */}
          <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-50 tracking-wide uppercase">Quick Actions</h3>
              
              <div className="divide-y divide-zinc-50 dark:divide-zinc-850">
                {/* Action 1: Generate Tasks */}
                {canManageProjectActions && (
                  <button
                    onClick={handleGenerateTasks}
                    disabled={generatingTasks || generatedTasksSaved}
                    className="w-full flex items-center justify-between py-2.5 text-left text-xs font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-350 dark:hover:text-zinc-50 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="flex items-center gap-2">
                      {generatingTasks ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-550" />
                      ) : (
                        <Brain className="h-4 w-4 text-zinc-500" />
                      )}
                      <span>{generatingTasks ? "Generating tasks..." : generatedTasksSaved ? "Generated Tasks Complete" : "Generate Tasks"}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                )}

                {/* Action 2: View Project Plan */}
                {(projectPlanExists || canManageProjectActions) && (
                  <Link
                    href={`/dashboard/projects/${project_id}/plan`}
                    className="w-full flex items-center justify-between py-2.5 text-left text-xs font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-350 dark:hover:text-zinc-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-zinc-500" />
                      <span>{projectPlanExists ? "View Project Plan" : "Generate Project Plan"}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                  </Link>
                )}

                {/* Action 3: Project Assessment */}
                {(assessmentExists || assessmentHelpers.isAssessmentExistsForProject(project_id) || canManageProjectActions) && (
                  <Link
                    href={`/dashboard/projects/${project_id}/assessment`}
                    className="w-full flex items-center justify-between py-2.5 text-left text-xs font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-350 dark:hover:text-zinc-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-500" />
                      <span>{assessmentExists || assessmentHelpers.isAssessmentExistsForProject(project_id) ? "Project Assessment" : "Create Assessment"}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                  </Link>
                )}

                {/* Action 4: Add Team Member */}
                {canManageProjectActions && (
                  <button
                    onClick={() => setIsMemberDialogOpen(true)}
                    className="w-full flex items-center justify-between py-2.5 text-left text-xs font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-350 dark:hover:text-zinc-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-500" />
                      <span>Add Team Member</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                )}

                {/* Action 5: Open Board */}
                <Link
                  href={`/dashboard/projects/${project_id}/board`}
                  className="w-full flex items-center justify-between py-2.5 text-left text-xs font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-350 dark:hover:text-zinc-50 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-zinc-500" />
                    <span>Open Board</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── PERSISTENT DIALOG BOUNDINGS (ROOT LEVEL) ────────────────── */}

      {/* Repository Selection Dialog */}
      <Dialog open={isRepoDialogOpen} onOpenChange={setIsRepoDialogOpen}>
        <DialogContent className="max-w-xl bg-white border border-zinc-250 rounded-2xl shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-wide uppercase">Link GitHub Repository</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              Select the repository you want to link to this project. This will be used for automated pull request checks.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 py-4 hide-scrollbar">
            {loadingRepos ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-900" />
                <p className="text-xs text-zinc-400">Fetching your repositories...</p>
              </div>
            ) : repos.length > 0 ? (
              repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => !linkingRepo && handleLinkRepo(repo.full_name)}
                  className="flex items-center justify-between p-3 border rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors border-zinc-200"
                >
                  <div className="flex items-center space-x-3">
                    <Github className="h-5 w-5 text-zinc-650" />
                    <div>
                      <h4 className="font-semibold text-xs text-zinc-900">{repo.name}</h4>
                      <p className="text-[10px] text-zinc-400">{repo.full_name}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-lg text-xs" disabled={linkingRepo}>
                    Select
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-zinc-400">No repositories found.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="bg-white border border-zinc-250 rounded-2xl shadow-lg p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-wide uppercase">Create New Task</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              Add a new task manually to this project board.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="task-title" className="text-xs font-semibold text-zinc-700">Title</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="rounded-xl border-zinc-200"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-description" className="text-xs font-semibold text-zinc-700">Description</Label>
              <Textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Enter task description..."
                className="rounded-xl border-zinc-200 p-3 leading-relaxed"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-due-date" className="text-xs font-semibold text-zinc-700">Due Date</Label>
              <DatePicker
                value={newTaskDueDate}
                onChange={(val) => setNewTaskDueDate(val)}
                placeholder="Select due date..."
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsTaskDialogOpen(false)}
              className="rounded-xl border-zinc-200 text-xs"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTask} className="rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs">Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Tasks Preview modal */}
      {canManageProjectActions && (
        <GeneratedTasksPreview
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          tasks={generatedPreviewTasks}
          onSave={handleSaveGeneratedTasks}
          project_id={project?._id || ""}
        />
      )}
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
                placeholder="Select deadline..."
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
  );
}
