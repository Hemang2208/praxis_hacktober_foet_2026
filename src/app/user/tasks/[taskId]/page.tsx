"use client";

import { useParams, useRouter } from "next/navigation";
import { useCachedTask } from "@/hooks/useCachedResources";
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
import {
  TASK_MGMT_AGENT_URL,
  CODE_REVIEW_AGENT_URL,
  PLANNER_AGENT_URL,
} from "@/utils/API_URL";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import { ReviewResponseView } from "@/components/ReviewResponseView";
import { useAppDispatch, useUser } from "@/redux/hooks";
import { Task, fetchTaskById, fetchTasksByProject, updateTask } from "@/redux/slice/task.slice";
import { DynamicBreadcrumbs } from "@/components/layout/DynamicBreadcrumbs";
import { validateGitHubPRUrl } from "@/lib/github";
import { buildCodeReviewMarkdown } from "@/lib/aiFeedback";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";
import useUserProfile from "@/hooks/useUserProfile";
import { getViewerCompanySubrole } from "@/lib/company-rbac";

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

// AI Feedback type (matching AIFeedbackView interface)

// Helper function to convert GitHub API URLs to web URLs
const normalizeGitHubWebUrlForReview = (url: string): string | null => {
  if (!url) return null;

  // If it's already a web URL, return as is
  if (url.includes("github.com") && !url.includes("api.github.com")) {
    return url;
  }

  // Convert API URL to web URL
  const apiMatch = url.match(
    /api\.github\.com\/repos\/(.+?)\/(.+?)\/(?:issues|pulls)\/(\d+)/,
  );
  if (apiMatch) {
    const [, owner, repo, number] = apiMatch;
    return `https://github.com/${owner}/${repo}/pull/${number}`;
  }

  return url; // Return original if can't convert
};

