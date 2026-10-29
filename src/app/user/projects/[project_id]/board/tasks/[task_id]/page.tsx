"use client";

import { useParams, useRouter } from "next/navigation";
import { useTaskById } from "@/hooks/useTaskById";
import {
  ArrowLeft,
  Calendar,
  Flag,
  User,
  MessageSquare,
  CheckSquare,
  Star,
  AlertCircle,
  Clock,
} from "lucide-react";
import { TASK_MGMT_AGENT_URL, PLANNER_AGENT_URL } from "@/utils/API_URL";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssignedUser } from "@/components/tasks/AssignedUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDetailsTab } from "@/components/tasks/task-details-tab";
import { TaskNotesTab } from "@/components/tasks/task-notes-tab";
import { TaskSubTasksTab } from "@/components/tasks/task-sub_tasks-tab";
import { formatDate } from "@/lib/formatDate";
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { CODE_REVIEW_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import { ReviewResponseView } from "@/components/ReviewResponseView";
import { useAppDispatch, useUser } from "@/redux/hooks";
import { Task, fetchTaskById, fetchTasksByProject, updateTask } from "@/redux/slice/task.slice";
import { updateTaskStatusInBoard } from "@/redux/slice/project.slice";
import { convertToGitHubWebUrl, validateGitHubPRUrl } from "@/lib/github";
import { buildCodeReviewMarkdown } from "@/lib/aiFeedback";
import useUserProfile from "@/hooks/useUserProfile";
import { getViewerCompanySubrole } from "@/lib/company-rbac";
import {
  canSubmitTaskForReview,
  areAllVisibleSubTasksCompletedForPrLink,
} from "@/lib/taskWorkflow";

// Type for PRs fetched from API
// GitHub PR type from API
type GitHubPR = {
  url: string;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
};

type ReviewResponse = {
  review: string;
  [key: string]: unknown;
};

const normalizepull_requestUrlForReview = (url: string): string | null => {
  const converted = convertToGitHubWebUrl(url);
  if (!converted) return null;

  // The code-review-agent only treats URLs matching /pull/<number> as PR URLs.
  // Some older records may contain a web /issues/<number> URL (from search/issues).
  try {
    const parsed = new URL(converted);
    if (parsed.hostname === "github.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (
        parts.length >= 4 &&
        parts[2] === "issues" &&
        /^\d+$/.test(parts[3])
      ) {
        parts[2] = "pull";
        parsed.pathname = "/" + parts.join("/");
        return parsed.toString();
      }
    }
  } catch {
    // ignore URL parse errors
  }

  return converted;
};

/**
 * Check if user can access a task based on their role and task assignment
 * Rules:
 * 1. Owner/Admin can access any task
 * 2. Manager can access any task
 * 3. Trainee can ONLY access tasks assigned to them
 * 4. Unassigned tasks: Only Owner/Admin/Manager can access, Trainee cannot
 */
const canUserAccessTask = (
  userSubrole: string | null,
  taskAssignedTo: any,
  userId: string | null,
): boolean => {
  if (!userId) {
    console.warn("[canUserAccessTask] No userId available");
    return false;
  }

  // Resolve the assignee ID from taskAssignedTo (could be string or populated object)
  let taskAssignedToId: string | null = null;
  if (taskAssignedTo) {
    if (typeof taskAssignedTo === "string") {
      taskAssignedToId = taskAssignedTo;
    } else if (typeof taskAssignedTo === "object") {
      taskAssignedToId = taskAssignedTo._id || taskAssignedTo.id || null;
    }
  }

  const matchesUser =
    taskAssignedToId &&
    String(taskAssignedToId).trim().toLowerCase() === String(userId).trim().toLowerCase();

  console.log(
    "[canUserAccessTask] userSubrole=%s taskAssignedToId=%s userId=%s match=%s",
    userSubrole,
    taskAssignedToId,
    userId,
    matchesUser,
  );

  // Owner and Admin can access any task
  if (userSubrole === "owner" || userSubrole === "admin") {
    return true;
  }

  // Manager can access any task
  if (userSubrole === "manager") {
    return true;
  }

  // If the user IS the assignee, always grant access regardless of subrole.
  // This handles cases where the subrole is not yet loaded from the API or
  // the company membership lookup in the profile endpoint fails transiently.
  if (matchesUser) {
    console.log("[canUserAccessTask] User is the task assignee, granting access");
    return true;
  }

  // Trainee can ONLY access tasks assigned to them (already handled above,
  // but keep this for the null subrole case)
  if (userSubrole === "trainee") {
    return false;
  }

  // Any other role cannot access (default deny)
  console.warn(
    "[canUserAccessTask] Access denied: subrole=%s userId=%s taskAssignedToId=%s",
    userSubrole,
    userId,
    taskAssignedToId,
  );
  return false;
};

const REVIEW_CACHE_TTL_MS = 5 * 60 * 1000;

const buildReviewCacheKey = (
  user_id: string,
  task_id: string,
  repoPath: string,
) => `code-review:${user_id}:${task_id}:${repoPath}`;

