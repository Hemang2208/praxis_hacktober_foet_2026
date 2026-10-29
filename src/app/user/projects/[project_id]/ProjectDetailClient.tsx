"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Award,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle,
  FolderKanban,
  ExternalLink,
  Check,
  Loader2,
  Plus,
  Send,
  Target,
  UserPlus,
  Trash2,
  Users,
  Github,
  MoreHorizontal,
  Edit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch, isQueueResponse, isQueueTimeoutResponse } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";

import { useProjects } from "@/hooks/useProjects";
import { useUserJoinedProjects } from "@/hooks/useUserJoinedProjects";
import { useTasks } from "@/hooks/useTasks";
import { useCachedProject } from "@/hooks/useCachedResources";
import { generateCertificate } from "@/utils/certificateGenerator";
import { useAppDispatch } from "@/redux/hooks";
import {
  BackendTeamMember,
  createTaskInBoard,
  fetchProjectBoard,
  fetchProjectById,
  FrontendTeamMember,
  linkProjectRepo,
  Project,
  updateProjectTeam,
  updateProject,
  deleteProject,
} from "@/redux/slice/project.slice";
import { Task } from "@/redux/slice/task.slice";
import { fetchTasksByProject } from "@/redux/slice/task.slice";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectDetailSkeleton } from "@/components/ui/project-skeleton";
import useUserProfile from "@/hooks/useUserProfile";
import {
  canManageCompanyProjects,
  formatCompanySubroleLabel,
  getViewerCompanySubrole,
} from "@/lib/company-rbac";
import ProjectMemberManagementDialog, {
  AssignMemberInput,
  CreateRoleInput,
} from "@/components/projects/ProjectMemberManagementDialog";
import {
  isPrivilegedCompanyRole,
  isResourceRoleOccupied,
  isRestrictedResourceRoleName,
  normalizeEmail,
  normalizeRoleKey,
} from "@/lib/project-member-rules";
import { projectBelongsToCompany } from "@/lib/project-ownership";

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
  message?: string;
};

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