const normalizepull_requestUrlForReview = (url: string): string | null => {
  const converted = normalizeGitHubWebUrlForReview(url);
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
  const [redirected, setRedirected] = useState(false);
  const { user } = useUser();
  const { mongoUser: viewerProfile } = useUserProfile();
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const task_id = params.task_id as string;

  const { task, loading, isCached } = useCachedTask(task_id);

  // Redirect to nested route if task has project_id
  useEffect(() => {
    if (task && task.project_id && !redirected) {
      setRedirected(true);
      const searchParams =
        typeof window !== "undefined" ? window.location.search : "";
      router.replace(
        `/user/projects/${task.project_id}/board/tasks/${task_id}${searchParams}`,
      );
    }
  }, [task, task_id, router, redirected]);

  // GitHub PRs state
  const [prs, setPrs] = useState<GitHubPR[]>([]);
  const [prLoading, setPrLoading] = useState(false);
  const [selectedPr, setSelectedPr] = useState<string>("none");
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
  const [isEditingPR, setIsEditingPR] = useState(false);

  const effectiveTaskStatus =
    optimisticTaskState.status ?? task?.status ?? "todo";
  const effectiveLinkedPrId =
    optimisticTaskState.linkedPrId !== undefined
      ? optimisticTaskState.linkedPrId
      : (task?.linked_pr_id || task?.linked_pull_request?.pull_request?.url || null);

  const viewerCompanySubrole = getViewerCompanySubrole(viewerProfile as any);
  const canGenerateSubtaskBreakdown =
    viewerCompanySubrole === "owner" || viewerCompanySubrole === "admin";

  // Code-review state (now only review response)
  const [reviewResponse, setReviewResponse] = useState<ReviewResponse | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "details";
    return new URLSearchParams(window.location.search).get("tab") === "feedback"
      ? "feedback"
      : "details";
  });

  // Handle rating submission (only agent endpoint, no fallback)

  // Manual review request (async) - sends request to agent to perform a manual review
  // Only one review sync button, using new endpoint
  // Only use agent endpoint for code review feedback
  const fetchCodeReviewSync = useCallback(
    async (repoPath?: string) => {
      if (!task_id || !user?._id) return;
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
        const cacheKey = buildReviewCacheKey(
          String(user?._id || ""),
          task_id,
          finalRepoPath,
        );
        const cached = getCachedReview(cacheKey);
        if (cached) {
          setReviewResponse(cached);
          return;
        }
        // Check if we already have a saved review from the DB (via task.ai_feedback)
        // to avoid regenerating
        if (task?.ai_feedback) {
          const saved = task.ai_feedback;
          const savedReview = typeof saved === "string" ? saved : ((saved as any)?.review || (saved as any)?.summary || "");
          if (typeof savedReview === "string" && savedReview.trim()) {
            const responsePayload: ReviewResponse = { review: savedReview };
            setReviewResponse(responsePayload);
            setCachedReview(cacheKey, responsePayload);
            return;
          }
        }
        setFeedbackLoading(true);
        const accessToken = await fastAPIAuthService.getAccessToken();
        if (!accessToken) {
          toast.error("Authentication required for code review.");
          return;
        }
        console.log("🔍 QUEUE_COMPLETED — fetchCodeReviewSync polling finished");
        const res = await queueAwareFetch(`${CODE_REVIEW_AGENT_URL}/review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ repo_path: finalRepoPath, task_id, project_id: (task as any)?.project_id || undefined, max_chunks: 10 }),
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
          console.log("🔍 RESULT_RECEIVED — fetchCodeReviewSync got review data");
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
            console.log("🔍 TASK_REFETCHED — fetchTaskById after code review");
          } else {
            setReviewResponse(null);
            if (status === "error") {
              toast.error(message || "Code review failed.");
              setReviewError(message || "Code review failed.");
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
    [dispatch, task_id, effectiveLinkedPrId, user?._id, task],
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Find the selected PR details
      const finalPrUrl = resolvedPrUrl;
      const pr_details = prs.find((pr) => pr.url === finalPrUrl);
      if (!finalPrUrl) {
        toast.error("Please select or verify a pull request URL.");
        return;
      }

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

      if (!task_id) {
        toast.error("Invalid Task ID. Please refresh the page and try again.");
        return;
      }

      // Update external progress using shared helper (non-blocking)
      try {
        const { updateExternalTaskProgress } =
          await import("@/lib/externalProgress");
        await updateExternalTaskProgress(
          task_id,
          statusToProgress("submitted"),
          { status: "submitted" },
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
            status: "submitted",
            pr_details,
            user_id: String(user?._id || "") || null,
          } as Partial<Task> & Record<string, unknown>,
        }),
      ).unwrap();

      // Call the code-review agent to start generating the review
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
            project_id: (task as any)?.project_id || undefined,
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
        status: "submitted",
        linkedPrId: finalPrUrl,
      });
      setIsLinked(true);
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
        toast.error(
          "Failed to update external task progress. Unlink aborted. " + msg,
        );
        setSubmitting(false);
        return;
      }

      await dispatch(
        updateTask({
          id: task_id,
          updates: { linked_pr_id: null, status: "in-progress" },
        }),
      ).unwrap();
      setOptimisticTaskState({
        status: "in-progress",
        linkedPrId: null,
      });
      setIsLinked(false);
      setSelectedPr("none");
      setSubmitting(false);
      // Remove review response from UI immediately when PR is unlinked
      setReviewResponse(null);
      setReviewError(null);
      if (task?.linked_pr_id && user?._id) {
        removeCachedReview(
          buildReviewCacheKey(
            String(user?._id || ""),
            task_id,
            task.linked_pr_id,
          ),
        );
      }

      // Refresh task so UI updates without full reload
      try {
        await dispatch(fetchTaskById(task_id));
      } catch {
        // non-blocking
      }

      // Refresh project task list so project Timeline reflects PR link/status changes.
      try {
        const pid = (task as any)?.project_id;
        if (typeof pid === "string" && pid.trim()) {
          void dispatch(fetchTasksByProject(pid));
        }
      } catch {
        // non-blocking
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

    setSubmitting(true);
    try {
      const pr_details = prs.find((pr) => pr.url === resolvedPrUrl);

      // Update task with new PR link via Redux thunk
      await dispatch(
        updateTask({
          id: task_id,
          updates: {
            linked_pr_id: resolvedPrUrl,
            status: effectiveTaskStatus,
            pr_details,
            user_id: String(user?._id || "") || null,
          } as Partial<Task> & Record<string, unknown>,
        }),
      ).unwrap();

      // Clear old review cache before fetching new one
      if (task?.linked_pr_id && user?._id) {
        removeCachedReview(
          buildReviewCacheKey(
            String(user?._id || ""),
            task_id,
            task.linked_pr_id,
          ),
        );
      }

      // Notify code review agent of the PR change (same as initial submission)
      try {
        const finalUrl = resolvedPrUrl;
        if (!finalUrl) return;
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
              repo_path: finalUrl,
              task_id,
              project_id: (task as any)?.project_id || undefined,
              max_chunks: 10,
            }),
          },
        );
        if (!reviewRes.ok) {
          const txt = await reviewRes.text();
          console.error(
            "Failed triggering code review for PR change:",
            reviewRes.status,
            txt,
          );
        }
      } catch (e) {
        console.error("Failed triggering code review for PR change:", e);
      }

      // Refresh task to reflect changes
      try {
        await dispatch(fetchTaskById(task_id)).unwrap();
      } catch (e) {
        console.warn("Failed to refresh task after PR update:", e);
      }

      // Refresh project task list
      try {
        const pid = (task as any)?.project_id;
        if (typeof pid === "string" && pid.trim()) {
          void dispatch(fetchTasksByProject(pid)).unwrap();
        }
      } catch (e) {
        console.warn("Failed to refresh project tasks:", e);
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

      void (async () => {
        try {
          if (resolvedPrUrl) {
            const accessToken = await fastAPIAuthService.getAccessToken();
            await fetch(`${CODE_REVIEW_AGENT_URL}/review`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: JSON.stringify({
                repo_path: resolvedPrUrl,
                task_id,
                project_id: (task as any)?.project_id || undefined,
                max_chunks: 10,
              }),
            });
          }
        } catch (e) {
          console.error("Failed triggering code review for PR change:", e);
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
    if (!task || !user?._id) return;
    if (activeTab !== "feedback") return;

    if (
      effectiveTaskStatus !== "completed" &&
      effectiveTaskStatus !== "submitted"
    )
      return;

    const storedReview =
      task?.ai_feedback?.review?.trim() ||
      (task?.ai_feedback ? buildCodeReviewMarkdown(task.ai_feedback) : "");
    if (storedReview) {
      if (!reviewResponse?.review || reviewResponse.review !== storedReview) {
        setReviewResponse({ review: storedReview });
      }
      return;
    }

    if (feedbackLoading) return;
    if (reviewResponse?.review) return;
    if (reviewError) return;

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
    user?._id,
    feedbackLoading,
    reviewResponse,
    reviewError,
    task?.ai_feedback?.review,
    task?.ai_feedback,
    effectiveTaskStatus,
    effectiveLinkedPrId,
    fetchCodeReviewSync,
  ]);

  const [projectRepo, setProjectRepo] = useState<string | null>(null);

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
      projectRepo &&
      normalizeRepoIdentifier(`${validation.owner}/${validation.repo}`) !==
        normalizeRepoIdentifier(projectRepo)
    ) {
      setManualPrValidation({
        status: "invalid",
        message: `Use a PR from the linked repository: ${projectRepo}`,
        normalizedUrl: null,
      });
      return false;
    }

    setManualPrValidation({
      status: "valid",
      message: "URL is valid.",
      normalizedUrl: normalizeGitHubWebUrlForReview(trimmed) || trimmed,
    });
    return true;
  }, [manualPrUrl, normalizeRepoIdentifier, projectRepo]);

  const resolvedPrUrl =
    manualPrValidation.status === "valid" && manualPrValidation.normalizedUrl
      ? manualPrValidation.normalizedUrl
      : selectedPr !== "none"
        ? selectedPr
        : null;

  useEffect(() => {
    async function fetchProject() {
      const pid = (task as any)?.project_id;
      if (!pid) return;
      try {
        const res = await fetch(`${PLANNER_AGENT_URL}/projects/${pid}`);
        const data = await res.json();
        const p = data.project || data;
        if (p?.github_repository) {
          setProjectRepo(p.github_repository);
        }
      } catch (err) {
        console.error("Failed to fetch project for repository linking", err);
      }
    }
    fetchProject();
  }, [task]);

  useEffect(() => {
    async function fetchPRs() {
      setPrLoading(true);
      try {
        if (!user?._id) {
          setPrs([]);
          setPrLoading(false);
          return;
        }
        const res = await fetch("/api/github/pull-requests", {
          headers: {
            "x-user-id": String(user?._id || ""),
          },
        });
        const data = await res.json();
        let fetchedPrs = Array.isArray(data.pull_requests)
          ? data.pull_requests
          : [];

        // Filter PRs by the project's linked repository if available
        if (projectRepo) {
          fetchedPrs = fetchedPrs.filter((pr: any) => {
            const prUrl = pr.url || "";
            // Check if PR URL contains the repo name (e.g. owner/repo)
            return prUrl.toLowerCase().includes(projectRepo.toLowerCase());
          });
        }

        setPrs(fetchedPrs);
      } catch {
        setPrs([]);
      } finally {
        setPrLoading(false);
      }
    }
    fetchPRs();
  }, [user, projectRepo]);

  // Reset editing state when PR link changes to prevent stale UI state
  useEffect(() => {
    setIsEditingPR(false);
    setSelectedPr("none");
    setManualPrUrl("");
    setManualPrValidation({
      status: "idle",
      message: "",
      normalizedUrl: null,
    });
    setReviewError(null);
  }, [task?.linked_pr_id, effectiveLinkedPrId]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/user/tasks");
  };

  // Skeleton Loading Component
  function TaskDetailSkeleton() {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 flex flex-col">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-6 md:px-8">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-10 w-2/3" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 px-6 py-8 md:px-8 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Show skeleton while loading, unless we have cached data
  if (loading && !isCached) {
    return <TaskDetailSkeleton />;
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
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
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
    <div className="h-[calc(100vh-5rem)] overflow-y-auto bg-white dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-6 md:px-8">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
              {task.title}
            </h1>
            {/* Show linked PR box and link/unlink UI */}
            {/* When status is "completed", show linked PR as read-only. Otherwise, allow linking/editing */}
            {effectiveTaskStatus === "completed" ? (
              <>
                {(linkedPR || effectiveLinkedPrId) && (
                  <div className="mt-2 mb-4 p-2 border rounded bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckSquare className="h-4 w-4" /> Linked Pull Request
                        </span>
                        <a
                          href={
                            normalizeGitHubWebUrlForReview(
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
                    </div>
                  </div>
                )}
              </>
            ) : !effectiveLinkedPrId ? (
              <div className="mt-2 mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Link Pull Request
                </label>
                <div className="grid gap-4 lg:grid-cols-2">
                  {prLoading ? (
                    <div className="text-xs text-slate-500">Loading PRs...</div>
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
            ) : (
              <>
                {(linkedPR || effectiveLinkedPrId) && (
                  <div className="mt-2 mb-4 p-2 border rounded bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckSquare className="h-4 w-4" /> Linked Pull Request
                        </span>
                        <a
                          href={
                            normalizeGitHubWebUrlForReview(
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
                      {!isEditingPR && effectiveTaskStatus !== "submitted" && (
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
                  </div>
                )}
                {isEditingPR && (effectiveLinkedPrId || linkedPR) && (
                  <div className="mt-2 mb-4 p-4 border rounded bg-blue-50">
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
                <div className="flex items-center text-sm text-slate-500">
                  <Calendar className="mr-1 h-3 w-3" />
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
          <div className="border-b border-slate-200 dark:border-slate-700 px-6">
            <TabsList className="w-full grid grid-flow-col auto-cols-fr gap-2">
              <TabsTrigger
                value="details"
                className="flex items-center gap-2 w-full justify-center px-3"
              >
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex items-center gap-2 w-full justify-center px-3"
              >
                <MessageSquare className="h-4 w-4" />
                Notes ({task.notes?.filter((n) => !n.is_deleted).length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="sub_tasks"
                className="flex items-center gap-2 w-full justify-center px-3"
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
                  className="flex items-center gap-2 w-full justify-center px-3"
                >
                  <Star className="h-4 w-4" />
                  Code Review
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
                userRole={
                  viewerCompanySubrole as
                    | "owner"
                    | "admin"
                    | "manager"
                    | "trainee"
                }
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