const getCachedReview = (key: string): ReviewResponse | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: number;
      data?: ReviewResponse;
    };
    if (!parsed?.savedAt || !parsed?.data) return null;
    if (Date.now() - parsed.savedAt > REVIEW_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const setCachedReview = (key: string, data: ReviewResponse) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {}
};

const removeCachedReview = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "border-red-200 text-red-700 bg-red-50";
    case "medium":
      return "border-yellow-200 text-yellow-700 bg-yellow-50";
    case "low":
      return "border-green-200 text-green-700 bg-green-50";
    default:
      return "border-slate-200 text-slate-700 bg-slate-50";
  }
};

export default function TaskDetailPage() {
  const [submitting, setSubmitting] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const { user: reduxUser, loading: userLoading } = useUser();
  const { mongoUser: viewerProfile, loading: profileLoading } = useUserProfile();

  // Prefer Redux user for _id (single source of truth for identity).
  // Fall back to the hook version when Redux hasn't resolved yet.
  const user = reduxUser ?? viewerProfile;
  const userId = user?._id ? String(user._id) : null;
  const directSubrole = ((reduxUser as any)?.subrole || viewerProfile?.subrole || (reduxUser as any)?.company_subrole || (viewerProfile as any)?.company_subrole) as string | undefined;
  const userRole = ((reduxUser as any)?.role || viewerProfile?.role) as string | undefined;
  const viewerCompanySubrole =
    getViewerCompanySubrole(reduxUser as any) ||
    getViewerCompanySubrole(viewerProfile as any) ||
    (directSubrole ? (directSubrole.toLowerCase() as any) : null) ||
    (userRole === "admin" ? "admin" : null);

  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const task_id = params.task_id as string;
  const project_id = params.project_id as string;

  const { task, loading } = useTaskById(task_id);

  // GitHub PRs state
  const [prs, setPrs] = useState<GitHubPR[]>([]);
  const [prLoading, setPrLoading] = useState(false);
  const [selectedPr, setSelectedPr] = useState<string>("none");
  const [isEditingPR, setIsEditingPR] = useState(false);

  // Code-review state (now only review response)
  const [reviewResponse, setReviewResponse] = useState<ReviewResponse | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [projectRepository, setProjectRepository] = useState<string | null>(
    null,
  );
  const [manualPrUrl, setManualPrUrl] = useState("");
  const [manualPrValidation, setManualPrValidation] = useState<{
    status: "idle" | "valid" | "invalid";
    message: string;
    normalizedUrl: string | null;
  }>({
    status: "idle",
    message: "",
    normalizedUrl: null,
  });
  const [optimisticTaskState, setOptimisticTaskState] = useState<{
    status?: "todo" | "in-progress" | "submitted" | "completed" | "blocked";
    linkedPrId?: string | null;
  }>({});

  const effectiveTaskStatus =
    optimisticTaskState.status ?? task?.status ?? "todo";
  const effectiveLinkedPrId =
    optimisticTaskState.linkedPrId !== undefined
      ? optimisticTaskState.linkedPrId
      : (task?.linked_pr_id || task?.linked_pull_request?.pull_request?.url || null);

  const taskAssignedToId = task?.assigned_to
    ? typeof task.assigned_to === "string"
      ? task.assigned_to
      : (task.assigned_to as any)._id || (task.assigned_to as any).id || null
    : null;

  const isTaskAssignee = Boolean(
    (userId || user?.email) &&
      taskAssignedToId &&
      String(taskAssignedToId)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .some((item) => {
          const idMatch = userId && item === String(userId).trim().toLowerCase();
          const emailMatch = user?.email && item === String(user.email).trim().toLowerCase();
          return idMatch || emailMatch;
        })
  );

  const canGenerateSubtaskBreakdown =
    viewerCompanySubrole === "owner" || viewerCompanySubrole === "admin";
  const canRevealPrSubmission = areAllVisibleSubTasksCompletedForPrLink(task);

  const normalizeRepoIdentifier = useCallback((value: string | null) => {
    if (!value) return "";
    const trimmed = value.trim().replace(/\.git$/i, "");
    const repoMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (repoMatch) {
      return `${repoMatch[1]}/${repoMatch[2]}`.toLowerCase();
    }
    const shorthandMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
    if (shorthandMatch) {
      return `${shorthandMatch[1]}/${shorthandMatch[2]}`.toLowerCase();
    }
    return trimmed.toLowerCase();
  }, []);

  const validateManualPrUrl = useCallback(() => {
    const trimmed = manualPrUrl.trim();
    if (!trimmed) {
      setManualPrValidation({
        status: "invalid",
        message: "Please enter a GitHub pull request URL.",
        normalizedUrl: null,
      });
      return false;
    }

    const validation = validateGitHubPRUrl(trimmed);
    if (!validation.isValid || !validation.owner || !validation.repo) {
      setManualPrValidation({
        status: "invalid",
        message: validation.error || "Invalid GitHub pull request URL.",
        normalizedUrl: null,
      });
      return false;
    }

    if (
      projectRepository &&
      normalizeRepoIdentifier(`${validation.owner}/${validation.repo}`) !==
        normalizeRepoIdentifier(projectRepository)
    ) {
      setManualPrValidation({
        status: "invalid",
        message: `Use a PR from the linked repository: ${projectRepository}`,
        normalizedUrl: null,
      });
      return false;
    }

    setManualPrValidation({
      status: "valid",
      message: "URL is valid.",
      normalizedUrl: convertToGitHubWebUrl(trimmed) || trimmed,
    });
    return true;
  }, [manualPrUrl, normalizeRepoIdentifier, projectRepository]);

  const resolvedPrUrl =
    manualPrValidation.status === "valid" && manualPrValidation.normalizedUrl
      ? manualPrValidation.normalizedUrl
      : selectedPr !== "none"
        ? selectedPr
        : null;

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "details";
    return new URLSearchParams(window.location.search).get("tab") === "feedback"
      ? "feedback"
      : "details";
  });

  // Only use agent endpoint for code review feedback
  const fetchCodeReviewSync = useCallback(
    async (repoPath?: string) => {
      if (!task_id || !userId) return;
      try {
        const rawRepoPath = repoPath || effectiveLinkedPrId || null;
        if (!rawRepoPath) {
          return;
        }
        const finalRepoPath = normalizepull_requestUrlForReview(rawRepoPath);
        if (!finalRepoPath) {
          toast.error("Invalid pull request URL.");
          return;
        }
        const cacheKey = buildReviewCacheKey(userId, task_id, finalRepoPath);
        const cached = getCachedReview(cacheKey);
        if (cached) {
          setReviewResponse(cached);
          setReviewError(null);
          return;
        }
        // Check if we already have a saved review from the DB (via task.ai_feedback)
        // to avoid regenerating. Only use the raw review text, NOT the short summary,
        // since summary may just be a placeholder like "AI code review completed."
        if (task?.ai_feedback) {
          const saved = task.ai_feedback;
          const savedReview = typeof saved === "string" ? saved : (saved?.review || "");
          // Only use saved review if it has substantial content (not a placeholder)
          if (typeof savedReview === "string" && savedReview.trim().length > 80) {
            const responsePayload: ReviewResponse = { review: savedReview };
            setReviewResponse(responsePayload);
            setReviewError(null);
            setCachedReview(cacheKey, responsePayload);
            return;
          }
        }
        setFeedbackLoading(true);
        setReviewError(null);
        const accessToken = await fastAPIAuthService.getAccessToken();
        if (!accessToken) {
          const errorMsg = "Authentication required for code review.";
          toast.error(errorMsg);
          setReviewError(errorMsg);
          return;
        }
        const res = await queueAwareFetch(`${CODE_REVIEW_AGENT_URL}/review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ repo_path: finalRepoPath, task_id, project_id, max_chunks: 10 }),
        }, { maxPollAttempts: 180, pollIntervalMs: 2000 });
        const txt = await res.text();
        let data = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch {}
        if (res.ok) {
          if (isQueueResponse(data)) {
            const errorMsg = "Code review is in progress. Please wait a moment and refresh.";
            toast(errorMsg);
            setReviewResponse(null);
            setReviewError(errorMsg);
            return;
          }
          const reviewText =
            data &&
            typeof data === "object" &&
            typeof (data as any).review === "string"
              ? String((data as any).review)
              : "";
          const status =
            data &&
            typeof data === "object" &&
            typeof (data as any).status === "string"
              ? String((data as any).status)
              : undefined;
          const message =
            data &&
            typeof data === "object" &&
            typeof (data as any).message === "string"
              ? String((data as any).message)
              : undefined;

          if (reviewText.trim()) {
            const responsePayload: ReviewResponse = {
              review: reviewText,
            };

            setReviewResponse(responsePayload);
            setReviewError(null);
            setCachedReview(cacheKey, responsePayload);

            // ✅ FIX #8: Frontend response validation
            if (!data?.review_id) {
              console.warn("⚠️ Backend did not return review_id");
              toast("Review saved but storage ID unavailable");
            } else {
              console.log(
                "✅ Review stored in backend database:",
                data.review_id,
              );
            }

            await dispatch(fetchTaskById(task_id)).unwrap();
            toast.success("Code review completed!");
          } else {
            setReviewResponse(null);
            if (status === "error") {
              const errorMsg = message || "Code review failed.";
              toast.error(errorMsg);
              setReviewError(errorMsg);
            } else {
              toast(message || "No code review available yet.");
            }
          }
        } else {
          const errorMsg =
            res.status === 504 || (data && typeof data === "object" && data.status === "timeout")
              ? "Code review is taking longer than expected. It is still processing in the background. Please wait a moment and click Try Again."
              : `Failed to load code review. Please try again later. (Error: ${res.status})`;
          console.error("Code review failed", res.status, data || txt);
          toast.error(errorMsg);
          setReviewError(errorMsg);
        }
      } catch (err) {
        const errorMsg = "Failed to fetch code review. Please try again.";
        console.error("Error fetching code review:", err);
        toast.error(errorMsg);
        setReviewError(errorMsg);
      } finally {
        setFeedbackLoading(false);
      }
    },
    [dispatch, task_id, effectiveLinkedPrId, userId, project_id, task?.ai_feedback],
  );

  const handleSubmit = async () => {
    if (!projectRepository) {
      toast.error(
        "Project repository not linked by the company. Please wait for the company to link a repository first.",
      );
      return;
    }

    // Extract repo path from selected PR
    const finalPrUrl = resolvedPrUrl;
    if (!finalPrUrl) {
      toast.error("Please select or verify a pull request URL.");
      return;
    }

    const prMatch =
      finalPrUrl.match(
        /github\.com\/(.+?)\/(.+?)\/(?:pull|pulls|issues)\/(\d+)/,
      ) ||
      finalPrUrl.match(
        /api\.github\.com\/repos\/(.+?)\/(.+?)\/(?:pull|pulls|issues)\/(\d+)/,
      );

    if (prMatch) {
      const prRepo = `${prMatch[1]}/${prMatch[2]}`.toLowerCase();
      if (prRepo !== projectRepository.toLowerCase()) {
        toast.error(
          `Invalid Repository. Please submit a PR from the linked repository: ${projectRepository}`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      // Find the selected PR details
      const pr_details = prs.find((pr) => pr.url === finalPrUrl);

      // First update external progress API
      const statusToProgress = (status: string) => {
        switch (status) {
          case "completed":
            return 100;
          case "submitted":
            return 75;
          case "in-progress":
            return 50;
          case "todo":
            return 0;
          case "blocked":
            return 25;
          default:
            return 0;
        }
      };

      // Update external progress using shared helper (non-blocking)
      try {
        const { updateExternalTaskProgress } =
          await import("@/lib/externalProgress");
        await updateExternalTaskProgress(
          task_id,
          statusToProgress("in-progress"),
          { status: "in-progress" },
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("External task progress update failed (non-fatal):", msg);
      }

      // External update succeeded — update our DB via Redux thunk
      await dispatch(
        updateTask({
          id: task_id,
          updates: {
            linked_pr_id: finalPrUrl,
            status: "in-progress",
            pr_details,
            user_id: userId,
          } as Partial<Task> & Record<string, unknown>,
        }),
      ).unwrap();

      // Call the code-review webhook so the agent is notified of the linked PR
      try {
        const finalUrl = finalPrUrl;
        if (!finalUrl) return;
        const accessToken = await fastAPIAuthService.getAccessToken();
        const res = await fetch(`${CODE_REVIEW_AGENT_URL}/review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            repo_path: finalUrl,
            task_id,
            project_id,
            max_chunks: 10,
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          console.error("Failed triggering code review:", res.status, txt);
        }
      } catch (e) {
        console.error("Failed triggering code review:", e);
      }

      setOptimisticTaskState({
        status: "in-progress",
        linkedPrId: finalPrUrl,
      });
      setIsLinked(true);

      void (async () => {
        try {
          if (finalPrUrl) {
            const accessToken = await fastAPIAuthService.getAccessToken();
            await fetch(`${CODE_REVIEW_AGENT_URL}/review`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: JSON.stringify({
                repo_path: finalPrUrl,
                task_id,
                project_id,
                max_chunks: 10,
              }),
            });
          }
        } catch (e) {
          console.error("Failed triggering code review for PR change:", e);
        }
      })();
    } catch {
      // Optionally handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setSubmitting(true);
    try {
      // First update external progress to reflect 'in-progress'
      const statusToProgress = (status: string) => {
        switch (status) {
          case "completed":
            return 100;
          case "in-progress":
            return 50;
          case "todo":
            return 0;
          case "blocked":
            return 25;
          default:
            return 0;
        }
      };

      try {
        const { updateExternalTaskProgress } =
          await import("@/lib/externalProgress");
        await updateExternalTaskProgress(
          task_id,
          statusToProgress("in-progress"),
          { status: "in-progress" },
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("External task progress update failed (non-fatal):", msg);
      }

      await dispatch(
        updateTask({
          id: task_id,
          updates: { linked_pr_id: null, status: "in-progress" },
        }),
      ).unwrap();
      setIsLinked(false);
      setSelectedPr("none");
      setSubmitting(false);
      // Remove review response from UI immediately when PR is unlinked
      setReviewResponse(null);
      setReviewError(null);
      if (task?.linked_pr_id && userId) {
        removeCachedReview(
          buildReviewCacheKey(userId, task_id, task.linked_pr_id),
        );
      }
    } catch {
      // Optionally handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPR = async () => {
    if (!resolvedPrUrl) {
      toast.error("Please select or verify a pull request URL.");
      return;
    }

    // Confirm destructive action
    if (
      !confirm(
        `Change linked PR to a new selection? This will invalidate the previous code review.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      // Update task with new PR link via Redux thunk
      await dispatch(
        updateTask({
          id: task_id,
          updates: {
            linked_pr_id: resolvedPrUrl,
            status: effectiveTaskStatus,
            user_id: userId,
          } as Partial<Task> & Record<string, unknown>,
        }),
      ).unwrap();

      // Clear old review cache before fetching new one
      if (task?.linked_pr_id && userId) {
        removeCachedReview(
          buildReviewCacheKey(userId, task_id, task.linked_pr_id),
        );
      }

      // Notify code review agent of the PR change
      let webhookSucceeded = false;
      try {
        if (!resolvedPrUrl) return;
        const accessToken = await fastAPIAuthService.getAccessToken();
        const reviewRes = await fetch(
          `${CODE_REVIEW_AGENT_URL}/review`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
              repo_path: resolvedPrUrl,
              task_id,
              project_id,
              max_chunks: 10,
            }),
          },
        );
        if (reviewRes.ok) {
          webhookSucceeded = true;
        } else {
          const txt = await reviewRes.text();
          console.warn(
            "Failed triggering code review for PR change:",
            reviewRes.status,
            txt,
          );
        }
      } catch (e) {
        console.warn("Failed triggering code review for PR change:", e);
      }

      // Refresh task to reflect changes
      try {
        await dispatch(fetchTaskById(task_id)).unwrap();
      } catch (e) {
        console.warn("Failed to refresh task after PR update:", e);
      }

      // Refresh project task list
      try {
        if (typeof project_id === "string" && project_id.trim()) {
          void dispatch(fetchTasksByProject(project_id)).unwrap();
        }
      } catch (e) {
        console.warn("Failed to refresh project tasks:", e);
      }

      // Show warning if webhook failed but task update succeeded
      if (!webhookSucceeded) {
        toast("Pull request updated but code review may be delayed", {
          icon: "⚠️",
        });
      }
      setOptimisticTaskState({
        ...optimisticTaskState,
        linkedPrId: resolvedPrUrl,
      });
      setIsEditingPR(false);
      setSelectedPr("none");
      setManualPrUrl("");
      setManualPrValidation({
        status: "idle",
        message: "",
        normalizedUrl: null,
      });
      setReviewError(null);

      // Fetch new review for updated PR
      void (async () => {
        try {
          if (resolvedPrUrl) {
            await fetchCodeReviewSync(resolvedPrUrl);
          }
        } catch (e) {
          console.error("Failed to fetch review for updated PR", e);
        }
      })();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to update PR link";
      console.error("PR update error:", error);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const uiTask = task ? {
    ...task,
    status: effectiveTaskStatus,
    linked_pr_id: effectiveLinkedPrId,
  } : null;
  const canSubmit = uiTask ? canSubmitTaskForReview(uiTask) : false;

  const handleSubmitForReview = async () => {
    if (!task) return;
    if (!canSubmit) {
      const visibleSubTasks = task.sub_tasks?.filter((st) => !st.is_deleted) || [];
      const subtaskCompleted = visibleSubTasks.filter((st) => st.completed).length;
      const subtaskTotal = visibleSubTasks.length;
      if (subtaskCompleted < subtaskTotal) {
        toast.error("Please complete all subtasks first.");
        return;
      }
      if (!effectiveLinkedPrId) {
        toast.error("Please link a Pull Request first.");
        return;
      }
      toast.error("Cannot submit this task for review.");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Submitting task for review...");
    try {
      // 1. Update task status in board & details in parallel
      await Promise.all([
        dispatch(
          updateTaskStatusInBoard({
            project_id: task.project_id || project_id,
            task_id: task.id || task_id,
            newStatus: "submitted",
          })
        ).unwrap(),
        dispatch(
          updateTask({
            id: task.id || task_id,
            updates: { status: "submitted" },
          })
        ).unwrap(),
      ]);

      // 2. Sync states in parallel
      await Promise.all([
        dispatch(fetchTaskById(task_id)).unwrap(),
        ...(project_id
          ? [dispatch(fetchTasksByProject(project_id)).unwrap()]
          : []),
      ]);

      setOptimisticTaskState((prev) => ({
        ...prev,
        status: "submitted",
      }));
    } catch (err: any) {
      console.error("Submission error:", err);
      const msg = typeof err === "string" ? err : err?.message || err?.error || "Failed to submit task for review";
      toast.error(msg);
    } finally {
      toast.dismiss(loadingToast);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!task) return;
    const feedbackAllowed =
      effectiveTaskStatus === "completed" ||
      effectiveTaskStatus === "submitted";
    if (!feedbackAllowed && activeTab === "feedback") {
      setActiveTab("details");
    }
  }, [task, activeTab, effectiveTaskStatus]);

  useEffect(() => {
    if (!task || !userId) return;
    if (activeTab !== "feedback") return;

    if (
      effectiveTaskStatus !== "completed" &&
      effectiveTaskStatus !== "submitted"
    )
      return;

    // Only use the stored review text if it's the raw AI-generated review, not
    // a placeholder summary. The `review` field should contain the full markdown
    // review; `buildCodeReviewMarkdown` produces skeleton text when data is sparse.
    const storedReview = task?.ai_feedback?.review?.trim() || "";
    if (storedReview && storedReview.length > 80) {
      if (!reviewResponse?.review || reviewResponse.review !== storedReview) {
        setReviewResponse({ review: storedReview });
        setReviewError(null);
      }
      return;
    }

    if (feedbackLoading) return;
    if (reviewResponse?.review) return;
    if (reviewError) return; // Don't retry if there's an error

    if (!effectiveLinkedPrId) {
      if (
        effectiveTaskStatus === "completed" ||
        effectiveTaskStatus === "submitted"
      ) {
        toast.error("No repository path or PR URL available for review.");
      }
      return;
    }

    fetchCodeReviewSync();
  }, [
    activeTab,
    task,
    userId,
    feedbackLoading,
    reviewResponse,
    reviewError,
    task?.ai_feedback?.review,
    task?.ai_feedback,
    fetchCodeReviewSync,
    effectiveTaskStatus,
    effectiveLinkedPrId,
  ]);

  useEffect(() => {
    async function fetchPRs() {
      setPrLoading(true);
      try {
        if (!userId) {
          setPrs([]);
          setPrLoading(false);
          return;
        }
        const res = await fetch("/api/github/pull-requests", {
          headers: {
            "x-user-id": userId,
          },
        });
        const data = await res.json();
        if (Array.isArray(data.pull_requests)) {
          setPrs(data.pull_requests);
        } else {
          setPrs([]);
        }
      } catch {
        setPrs([]);
      } finally {
        setPrLoading(false);
      }
    }
    fetchPRs();
  }, [userId]);

  useEffect(() => {
    async function fetchProjectRepo() {
      if (!project_id) return;
      try {
        const res = await fetch(
          `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}`,
        );
        const data = await res.json();
        const projectData = data.project || data;
        if (projectData && projectData.github_repository) {
          setProjectRepository(projectData.github_repository);
        }
      } catch (err) {
        console.error("Failed to fetch project repository:", err);
      }
    }
    fetchProjectRepo();
  }, [project_id]);

  // Navigate back to the board page
  const handleBack = () => {
    router.push(`/user/projects/${project_id}/board`);
  };

  if ((loading && !task) || userLoading || (!userId && profileLoading)) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-900 dark:text-slate-100">
          Loading task...
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Task not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The task you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  // Access control check for task visibility
  const canAccessThisTask = canUserAccessTask(
    viewerCompanySubrole,
    task.assigned_to || task.assignee,
    userId,
  );

  if (!canAccessThisTask) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
            Access Denied
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {task.assigned_to
              ? "You can only view tasks assigned to you."
              : "You don't have permission to view unassigned tasks. Only managers and admins can access unassigned tasks."}
          </p>
        </div>
      </div>
    );
  }

  // Find the linked PR from the list if it exists
  // We need to handle both web URLs and API URLs since we convert them
  const linkedPR = prs.find((pr) => {
    if (!effectiveLinkedPrId) return false;

    // Direct match
    if (pr.url === effectiveLinkedPrId) return true;

    // Try to extract PR number and compare
    const taskPrMatch = effectiveLinkedPrId.match(/\/pull\/(\d+)$/);
    const prUrlMatch =
      pr.url.match(/\/pull\/(\d+)$/) || pr.url.match(/\/issues\/(\d+)$/);

    if (taskPrMatch && prUrlMatch) {
      return taskPrMatch[1] === prUrlMatch[1];
    }

    return false;
  });

  return (
    <div className="h-[calc(100vh-5rem)] overflow-y-auto bg-transparent text-zinc-950 dark:text-[#F5F5F5] flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200/60 dark:border-[#1E1F23] px-6 py-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-[#A1A1AA] dark:hover:text-[#F5F5F5] shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 dark:text-[#F5F5F5]">
                {task.title}
              </h1>
            </div>
            {/* Show linked PR box and link/unlink UI */}
            {effectiveTaskStatus === "todo" ? (
              <div className="mt-2 mb-4 rounded-xl border border-dashed border-zinc-300 dark:border-[#26272B] bg-zinc-50 dark:bg-[#111214] px-4 py-3 text-xs text-zinc-600 dark:text-[#A1A1AA]">
                This task will move to Progress after assignment. PR submission
                is only available once work has started.
              </div>
            ) : effectiveTaskStatus === "in-progress" &&
              !effectiveLinkedPrId ? (
              !canRevealPrSubmission ? (
                <div className="mt-2 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Complete every visible sub-task to unlock PR submission.
                </div>
              ) : (
                <div className="mt-2 mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Link Pull Request
                  </label>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {prLoading ? (
                      <div className="text-xs text-slate-500">
                        Loading PRs...
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="linked-pr-select" className="text-sm">
                            Select Existing PR
                          </Label>
                          <Select
                            value={selectedPr}
                            onValueChange={(value) => {
                              setSelectedPr(value);
                              if (value !== "none") {
                                setManualPrUrl("");
                                setManualPrValidation({
                                  status: "idle",
                                  message: "",
                                  normalizedUrl: null,
                                });
                              }
                            }}
                          >
                            <SelectTrigger
                              id="linked-pr-select"
                              className="w-full"
                            >
                              <SelectValue placeholder="Select a PR to link" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                No PR to attach
                              </SelectItem>
                              {prs.map((pr) => (
                                <SelectItem key={pr.url} value={pr.url}>
                                  {pr.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="manual-pr-url" className="text-sm">
                            Alternative PR URL
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="manual-pr-url"
                              placeholder="https://github.com/username/repo/pull/123"
                              value={manualPrUrl}
                              onChange={(e) => {
                                setManualPrUrl(e.target.value);
                                setSelectedPr("none");
                                setManualPrValidation({
                                  status: "idle",
                                  message: "",
                                  normalizedUrl: null,
                                });
                              }}
                              disabled={submitting}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={validateManualPrUrl}
                              disabled={submitting || !manualPrUrl.trim()}
                            >
                              Check URL
                            </Button>
                          </div>
                          {manualPrValidation.status !== "idle" && (
                            <p
                              className={`text-xs font-medium ${
                                manualPrValidation.status === "valid"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {manualPrValidation.message}
                            </p>
                          )}
                        </div>

                        <Button
                          className="lg:col-span-2 mt-1 w-full"
                          onClick={handleSubmit}
                          disabled={submitting || prLoading || !resolvedPrUrl}
                        >
                          {submitting ? "Linking PR..." : "Link PR"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            ) : (
              <>
                {(linkedPR || effectiveLinkedPrId) && (
                  <div className="mt-2 mb-4 p-2 border rounded bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800">
                    <span className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" /> Linked Pull Request
                    </span>
                    <a
                      href={
                        convertToGitHubWebUrl(
                          effectiveLinkedPrId || linkedPR?.url || task?.linked_pull_request?.pull_request?.url || "",
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-indigo-700 dark:text-indigo-400 font-medium hover:underline mt-1"
                    >
                      {linkedPR?.title || task?.linked_pull_request?.pull_request?.title || task.linked_pr_id || "Unknown PR"}
                    </a>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {linkedPR ? (
                        `By ${linkedPR.user.login} • ${linkedPR.state} • ${new Date(linkedPR.created_at).toLocaleDateString()}`
                      ) : task?.linked_pull_request ? (
                        `By ${(task.linked_pull_request.user_id as any)?.full_name || (task.linked_pull_request.user_id as any)?.email || "User"} • ${task.linked_pull_request.pull_request?.status || task.linked_pull_request.status || ""} • ${task.linked_pull_request.submitted_at ? new Date(task.linked_pull_request.submitted_at).toLocaleDateString() : ""}`
                      ) : (
                        "PR details not available"
                      )}
                    </div>
                  </div>
                )}
                {/* Conditional rendering for PR link/unlink UI */}
                {isTaskAssignee && (
                  <div className="mt-2 mb-4">
                    {effectiveLinkedPrId ? (
                      <div className="w-80 rounded border border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-green-600 text-sm font-semibold flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" /> PR Linked
                          </div>
                          {effectiveTaskStatus !== "submitted" &&
                            effectiveTaskStatus !== "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditingPR(true)}
                                disabled={submitting}
                              >
                                Edit PR
                              </Button>
                            )}
                        </div>
                        {effectiveTaskStatus !== "submitted" &&
                          effectiveTaskStatus !== "completed" && (
                            <Button
                              className={`w-full font-semibold text-sm rounded-lg py-2 transition-all duration-200 ${
                                canSubmit
                                  ? "bg-black hover:bg-slate-900 text-white shadow"
                                  : "bg-slate-100 text-slate-400 dark:bg-slate-850 dark:text-slate-500 cursor-not-allowed"
                              }`}
                              onClick={handleSubmitForReview}
                              disabled={submitting || !canSubmit}
                            >
                              {submitting ? "Submitting..." : "Submit for Review"}
                            </Button>
                          )}
                      </div>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                          Link Pull Request
                        </label>
                        <div className="w-80">
                          {prLoading ? (
                            <div className="text-xs text-slate-500">
                              Loading PRs...
                            </div>
                          ) : (
                            <>
                              <Select
                                value={selectedPr}
                                onValueChange={setSelectedPr}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a PR to link" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    No PR to attach
                                  </SelectItem>
                                  {prs.map((pr) => (
                                    <SelectItem key={pr.url} value={pr.url}>
                                      {pr.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                className="mt-3 w-full"
                                onClick={handleSubmit}
                                disabled={
                                  submitting ||
                                  prLoading ||
                                  prs.length === 0 ||
                                  selectedPr === "none"
                                }
                              >
                                {submitting ? "Linking PR..." : "Link PR"}
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {isTaskAssignee && isEditingPR && (effectiveLinkedPrId || linkedPR) && (
                  <div className="mt-2 mb-4 p-4 border border-l-4 border-l-blue-500 border-blue-200 rounded bg-white">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      Change Linked Pull Request
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label
                          htmlFor="edit-linked-pr-select"
                          className="text-sm"
                        >
                          Select a Different PR
                        </Label>
                        <Select
                          value={selectedPr}
                          onValueChange={(value) => {
                            setSelectedPr(value);
                            if (value !== "none") {
                              setManualPrUrl("");
                              setManualPrValidation({
                                status: "idle",
                                message: "",
                                normalizedUrl: null,
                              });
                            }
                          }}
                        >
                          <SelectTrigger
                            id="edit-linked-pr-select"
                            className="w-full"
                          >
                            <SelectValue placeholder="Select a PR to link" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              No PR to attach
                            </SelectItem>
                            {prs.map((pr) => (
                              <SelectItem key={pr.url} value={pr.url}>
                                {pr.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="edit-manual-pr-url" className="text-sm">
                          Or Enter PR URL
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="edit-manual-pr-url"
                            placeholder="https://github.com/username/repo/pull/123"
                            value={manualPrUrl}
                            onChange={(e) => {
                              setManualPrUrl(e.target.value);
                              setSelectedPr("none");
                              setManualPrValidation({
                                status: "idle",
                                message: "",
                                normalizedUrl: null,
                              });
                            }}
                            disabled={submitting}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={validateManualPrUrl}
                            disabled={submitting || !manualPrUrl.trim()}
                          >
                            Check URL
                          </Button>
                        </div>
                        {manualPrValidation.status !== "idle" && (
                          <p
                            className={`text-xs font-medium mt-1 ${
                              manualPrValidation.status === "valid"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {manualPrValidation.message}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleEditPR}
                          disabled={submitting || !resolvedPrUrl}
                        >
                          {submitting ? "Updating..." : "Update PR Link"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingPR(false);
                            setSelectedPr("none");
                            setManualPrUrl("");
                            setManualPrValidation({
                              status: "idle",
                              message: "",
                              normalizedUrl: null,
                            });
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={getPriorityColor(task.priority)}
              >
                <Flag className="mr-1 h-3 w-3" />
                {task.priority}
              </Badge>
              {task.due_date && (
                <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">
                  <Calendar className="mr-1 h-3.5 w-3.5" />
                  Due {formatDate(task.due_date)}
                </div>
              )}
              {(task.assigned_to || task.assignee) && (
                <AssignedUser task_id={task_id} fallback={task.assignee} size="sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col"
        >
          <div className="border-b border-zinc-200/60 dark:border-[#1E1F23] px-4 md:px-6 sticky top-0 z-10 bg-white dark:bg-[#111214]">
            <TabsList className="w-full flex overflow-x-auto justify-start md:grid md:grid-flow-col md:auto-cols-fr gap-2 bg-transparent h-auto p-0 hide-scrollbar relative">
              <TabsTrigger
                value="details"
                className="flex items-center gap-2 shrink-0 md:w-full justify-center px-4 py-3 text-xs font-semibold border-b-2 border-transparent text-zinc-500 dark:text-[#A1A1AA] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 dark:data-[state=active]:text-[#F5F5F5] rounded-none transition-all"
              >
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex items-center gap-2 shrink-0 md:w-full justify-center px-4 py-3 text-xs font-semibold border-b-2 border-transparent text-zinc-500 dark:text-[#A1A1AA] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 dark:data-[state=active]:text-[#F5F5F5] rounded-none transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                Notes ({task.notes?.filter((n) => !n.is_deleted).length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="sub_tasks"
                className="flex items-center gap-2 shrink-0 md:w-full justify-center px-4 py-3 text-xs font-semibold border-b-2 border-transparent text-zinc-500 dark:text-[#A1A1AA] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 dark:data-[state=active]:text-[#F5F5F5] rounded-none transition-all"
              >
                <CheckSquare className="h-4 w-4" />
                Sub-Tasks (
                {task.sub_tasks?.filter((st) => !st.is_deleted).length || 0})
              </TabsTrigger>
              {/* Show AI Feedback tab when task is submitted or completed */}
              {(effectiveTaskStatus === "completed" ||
                effectiveTaskStatus === "submitted") && (
                <TabsTrigger
                  value="feedback"
                  className="flex items-center gap-2 shrink-0 md:w-full justify-center px-4 py-3 text-xs font-semibold border-b-2 border-transparent text-zinc-500 dark:text-[#A1A1AA] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 dark:data-[state=active]:text-[#F5F5F5] rounded-none transition-all"
                >
                  <Star className="h-4 w-4" />
                  Review
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="details" className="m-0">
              <TaskDetailsTab task={task} isStudent={true} />
            </TabsContent>
            <TabsContent value="notes" className="m-0">
              <TaskNotesTab task={task} />
            </TabsContent>
            <TabsContent value="sub_tasks" className="m-0">
              <TaskSubTasksTab
                task={task}
                showGenerateBreakdown={canGenerateSubtaskBreakdown}
                userRole={viewerCompanySubrole}
              />
            </TabsContent>
            {/* Render Code Review content when task is submitted or completed */}
            {(effectiveTaskStatus === "completed" ||
              effectiveTaskStatus === "submitted") && (
              <TabsContent
                value="feedback"
                className="m-0 p-0"
              >
                {feedbackLoading ? (
                  <div className="h-full p-6 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading code review...</p>
                    </div>
                  </div>
                ) : reviewResponse && reviewResponse.review ? (
                  <div className="p-6">
                    <ReviewResponseView response={reviewResponse} />
                  </div>
                ) : reviewError ? (
                  <div className="h-full p-6 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      {reviewError.includes("longer than expected") ? (
                        <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4 animate-pulse" />
                      ) : (
                        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                      )}
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        {reviewError.includes("longer than expected")
                          ? "Code Review is in Progress"
                          : "Error Loading Code Review"}
                      </h3>
                      <p className="text-slate-600 mb-4">{reviewError}</p>
                      <Button
                        onClick={() => {
                          setReviewError(null);
                          void fetchCodeReviewSync();
                        }}
                        variant="outline"
                      >
                        {reviewError.includes("longer than expected")
                          ? "Check Status"
                          : "Try Again"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full p-6 flex items-center justify-center">
                    <div className="text-center">
                      <Star className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        No Code Review Available
                      </h3>
                      <p className="text-slate-600 mb-4">
                        A code review will be available once you submit your
                        pull request.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