export default function ProjectDetailsPage() {
  const params = useParams();
  const project_id = params.project_id as string;

  const { dispatch } = useProjects();
  const { getTasksForProject, loading: taskLoading } = useTasks();
  const { joinedProjects, hasJoinedAny } = useUserJoinedProjects();
  const router = useRouter();
  const { mongoUser: user, loading: profileLoading } = useUserProfile();
  const viewerRole = String((user as any)?.role ?? "").toLowerCase();
  const viewerCompanySubrole = getViewerCompanySubrole(user as any);
  const isCompanyViewer =
    viewerRole === "company" || Boolean(viewerCompanySubrole);
  const canManageProjectActions = canManageCompanyProjects(user as any);
  const companySubroleLabel = isCompanyViewer
    ? formatCompanySubroleLabel(viewerCompanySubrole ?? "trainee")
    : "";

  // Use cached project hook for normal detail caching
  const cachedProjectData = useCachedProject(project_id, {
    forceFresh: true,
  });
  const { project: cachedProject, loading: cachedLoading } = cachedProjectData;

  const validateUserForProject = useCallback(
    async (
      email: string,
      projectId: string,
    ): Promise<ValidateForProjectResponse> => {
      const response = await fetch(`/api/user/validate-for-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: normalizeEmail(email),
          project_id: projectId,
        }),
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
              "Unable to validate member for this project.",
          ),
        );
      }

      return payload;
    },
    [],
  );

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

  // Local state for UI and editing
  const [project, setProject] = useState<Project | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editedProject, setEditedProject] = useState<Project | null>(null);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    projectTasksRef.current = Array.isArray(projectTasks) ? projectTasks : [];
  }, [projectTasks]);
  type Member = {
    name?: string;
    full_name?: string;
    displayName?: string;
    role?: string;
    type?: string;
    user?: string;
    email?: string;
    username?: string;
    profile?: string;
    avatar?: string;
    profile_picture?: string;
    avatar_url?: string;
    image_url?: string;
  };
  const [externalMembers, setExternalMembers] = useState<Member[] | null>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generateTaskCount, setGenerateTaskCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(sessionStorage.getItem(`gen_task_count_${project_id}`) || 0);
  });
  const [projectPlanExists, setProjectPlanExists] = useState(false);
  const [checkingProjectPlan, setCheckingProjectPlan] = useState(false);

  // Synced GitHub commits (task-mgmt-agent)
  const [syncedCommits, setSyncedCommits] = useState<any[]>([]);
  const [loadingSyncedCommits, setLoadingSyncedCommits] = useState(false);
  const [syncedCommitsError, setSyncedCommitsError] = useState<string | null>(
    null,
  );

  // Repository selection state (for admins)
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [linkingRepo, setLinkingRepo] = useState(false);

  const fetchSyncedCommits = useCallback(
    async (signal?: AbortSignal) => {
      if (!project_id) return;
      try {
        setLoadingSyncedCommits(true);
        setSyncedCommitsError(null);
        const res = await fetch(
          `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/commits?limit=50&t=${Date.now()}`,
          {
            signal,
            cache: "no-store",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Failed to load commits: ${res.status} ${text}`);
        }
        const data = await res.json().catch(() => null);
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.commits)
            ? (data as any).commits
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
        setSyncedCommits(
          [...(list as any[])].sort((a, b) => toMs(b) - toMs(a)),
        );
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        setSyncedCommitsError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingSyncedCommits(false);
      }
    },
    [project_id],
  );

  const extractGitHubUsername = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)/);
    return match ? match[1] : null;
  };

  const handleOpenRepoDialog = async () => {
    const owner = user?.socialLinks?.github
      ? extractGitHubUsername(user.socialLinks.github)
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
      !window.confirm(
        "Are you sure you want to delete this project? This will delete all tasks and plan associated with it. This action cannot be undone.",
      )
    ) {
      return;
    }

    const loadingToast = toast.loading("Deleting project...");

    try {
      await dispatch(deleteProject(project._id)).unwrap();
      toast.success("Project deleted successfully!", { id: loadingToast });
      router.push("/user/projects");
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete project",
        { id: loadingToast },
      );
    }
  };

  // Access control check: if trainee user has joined specific projects, prevent viewing other projects
  // Skip this check for admins/owners/company members - let the API enforce permissions
  useEffect(() => {
    // Don't check until profile is loaded
    if (profileLoading || !user || !project_id) {
      return;
    }

    console.log("[AccessControl] Checking access with:", {
      role: (user as any)?.role,
      subrole: (user as any)?.subrole,
      hasActiveCompanyMembership: !!(user as any)?.activeCompanyMembership,
      companySubrole: (user as any)?.activeCompanyMembership?.subrole,
      isCompanyViewer,
      canManageProjectActions,
      joinedCount: joinedProjects.length,
    });

    // BYPASS 1: If user has activeCompanyMembership, they are a company user
    // Let the API enforce permissions - don't block here
    if ((user as any)?.activeCompanyMembership) {
      console.log(
        "[AccessControl] ✅ Allowing company user access to view project (API will validate)",
      );
      return;
    }

    // BYPASS 2: If user can manage company projects (admin/owner via RBAC)
    if (canManageProjectActions) {
      console.log(
        "[AccessControl] ✅ Allowing access: canManageProjectActions",
      );
      return;
    }

    // BYPASS 3: If user has no joined projects yet, don't restrict
    if (!hasJoinedAny) {
      console.log("[AccessControl] ✅ Allowing access: no joined projects yet");
      return;
    }

    // ENFORCEMENT: For users with joined projects, only allow access to those projects
    const toComparableId = (value: unknown) => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object" && value !== null) {
        const maybeObject = value as Record<string, unknown>;
        if (typeof maybeObject.$oid === "string") return maybeObject.$oid;
      }
      return String(value);
    };

    const requestedProjectId = toComparableId(project_id);
    const isCurrentProjectJoined = joinedProjects.some(
      (joined) => toComparableId(joined._id) === requestedProjectId,
    );

    if (!isCurrentProjectJoined) {
      // SECONDARY CHECK: Allow company admin/owner access to company projects they're not a direct member of
      const userCompanyId = (user as any)?.activeCompanyMembership?.companyId;
      const userCompanySubrole = (user as any)?.activeCompanyMembership
        ?.subrole;
      const isAdminOrOwner =
        userCompanySubrole === "admin" || userCompanySubrole === "owner";
      const projectCompanyId = project?.companyId;

      const canAccessAsCompanyAdmin =
        Boolean(userCompanyId) &&
        Boolean(projectCompanyId) &&
        userCompanyId === projectCompanyId &&
        isAdminOrOwner;

      if (canAccessAsCompanyAdmin) {
        console.log(
          "[AccessControl] ✅ Allowing company admin access to company project",
          {
            requestedProjectId,
            userCompanyId,
            projectCompanyId,
            userCompanySubrole,
          },
        );
        return;
      }

      console.log(
        "[AccessControl] ❌ Blocking: User not a member of this project",
        {
          requestedProjectId,
          userProjects: joinedProjects.map((jp) => toComparableId(jp._id)),
          projectCompanyId,
          userCompanyId,
          isAdminOrOwner,
        },
      );
      toast.error(
        "You can only view details of the project you've joined. Please go back to the projects list.",
      );
      router.push("/user/projects");
    }
  }, [
    hasJoinedAny,
    isCompanyViewer,
    canManageProjectActions,
    joinedProjects,
    project_id,
    router,
    profileLoading,
    user,
    project,
  ]);

  // Calculate project progress and task stats after project is loaded
  const [projectProgress, setProjectProgress] = useState(0);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("planning");
  const [userProgressDescription, setuserProgressDescription] =
    useState("0 tasks completed");

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

  // Type guard for Task
  function isTask(obj: unknown): obj is Task {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "status" in obj &&
      typeof (obj as Task).status === "string"
    );
  }

  // Ref to prevent duplicate statistics fetches within a time window
  const lastStatisticsFetchRef = useRef<number>(0);
  const STATISTICS_FETCH_DEBOUNCE_MS = 2000; // Min time between fetches

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
      setuserProgressDescription(
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
          `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/statistics?t=${Date.now()}`,
          {
            cache: "no-store",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          },
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
        // Fallbacks below
        console.warn("Failed to load task-mgmt progress; falling back", err);
      }

      // Fallback 1: compute from whatever tasks we have locally (best-effort)
      const reduxTasks: Task[] = Array.isArray(projectTasksRef.current)
        ? (projectTasksRef.current as unknown[]).filter(isTask)
        : [];

      const embeddedTasks: Task[] =
        projectRef.current && Array.isArray(projectRef.current.tasks)
          ? (projectRef.current.tasks as unknown[]).filter(isTask)
          : [];

      const tasksToUse = reduxTasks.length > 0 ? reduxTasks : embeddedTasks;
      const total = tasksToUse.length;
      const completed = tasksToUse.filter(
        (t) => t.status === "completed",
      ).length;
      const inProgress = tasksToUse.filter(
        (t) => t.status === "in-progress",
      ).length;
      const blocked = tasksToUse.filter((t) => t.status === "blocked").length;

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

    // Debounce: only fetch if enough time has passed since last fetch
    const now = Date.now();
    if (now - lastStatisticsFetchRef.current < STATISTICS_FETCH_DEBOUNCE_MS) {
      return;
    }
    lastStatisticsFetchRef.current = now;

    void fetchProgressFromTaskMgmt();

    return () => {
      cancelled = true;
    };
  }, [project_id, coerceProgressValue]);

  // Required members come from planner resources for preview mode.
  const requiredResources = Array.isArray(project?.resources)
    ? project.resources.filter((resource) => {
        const role = String(resource?.type ?? "").trim();
        const profile = String(resource?.profile ?? "").trim();
        return role.length > 0 || profile.length > 0;
      })
    : [];

  const requiredRoleCounts = requiredResources.reduce(
    (acc, resource) => {
      const rawRole =
        String(resource?.type ?? "").trim() ||
        String(resource?.profile ?? "").trim() ||
        "Team Member";
      const normalizedRole = rawRole
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      acc[normalizedRole] = (acc[normalizedRole] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const requiredRoleEntries = Object.entries(requiredRoleCounts).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const requiredRoleDetails = requiredResources.map((resource, index) => {
    const role = String(resource?.profile ?? "").trim() || "Team Member";
    const description =
      String(resource?.description ?? "").trim() || "Required for this project";
    const experience = String(resource?.experience ?? "").trim() || "1";
    const skills =
      String(resource?.skills?.join?.(", ") ?? "").trim() ||
      "No skills specified";

    return {
      key: `${role}-${index}`,
      role,
      description,
      experience,
      skills,
    };
  });

  const requiredMembersCount = requiredResources.length;

  const isOwnerLikeMember = useCallback(
    (member: Partial<Member & FrontendTeamMember>) => {
      const normalizedRole = String(member?.role ?? "")
        .trim()
        .toLowerCase();
      const normalizedType = String(member?.type ?? "")
        .trim()
        .toLowerCase();
      const normalizedName = String(
        member?.name ?? member?.full_name ?? member?.displayName ?? "",
      )
        .trim()
        .toLowerCase();

      return (
        normalizedType === "owner" ||
        normalizedRole === "owner" ||
        normalizedRole === "project owner" ||
        normalizedName === "project owner"
      );
    },
    [],
  );

  const assignedTeamMembers = useMemo(() => {
    const source = Array.isArray(project?.team_members)
      ? project.team_members
      : [];
    const seen = new Set<string>();

    return source
      .filter((member, index) => {
        if (!member || isOwnerLikeMember(member as any)) {
          return false;
        }

        const email = String((member as any)?.email ?? "")
          .trim()
          .toLowerCase();
        const userId = String((member as any)?.user ?? "").trim();
        const name = String((member as any)?.name ?? "").trim();

        if (!email && !userId && !name) {
          return false;
        }

        const dedupeKey = email
          ? `email:${email}`
          : userId
            ? `user:${userId}`
            : `name:${name.toLowerCase()}-${index}`;

        if (seen.has(dedupeKey)) {
          return false;
        }

        seen.add(dedupeKey);
        return true;
      })
      .map((member) => ({
        ...(member as FrontendTeamMember),
        role: String((member as any)?.role ?? "").trim() || "Team Member",
      }));
  }, [project?.team_members, isOwnerLikeMember]);

  // Team members count should reflect only actually assigned members.
  const teamCount = assignedTeamMembers.length;

  // Handle certificate download (client-only)
  const handleDownloadCertificate = () => {
    if (!user || !project) {
      toast.error(
        "Unable to generate certificate. User or project data not available.",
      );
      return;
    }
    // Only run on client after project is loaded
    try {
      generateCertificate(
        {
          full_name: user.full_name,
          email: user.email,
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

  const handleCreateProjectRole = async (input: CreateRoleInput) => {
    if (!project?._id || !canManageProjectActions) return;

    const roleProfile = String(input.profile).trim();
    if (!roleProfile) {
      toast.error("Enter a role/profile name first.");
      return;
    }

    if (isRestrictedResourceRoleName(roleProfile)) {
      toast.error(
        "Admin/Owner roles are managed implicitly and cannot be added as project resources.",
      );
      return;
    }

    const duplicateRole = (project.resources || []).some(
      (resource) =>
        normalizeRoleKey(resource?.profile) === normalizeRoleKey(roleProfile),
    );

    if (duplicateRole) {
      toast.error("This role already exists in project requirements.");
      return;
    }

    const loadingToast = toast.loading("Creating role...");
    setCreatingRole(true);

    try {
      const nextRole = {
        profile: roleProfile,
        skills: Array.isArray(input.skills) ? input.skills : [],
        experience: String(input.experience || "").trim() || "1",
        description:
          String(input.description || "").trim() ||
          "Role requirement for this project",
        type: roleProfile,
      };

      const patchRes = await fetch(`/api/project/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          resources: [...(project.resources || []), nextRole],
        }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text().catch(() => "");
        throw new Error(errText || "Failed to create project role");
      }

      const patched = await patchRes.json().catch(() => ({}));
      const updatedProject = (patched?.project || patched) as Project;
      setProject(updatedProject);

      toast.success("Role created. Now assign a member.", {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Failed to create project role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create role",
        { id: loadingToast },
      );
    } finally {
      setCreatingRole(false);
    }
  };

  const handleAddTeamMember = async ({
    email,
    roleProfile,
  }: AssignMemberInput) => {
    if (!project?._id || !canManageProjectActions) return;

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("Enter a valid member email");
      return;
    }

    if (!roleProfile) {
      toast.error("Select a role before assigning a member.");
      return;
    }

    const selectedResource = (project.resources || []).find(
      (resource) =>
        normalizeRoleKey(resource?.profile) === normalizeRoleKey(roleProfile),
    );

    if (!selectedResource) {
      toast.error("Selected role was not found. Create/select role again.");
      return;
    }

    if (
      isResourceRoleOccupied(
        project.team_members as FrontendTeamMember[] | undefined,
        selectedResource.profile,
      )
    ) {
      toast.error(`The ${selectedResource.profile} role is already assigned.`);
      return;
    }

    const existingEmails = (project.team_members || [])
      .map((member: any) =>
        String(member?.email || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);

    if (existingEmails.includes(normalizedEmail)) {
      toast.error("This member is already in the project");
      return;
    }

    const loadingToast = toast.loading("Adding member...");
    setAddingMember(true);

    try {
      const validation = await validateUserForProject(
        normalizedEmail,
        project._id,
      );
      if (!validation.exists || !validation.user) {
        throw new Error(validation.message || "User not found in the platform");
      }

      if (validation.is_already_in_current_project) {
        throw new Error(
          validation.message || "This user already has access to this project.",
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

      if (validation.is_assigned_to_other_active_project) {
        throw new Error(
          validation.message ||
            "This user is already assigned to another active project.",
        );
      }

      const serverUser = validation.user;
      const serverUserId = String(serverUser?.user_id || "").trim();
      if (!serverUserId)
        throw new Error("Could not link this email to a user account");

      await fetch(`/api/project/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: project._id,
          email: normalizedEmail,
          role: selectedResource.profile,
        }),
      });

      const frontendMember: FrontendTeamMember = {
        name:
          String(serverUser?.name || "").trim() ||
          normalizedEmail.split("@")[0],
        avatar: String(serverUser?.profile_picture || ""),
        email: normalizedEmail,
        role: selectedResource.profile,
        user: serverUserId,
        username: normalizedEmail.split("@")[0],
      };

      const backendMember: BackendTeamMember = {
        user: serverUserId,
        role: selectedResource.profile,
      };

      const updatedTeamMembers: FrontendTeamMember[] = Array.isArray(
        project.team_members,
      )
        ? [...project.team_members, frontendMember]
        : [frontendMember];

      const updatedBackendTeam: BackendTeamMember[] = Array.isArray(
        project.team,
      )
        ? [...project.team, backendMember]
        : [backendMember];

      const patchRes = await fetch(`/api/project/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          team: updatedBackendTeam,
          team_members: updatedTeamMembers,
        }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text().catch(() => "");
        throw new Error(errText || "Failed to persist member changes");
      }

      setProject((prev) =>
        prev
          ? ({
              ...prev,
              team_members: updatedTeamMembers,
              team: updatedBackendTeam,
            } as Project)
          : prev,
      );

      setExternalMembers((prev) => {
        const nextMember: Member = {
          name: frontendMember.name,
          email: frontendMember.email,
          avatar: frontendMember.avatar,
          username: frontendMember.username,
        };

        if (!Array.isArray(prev) || prev.length === 0) return [nextMember];
        return [...prev, nextMember];
      });

      setIsMemberDialogOpen(false);

      toast.success("Team member added successfully", { id: loadingToast });
    } catch (error) {
      console.error("Failed to add team member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add team member",
        { id: loadingToast },
      );
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveTeamMember = async (email: string) => {
    if (!project?._id || !canManageProjectActions) return;
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the project?",
    );
    if (!confirmed) return;

    const loadingToast = toast.loading("Removing member...");

    try {
      const updatedTeamMembers = (project.team_members || []).filter(
        (member: any) =>
          String(member?.email || "")
            .trim()
            .toLowerCase() !== normalizedEmail,
      );

      const removedMember = (project.team_members || []).find(
        (member: any) =>
          String(member?.email || "")
            .trim()
            .toLowerCase() === normalizedEmail,
      );

      const removedUserId = String(removedMember?.user || "").trim();
      const updatedBackendTeam = (project.team || []).filter(
        (member: any) => String(member?.user || "").trim() !== removedUserId,
      );

      const patchRes = await fetch(`/api/project/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          team: updatedBackendTeam,
          team_members: updatedTeamMembers,
        }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text().catch(() => "");
        throw new Error(errText || "Failed to persist member removal");
      }

      await fetch(`/api/project/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: project._id,
          email: normalizedEmail,
        }),
      }).catch(() => null);

      setProject((prev) =>
        prev
          ? ({
              ...prev,
              team_members: updatedTeamMembers,
              team: updatedBackendTeam,
            } as Project)
          : prev,
      );

      setExternalMembers((prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.filter(
          (member) =>
            String(member?.email || "")
              .trim()
              .toLowerCase() !== normalizedEmail,
        );
      });

      toast.success("Team member removed", { id: loadingToast });
    } catch (error) {
      console.error("Failed to remove team member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove team member",
        { id: loadingToast },
      );
    }
  };

  // Initialize project data from cache
  useEffect(() => {
    if (cachedProject && !project) {
      setProject(cachedProject);
      // Optionally fetch tasks if not included
      if (!cachedProject.tasks) {
        dispatch(fetchTasksByProject(project_id));
      }
    }
  }, [cachedProject, project_id, dispatch, project]);

  // Remove merging Redux state into local project state to avoid stale/missing data

  // Fetch external team members from the task-mgmt-agent API and show them
  useEffect(() => {
    let cancelled = false;

    async function fetchExternalMembers() {
      if (!project_id) return;
      try {
        const res = await fetch(
          `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/members`,
          {
            credentials: "include",
          },
        );

        if (!res.ok) {
          console.warn("Failed to fetch external members:", res.status);
          return;
        }

        const data = await res.json().catch(() => null);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.members)
            ? data.members
            : [];
        if (!cancelled) setExternalMembers(list as Member[]);
      } catch (err) {
        console.warn("Error fetching external members:", err);
      }
    }

    fetchExternalMembers();

    return () => {
      cancelled = true;
    };
  }, [project_id]);

  // Fetch synced commits (if any) from task-mgmt-agent to display in Synced Commits card
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

  // Check if a project plan already exists for this project.
  useEffect(() => {
    if (!project_id || !canManageProjectActions) {
      setProjectPlanExists(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setCheckingProjectPlan(true);
      try {
        const res = await fetch(
          `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/plan`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        if (!res.ok) {
          if (!cancelled) setProjectPlanExists(false);
          return;
        }

        const data = await res.json().catch(() => null);
        const planObj = data?.plan || data?.project || data || null;
        const hasPlan = Boolean(
          planObj &&
          typeof planObj === "object" &&
          (Object.keys(planObj as Record<string, unknown>).length > 0 ||
            Boolean((planObj as Record<string, unknown>).summary)),
        );

        if (!cancelled) {
          setProjectPlanExists(hasPlan);
        }
      } catch {
        if (!cancelled) setProjectPlanExists(false);
      } finally {
        if (!cancelled) setCheckingProjectPlan(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [project_id, canManageProjectActions]);

  const timelineItems = (() => {
    const plannerTimeline = Array.isArray((project as any)?.timeline)
      ? ((project as any).timeline as Array<any>)
      : [];

    // Prefer deriving timeline from task progress so Timeline updates with the board.
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

    // Fallback: planner timeline (if provided) when there are no tasks yet.
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

  // Determine if current user is already part of the project's team members
  const isCurrentUserTeamMember = (() => {
    const members = project?.team_members as
      | Array<{ email?: string; user?: string }>
      | undefined;
    if (!user || !members || members.length === 0) return false;
    const currentUserEmail =
      typeof user.email === "string" ? user.email.toLowerCase() : null;
    const currentuser_id = typeof user?._id === "string" ? user._id : null;
    return members.some((member) => {
      if (
        member?.email &&
        currentUserEmail &&
        String(member.email).toLowerCase() === currentUserEmail
      ) {
        return true;
      }
      if (
        member?.user &&
        currentuser_id &&
        String(member.user) === currentuser_id
      ) {
        return true;
      }
      return false;
    });
  })();

  // Determine if current user has joined the project (from useUserJoinedProjects)
  const isUserJoined = (() => {
    if (!hasJoinedAny || joinedProjects.length === 0 || !project_id) {
      return false;
    }

    const toComparableId = (value: unknown) => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object" && value !== null) {
        const maybeObject = value as Record<string, unknown>;
        if (typeof maybeObject.$oid === "string") return maybeObject.$oid;
      }
      return String(value);
    };

    const requestedProjectId = toComparableId(project_id);
    return joinedProjects.some(
      (joined) => toComparableId(joined._id) === requestedProjectId,
    );
  })();

  // Get assessments from project data (Redux cached)
  // Assessments may come from project data or be fetched dynamically
  const assessments = Array.isArray((project as any)?.assessments)
    ? ((project as any).assessments as Array<any>)
    : [];
  const hasAssessments = assessments.length > 0;

  // APPLY Button state
  const canAccessWorkspace = canManageProjectActions || isUserJoined;
  const canOpenBoard = isUserJoined || canManageProjectActions;
  const isApplyButtonDisabled = !hasAssessments || canAccessWorkspace;

  // Determine if we show the detailed project view (joined users or owner/admin)
  const showDetailedProjectView = canAccessWorkspace;

  // Handler for Apply button - Route to assessment rules page
  const handleApply = () => {
    router.push(`/user/projects/${project_id}/assessment`);
  };

  const handleGenerateTasksForAdmin = async () => {
    if (!project?._id || !canManageProjectActions) return;

    setGeneratingTasks(true);
    const loadingToast = toast.loading("Generating tasks...");

    const normalizeStatus = (value: unknown) => {
      const status = String(value || "")
        .trim()
        .toLowerCase();
      if (status === "in progress" || status === "in_progress") {
        return "in-progress";
      }
      if (
        status === "todo" ||
        status === "in-progress" ||
        status === "completed" ||
        status === "blocked" ||
        status === "submitted"
      ) {
        return status;
      }
      return "todo";
    };

    const coerceDueDate = (rawDate: unknown) => {
      const fallback = project?.deadline;
      const candidate = rawDate || fallback;
      if (!candidate) return "";

      const date = new Date(String(candidate));
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString();
    };

    try {
      const token = await fastAPIAuthService.getAccessToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/generate-tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          credentials: "include",
        },
        { maxPollAttempts: 60, pollIntervalMs: 2000 },
      );

      if (isQueueTimeoutResponse(res)) {
        toast.success("Task generation is in progress. Please wait a moment and refresh the page.", { id: loadingToast });
        return;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(
          errText || `Failed to generate tasks (status ${res.status})`,
        );
      }

      const payload = await res.json().catch(() => null);

      if (isQueueResponse(payload)) {
        toast.success("Task generation is in progress. Please wait a moment and refresh the page.", { id: loadingToast });
        return;
      }
      const generatedTasks = Array.isArray(payload?.tasks)
        ? payload.tasks
        : Array.isArray(payload?.generatedTasks)
          ? payload.generatedTasks
          : Array.isArray(payload)
            ? payload
            : [];

      if (generatedTasks.length === 0) {
        throw new Error("No tasks were generated");
      }

      let success = 0;
      let failed = 0;

      for (const task of generatedTasks as Array<Record<string, unknown>>) {
        const title = String(
          task?.title || task?.task_name || task?.name || "",
        ).trim();
        const due_date = coerceDueDate(task?.due_date);

        if (!title || !due_date) {
          failed += 1;
          continue;
        }

        const rawSubTasks = Array.isArray(task?.sub_tasks)
          ? task.sub_tasks
          : [];

        try {
          await dispatch(
            createTaskInBoard({
              project_id: project._id,
              title,
              description: String(task?.description || task?.body || ""),
              priority: String(task?.priority || "medium").toLowerCase() as
                | "high"
                | "medium"
                | "low"
                | "critical",
              status: normalizeStatus(task?.status),
              due_date,
              tags: Array.isArray(task?.tags) ? (task.tags as string[]) : [],
              sub_tasks: rawSubTasks.map((subtask) => ({
                title: String((subtask as any)?.title || "Subtask").trim(),
                description: String((subtask as any)?.description || ""),
                completed: Boolean((subtask as any)?.completed),
              })),
            }),
          ).unwrap();
          success += 1;
        } catch {
          failed += 1;
        }
      }

      if (success > 0) {
        dispatch(fetchProjectBoard(project._id));
        dispatch(fetchTasksByProject(project_id));

        // Refetch statistics so the progress card updates immediately
        try {
          const statsRes = await fetch(
            `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/statistics?t=${Date.now()}`,
            { cache: "no-store", credentials: "include" },
          );
          if (statsRes.ok) {
            const statsData = await statsRes.json().catch(() => null);
            if (statsData) {
              const progressPct = coerceProgressValue(
                statsData?.completion_percentage ??
                  statsData?.progress ??
                  statsData?.project?.progress,
              );
              const total =
                typeof statsData?.total_tasks === "number"
                  ? statsData.total_tasks
                  : typeof statsData?.totalTasks === "number"
                    ? statsData.totalTasks
                    : 0;
              const completed =
                typeof statsData?.completed_tasks === "number"
                  ? statsData.completed_tasks
                  : typeof statsData?.completedTasks === "number"
                    ? statsData.completedTasks
                    : 0;
              const inProgress =
                typeof statsData?.in_progress_tasks === "number"
                  ? statsData.in_progress_tasks
                  : typeof statsData?.inProgressTasks === "number"
                    ? statsData.inProgressTasks
                    : 0;
              const blocked =
                typeof statsData?.blocked_tasks === "number"
                  ? statsData.blocked_tasks
                  : typeof statsData?.blockedTasks === "number"
                    ? statsData.blockedTasks
                    : 0;

              const safeTotal = Math.max(0, total);
              const safeCompleted = Math.max(0, Math.min(completed, safeTotal));
              const rounded = Math.round(progressPct);
              setProjectProgress(rounded);
              setProjectStatus(
                deriveProjectStatusFromCounts({
                  total: safeTotal,
                  completed: safeCompleted,
                  inProgress,
                  blocked,
                }),
              );
              setuserProgressDescription(
                safeTotal > 0
                  ? `${safeCompleted}/${safeTotal} tasks completed`
                  : "0 tasks completed",
              );
            }
          }
        } catch (statsErr) {
          console.warn("Failed to refetch statistics after generation:", statsErr);
        }

        // Track generation count to disable button after limit
        const newCount = generateTaskCount + 1;
        setGenerateTaskCount(newCount);
        try { sessionStorage.setItem(`gen_task_count_${project_id}`, String(newCount)); } catch {}
      }

      if (success === 0) {
        throw new Error("Generated tasks could not be created");
      }

      const message =
        failed > 0
          ? `Generated ${success} tasks (${failed} skipped).`
          : `Generated ${success} tasks.`;

      toast.success(message, { id: loadingToast });
    } catch (error) {
      console.error("Failed to generate tasks:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate tasks",
        { id: loadingToast },
      );
    } finally {
      setGeneratingTasks(false);
    }
  };

  // Show skeleton while loading
  if (cachedLoading && !project) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Project not found or failed to load
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Please check your authentication, project ID, or try again later.
            <br />
            See console for error details.
          </p>
          <Button asChild className="mt-4">
            <Link href="/user/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full bg-transparent text-zinc-950 dark:text-[#F5F5F5]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 border-b border-zinc-200/60 dark:border-[#1E1F23] pb-4"
      >
        <div className="w-full">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-950 dark:text-[#F5F5F5] break-words">
              {project?.title}
            </h1>
            <Badge variant="outline" className={getStatusColor(projectStatus)}>
              {projectStatus.replace("-", " ")}
            </Badge>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          {canOpenBoard && (
            <Button asChild size="sm" className="flex-1 sm:flex-none bg-zinc-950 hover:bg-zinc-800 dark:bg-[#16A34A] dark:hover:bg-[#22C55E] text-white border-none font-semibold text-xs rounded-xl h-9 px-4">
              <Link href={`/user/projects/${project_id}/board`}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Board
              </Link>
            </Button>
          )}

          {canManageProjectActions && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] text-zinc-900 dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] font-semibold text-xs rounded-xl h-9 px-4"
            >
              <Link href={`/user/projects/${project_id}/plan`}>
                {checkingProjectPlan ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                {projectPlanExists ? "View Plan" : "Project Plan"}
              </Link>
            </Button>
          )}

          {canManageProjectActions && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateTasksForAdmin}
              disabled={generatingTasks || generateTaskCount >= 2}
              className="flex-1 sm:flex-none border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] text-zinc-900 dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] font-semibold text-xs rounded-xl h-9 px-4"
            >
              {generatingTasks ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : generateTaskCount >= 2 ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Target className="mr-2 h-4 w-4" />
              )}
              {generatingTasks
                ? "Generating..."
                : generateTaskCount >= 2
                  ? "Tasks Generated"
                  : "Generate Tasks"}
            </Button>
          )}

          {(canManageProjectActions || hasAssessments) && (
            <Button
              asChild
              size="sm"
              className="flex-1 sm:flex-none bg-zinc-950 hover:bg-zinc-800 dark:bg-[#16A34A] dark:hover:bg-[#22C55E] text-white border-none font-semibold text-xs rounded-xl h-9 px-4"
            >
              <Link
                href={
                  canManageProjectActions
                    ? `/user/projects/${project_id}/assessment/manage`
                    : `/user/projects/${project_id}/assessment`
                }
              >
                {hasAssessments ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-white" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                {canManageProjectActions ? "Assessment" : "View Assessment"}
              </Link>
            </Button>
          )}

          {canManageProjectActions && (
            <ProjectMemberManagementDialog
              open={isMemberDialogOpen}
              onOpenChange={setIsMemberDialogOpen}
              project={project}
              addingMember={addingMember}
              creatingRole={creatingRole}
              onAssignMember={handleAddTeamMember}
              onCreateRole={handleCreateProjectRole}
              validateEmailForProject={async (email: string) => {
                if (!project?._id) return false;
                try {
                  const validation = await validateUserForProject(
                    email,
                    project._id,
                  );
                  if (!validation.exists || !validation.user) return false;
                  if (validation.is_already_in_current_project) return false;

                  return !isPrivilegedCompanyRole(
                    validation.user.company_subrole_raw ||
                      validation.user.company_subrole ||
                      validation.user.role,
                  );
                } catch {
                  return false;
                }
              }}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] text-zinc-900 dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] font-semibold text-xs rounded-xl h-9 px-4"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              }
            />
          )}

          {canManageProjectActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] text-zinc-900 dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] rounded-xl"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-[#111214] border border-zinc-250/60 dark:border-[#1E1F23] rounded-xl shadow-md p-1 min-w-44">
                {project?.github_repository &&
                project.github_repository.includes("/") ? (
                  <DropdownMenuItem
                    className="text-xs rounded-lg cursor-pointer flex items-center py-2 dark:text-[#F5F5F5] dark:hover:bg-[#17181C]"
                    onClick={() => {
                      window.open(
                        `https://github.com/${project.github_repository}`,
                        "_blank",
                      );
                    }}
                  >
                    <Github className="mr-2 h-3.5 w-3.5 text-zinc-500 dark:text-[#71717A]" />
                    View on GitHub
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleOpenRepoDialog} className="text-xs rounded-lg cursor-pointer flex items-center py-2 dark:text-[#F5F5F5] dark:hover:bg-[#17181C]">
                    <ExternalLink className="mr-2 h-3.5 w-3.5 text-zinc-550 dark:text-[#71717A]" />
                    Link Repository
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    setEditedProject(project);
                    setIsEditProjectOpen(true);
                  }}
                  className="text-xs rounded-lg cursor-pointer flex items-center py-2 dark:text-[#F5F5F5] dark:hover:bg-[#17181C]"
                >
                  <Edit className="mr-2 h-3.5 w-3.5 text-zinc-550 dark:text-[#71717A]" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-[#1E1F23]" />
                <DropdownMenuItem
                  className="text-xs rounded-lg cursor-pointer text-red-650 dark:text-red-400 flex items-center py-2 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={handleDeleteProject}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!canAccessWorkspace && !isCurrentUserTeamMember && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleApply}
              disabled={isApplyButtonDisabled}
              className="flex-1 sm:flex-none"
              title={
                !hasAssessments
                  ? "Apply for this project"
                  : isUserJoined
                    ? "You have already joined this project"
                    : ""
              }
            >
              <span>Apply</span>
              <Send className="ml-2 h-4 w-4" />
            </Button>
          )}

          {/* {isUserJoined && projectProgress >= 97 && (
            <Button
              onClick={handleDownloadCertificate}
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
            >
              <Award className="mr-2 h-3 w-3" />
              Certificate
            </Button>
          )} */}

          {isCompanyViewer && (
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-slate-700"
            >
              {companySubroleLabel}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Stats Cards - show for joined students and company viewers */}
      {showDetailedProjectView && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Progress",
              value: `${projectProgress}%`,
              description: userProgressDescription,
              icon: BarChart3,
              color:
                projectProgress >= 97 ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400",
              bgColor: projectProgress >= 97 ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40" : "bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40",
            },
            {
              title: "Team Members",
              value: String(teamCount || "0"),
              description: "Active contributors",
              icon: Users,
              color: "text-emerald-600 dark:text-emerald-400",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40",
            },
            {
              title: "Days Remaining",
              value: Math.max(
                0,
                Math.ceil(
                  (new Date(project?.deadline).getTime() -
                    new Date().getTime()) /
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
                ? "text-rose-600 dark:text-rose-400"
                : "text-rose-600 dark:text-rose-400",
              bgColor: projectTasks?.some(
                (task: Task) =>
                  typeof task === "object" &&
                  "due_date" in task &&
                  "status" in task &&
                  task.status !== "completed" &&
                  task.due_date &&
                  new Date(task.due_date) < new Date(),
              )
                ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40"
                : "bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-3">
                  <CardTitle className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-3xl font-extrabold text-zinc-950 dark:text-[#F5F5F5] leading-none tabular-nums">
                    {stat.value}
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-[#71717A] mt-2 font-medium">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Content - Different layout for joined vs non-joined users */}
      {showDetailedProjectView ? (
        // Full content for joined users
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Project Overview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="space-y-6">
              <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-6 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg font-bold text-zinc-950 dark:text-[#F5F5F5]">Project Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="font-semibold text-xs text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider mb-2">Description</h4>
                    <div className="prose prose-sm max-w-none text-zinc-800 dark:text-[#F5F5F5] dark:prose-invert">
                      <ReactMarkdown>{project?.description}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Technologies */}
                  <div>
                    <h4 className="font-semibold text-xs text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider mb-2">
                      Technologies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {project?.tags?.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-zinc-100 dark:bg-[#17181C] text-zinc-800 dark:text-[#F5F5F5] border border-zinc-200 dark:border-[#26272B] font-medium px-3 py-1 text-xs rounded-full"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timeline */}
                <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-zinc-950 dark:text-[#F5F5F5]">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-4">
                      {timelineItems.length === 0 ? (
                        <div className="text-xs text-zinc-400 dark:text-[#71717A]">
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
                                <p className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">
                                  {event.title}
                                </p>
                                {event.description ? (
                                  <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1">
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
                <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-bold text-zinc-950 dark:text-[#F5F5F5]">Synced Commits</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingSyncedCommits ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-[#71717A]">
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        Loading synced commits...
                      </div>
                    ) : syncedCommitsError ? (
                      <div className="text-xs text-rose-500">
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
                              <div className="font-medium text-xs text-zinc-900 dark:text-[#F5F5F5]">
                                {c.message || c.commit_sha}
                              </div>
                              <div className="text-[11px] text-zinc-400 dark:text-[#71717A] mt-0.5">
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
                      <div className="text-xs text-zinc-400 dark:text-[#71717A]">
                        No commits synced yet for this project.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>

          {/* Sidebar - only for joined users */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-6"
          >
            {/* Team Members */}
            <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg font-bold text-zinc-950 dark:text-[#F5F5F5]">
                    Team Members ({teamCount})
                  </CardTitle>
                  {canManageProjectActions && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] text-zinc-900 dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] text-xs font-semibold rounded-xl h-8 px-3"
                      onClick={() => setIsMemberDialogOpen(true)}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {(project?.resources || []).length > 0 && (
                  <div className="p-4 bg-zinc-50 dark:bg-[#17181C] border border-zinc-200/60 dark:border-[#26272B] rounded-xl">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F5] uppercase tracking-wider mb-3">
                      Project Roles Overview
                    </h4>
                    <div className="space-y-2">
                      {(project?.resources || []).map((resource, index) => {
                        const resourceProfile = String(
                          resource?.profile || "",
                        ).trim();
                        if (!resourceProfile) return null;

                        const assignedMember = assignedTeamMembers.find(
                          (member) =>
                            String(member?.role || "")
                              .trim()
                              .toLowerCase() ===
                            resourceProfile.toLowerCase(),
                        );

                        return (
                          <div
                            key={`${resourceProfile}-${index}`}
                            className="flex items-center justify-between py-2 px-3 rounded-lg border-l-2 border-zinc-300 dark:border-[#26272B] bg-white dark:bg-[#111214] border border-zinc-200/60 dark:border-[#26272B]"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <span className="text-xs font-bold text-zinc-800 dark:text-[#F5F5F5] block truncate">
                                {resourceProfile}
                              </span>
                              {resource.skills &&
                                resource.skills.length > 0 && (
                                  <p className="text-[11px] text-zinc-500 dark:text-[#A1A1AA] mt-0.5 truncate">
                                    Skills: {resource.skills.join(", ")}
                                  </p>
                                )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {assignedMember ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase tracking-wider">
                                      Assigned
                                    </span>
                                    <p className="text-[11px] text-zinc-500 dark:text-[#A1A1AA] truncate max-w-28">
                                      {assignedMember.name ||
                                        assignedMember.email}
                                    </p>
                                  </div>
                                  <Avatar className="h-7 w-7 border border-zinc-200 dark:border-[#26272B]">
                                    <AvatarImage
                                      src={
                                        assignedMember.avatar ||
                                        "https://placehold.co/28/svg"
                                      }
                                      alt={
                                        assignedMember.name ||
                                        assignedMember.email ||
                                        "Member avatar"
                                      }
                                    />
                                    <AvatarFallback className="text-xs bg-zinc-100 dark:bg-[#26272B]">
                                      {String(
                                        assignedMember.name ||
                                          assignedMember.email ||
                                          "M",
                                      )
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              ) : (
                                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">
                    Assigned Members
                  </h4>
                  {assignedTeamMembers.length > 0 ? (
                    assignedTeamMembers.map((member, index) => {
                      const memberName =
                        String(member?.name || "").trim() ||
                        String(member?.username || "").trim() ||
                        String(member?.email || "").trim() ||
                        "Unknown";

                      return (
                        <div
                          key={`${member.user || member.email || memberName}-${index}`}
                          className="flex items-center space-x-3 p-3 rounded-xl bg-white dark:bg-[#17181C] border border-zinc-200/60 dark:border-[#26272B]"
                        >
                          <Avatar className="h-8 w-8 border border-zinc-200 dark:border-[#26272B]">
                            <AvatarImage
                              src={
                                member.avatar || "https://placehold.co/30/svg"
                              }
                              alt={memberName}
                            />
                            <AvatarFallback className="text-xs bg-zinc-100 dark:bg-[#26272B]">
                              {memberName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-950 dark:text-[#F5F5F5] truncate">
                                {memberName}
                              </span>
                              <Badge variant="outline" className="text-[10px] bg-zinc-50 dark:bg-[#111214] text-zinc-700 dark:text-[#A1A1AA] border border-zinc-200 dark:border-[#26272B]">
                                {String(member?.role || "Team Member")}
                              </Badge>
                            </div>
                            {member?.email && (
                              <p className="text-[11px] text-zinc-500 dark:text-[#71717A] truncate mt-0.5">
                                {member.email}
                              </p>
                            )}
                          </div>
                            {canManageProjectActions && member?.email && (
                              <div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleRemoveTeamMember(
                                      member.email as string,
                                    )
                                  }
                                  title="Remove member"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-zinc-500 dark:text-[#71717A]">
                        <p className="text-xs">No team members assigned yet</p>
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>

            {/* Tasks Summary */}
            <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-zinc-950 dark:text-[#F5F5F5]">Tasks Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">Total Tasks</span>
                    <span className="font-bold text-xs text-zinc-950 dark:text-[#F5F5F5]">{projectTasks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">Completed</span>
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {
                        projectTasks.filter((t) => t.status === "completed")
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">In Progress</span>
                    <span className="font-bold text-xs text-sky-600 dark:text-sky-400">
                      {
                        projectTasks.filter((t) => t.status === "in-progress")
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">Todo</span>
                    <span className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      {projectTasks.filter((t) => t.status === "todo").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        // Restricted content for non-joined users - compact preview mode
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Project Status",
                value: projectStatus.replace("-", " "),
                subtext: hasAssessments
                  ? "Open for applications"
                  : "No assessments yet",
                icon: BarChart3,
                accent: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40",
              },
              {
                label: "Deadline",
                value: new Date(project?.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                subtext: "Project closing date",
                icon: Calendar,
                accent: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
              },
              {
                label: "Team Size",
                value: `${requiredMembersCount} required`,
                subtext: "Open roles needed",
                icon: Users,
                accent: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40",
              },
              {
                label: "Required Roles",
                value: `${requiredRoleEntries.length || 0} types`,
                subtext:
                  requiredRoleEntries.length > 0
                    ? requiredRoleEntries
                        .slice(0, 2)
                        .map(([role, count]) => `${count} ${role}`)
                        .join(" • ")
                    : "No role breakdown yet",
                icon: CheckCircle,
                accent: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40",
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <Card className="group rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-0">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-[#A1A1AA]">
                          {item.label}
                        </p>
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.accent}`}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-xl font-extrabold text-zinc-950 dark:text-[#F5F5F5] leading-tight capitalize">
                        {item.value}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-[#71717A] leading-snug">
                        {item.subtext}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
          >
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-4 p-3 sm:p-4">
                <div>
                  <h4 className="text-base font-semibold text-black">
                    Project Description
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Quick preview before you apply.
                  </p>
                </div>

                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed p-2">
                  <ReactMarkdown>{project?.description}</ReactMarkdown>
                </div>

                {project?.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {project.tags.slice(0, 4).map((tag: string) => (
                      <Badge
                        key={tag}
                        className="border border-slate-200 bg-slate-100 text-slate-700 px-3 py-1.5 font-medium"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {requiredRoleEntries.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-700" />
                      <h6 className="text-sm font-semibold text-black">
                        Team Members Required
                      </h6>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {requiredRoleDetails.map((roleItem) => {
                        return (
                          <div
                            key={roleItem.key}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-black">
                                  {roleItem.role}
                                  <div className="flex flex-wrap gap-2">
                                    <span className="max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 truncate">
                                      {roleItem.skills}
                                    </span>
                                  </div>
                                </p>
                                <Badge className="shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                                  Exp {roleItem.experience}
                                </Badge>
                              </div>

                              {/* <div className="flex flex-wrap gap-2">
                                <span className="max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 truncate">
                                  {roleItem.skills}
                                </span>
                              </div> */}

                              <p className="text-xs leading-5 text-slate-600 line-clamp-2">
                                {roleItem.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center pt-1">
                  <Button
                    size="lg"
                    onClick={handleApply}
                    disabled={isApplyButtonDisabled}
                    className={`px-6 py-5 text-sm font-semibold transition-all shadow-sm hover:shadow-md ${
                      isApplyButtonDisabled
                        ? "cursor-not-allowed bg-slate-200 text-slate-400"
                        : "bg-black text-white hover:bg-slate-900"
                    }`}
                    title={
                      !hasAssessments
                        ? "Apply for this project"
                        : isUserJoined
                          ? "You have already joined this project"
                          : ""
                    }
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isApplyButtonDisabled && !hasAssessments
                      ? "Apply"
                      : isApplyButtonDisabled && isUserJoined
                        ? "Already Joined"
                        : "Apply to Join"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Repository Selection Dialog - Admin only */}
      <Dialog open={isRepoDialogOpen} onOpenChange={setIsRepoDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Link GitHub Repository</DialogTitle>
            <DialogDescription>
              Select the repository you want to link to this project. This will
              be used for automated pull request checks.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
            {loadingRepos ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500">
                  Fetching your repositories...
                </p>
              </div>
            ) : repos.length > 0 ? (
              repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => !linkingRepo && handleLinkRepo(repo.full_name)}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <Github className="h-5 w-5 text-slate-600" />
                    <div>
                      <h4 className="font-medium text-slate-900">
                        {repo.name}
                      </h4>
                      <p className="text-xs text-slate-500">{repo.full_name}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" disabled={linkingRepo}>
                    Select
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No repositories found.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Sheet Slider */}
      <Sheet open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <SheetContent className="sm:max-w-[550px] w-full flex flex-col h-full border-l bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-2xl p-6 overflow-y-auto animate-in duration-200">
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
                    <Badge key={tag} variant="outline" className="text-[9px] font-medium px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-655 dark:text-zinc-350 border border-zinc-200 dark:border-zinc-700">
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
              disabled={
                !editedProject?.title?.trim() ||
                editedProject.title.trim().length < 6 ||
                !editedProject?.description?.trim() ||
                editedProject.description.trim().length < 6
              }
              className="rounded-xl bg-black hover:bg-zinc-900 text-white text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
