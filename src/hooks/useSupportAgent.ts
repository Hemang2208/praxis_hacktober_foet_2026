"use client";

import { useState, useCallback } from "react";
import { queueAwareFetch } from "@/lib/queueAwareFetch";
import useSWR from "swr";
import type {
  AskMeResponse,
  RecommendationsResponse,
  NextActionResponse,
  ProgressResponse,
  CompleteProfileResponse,
  MyStatsResponse,
  MyAllTasksResponse,
  MyProjectsResponse,
  MyProjectPlansResponse,
  Mypull_requestsResponse,
  MyCodeFeedbackResponse,
  MyNotificationsResponse,
  TaskAnalysisResponse,
  AnalyzeMyProgressResponse,
  TaskUpdateRequest,
  UpdatedTaskItem,
  StartTaskResponse,
  CompleteTaskResponse,
} from "@/types/support-agent";
import { SUPPORT_AGENT_URL } from "@/utils/API_URL";
import { fastAPIAuthService } from "@/lib/fastapi-auth";

export function useSupportAgent() {
  const { data } = useSWR("/api/auth/current-user", async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  });
  // Accepts: { user: { user_id, email, full_name, role }, success }
  const user = data && typeof data === "object" && data.user ? data.user : null;
  // Authenticated if user_id exists and success is true
  const isAuthenticated = Boolean(
    user && user.user_id && data.success === true
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed unused supportAgentToken and tokenFetchedAt

  // Export isAuthenticated so it is used by consumers (even if not used in this file)
  // This prevents the 'assigned a value but never used' warning in build
  // If you see this warning, ensure isAuthenticated is used in your consuming component
  const getBaseUrl = (): string => {
    const url = SUPPORT_AGENT_URL;
    console.debug("Support agent base URL:", url);
    return url.replace(/\/$/, "");
  };

  const requestSupportAgent = useCallback(
    async (
      path: string,
      init?: RequestInit & { timeoutMs?: number },
    ): Promise<Response> => {
      const base = getBaseUrl();
      const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
      return fetchWithTimeout(url, init);
    },
    [],
  );

  const fetchWithTimeout = async (
    input: RequestInfo | URL,
    init?: RequestInit & { timeoutMs?: number },
  ): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      let response = await queueAwareFetch(
        input,
        { ...init, signal: controller.signal },
        { maxPollAttempts: 45, pollIntervalMs: 2000, allowGetQueueHandling: true },
      );

      // Token expired/invalid — refresh and retry once
      if (response.status === 401) {
        const freshToken = await fastAPIAuthService.getAccessToken();
        if (freshToken) {
          const freshHeaders = { ...(init?.headers as Record<string, string> | undefined), Authorization: `Bearer ${freshToken}` };
          response = await queueAwareFetch(
            input,
            { ...init, headers: freshHeaders, signal: controller.signal },
            { maxPollAttempts: 45, pollIntervalMs: 2000, allowGetQueueHandling: true },
          );
        }
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Fetch current user id from backend (for support-agent authentication)
  // Removed unused getCurrentuser_id

  // Get FastAPI JWT token using the new auth service
  const ensureSupportAgentToken = useCallback(async (): Promise<string | null> => {
    try {
      // Get FastAPI access token via our auth service + API route
      const token = await fastAPIAuthService.getAccessToken();
      return token;
    } catch (err) {
      console.error("[useSupportAgent] Failed to get FastAPI token:", err);
      return null;
    }
  }, []);

  // Authorization header for support-agent endpoints (using FastAPI JWT)
  const getSupportAgentAuthHeader = useCallback(async (): Promise<string> => {
    const token = await ensureSupportAgentToken();
    const header = token ? `Bearer ${token}` : "Bearer anonymous";
    if (!token) {
      console.warn("No FastAPI token available, using anonymous header");
    }
    return header;
  }, [ensureSupportAgentToken]);

  // Parse JSON safely: if the response is not JSON (e.g., HTML error page),
  // read the text and throw a clearer error to avoid "Unexpected token '<'".
  const parseJsonSafe = async (response: Response) => {
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";

    const looksLikeJson =
      contentType.includes("application/json") ||
      text.trim().startsWith("{") ||
      text.trim().startsWith("[");

    if (!looksLikeJson) {
      throw new Error(
        `Expected JSON response but received ${response.status} ${
          response.statusText
        }: ${text.slice(0, 200)}`,
      );
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(
        `Invalid JSON response: ${(e as Error).message}. Body: ${text.slice(
          0,
          200,
        )}`,
      );
    }
  };

  /**
   * Update a specific task for the authenticated user.
   * PUT /agent/support-agent/v1/my-tasks/{task_id}
   */
  const updateMyTask = async (
    task_id: string,
    updates: TaskUpdateRequest,
    opts?: { fallbackTitle?: string; retryOn404?: boolean },
  ): Promise<UpdatedTaskItem> => {
    if (!task_id) throw new Error("task_id is required");

    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      if (authHeader === "Bearer anonymous") {
        throw new Error(
          "Support-agent authentication unavailable; please sign in again.",
        );
      }
      const doRequest = async (idToUse: string) => {
        const normalizeStatusForSupportAgent = (
          value: unknown,
        ): "todo" | "in_progress" | "done" | "cancelled" | undefined => {
          if (value == null) return undefined;
          const v = String(value).trim().toLowerCase();
          if (!v) return undefined;
          if (v === "todo") return "todo";
          if (v === "in_progress" || v === "in-progress" || v === "in progress" || v === "inprogress") {
            return "in_progress";
          }
          if (v === "done" || v === "completed" || v === "complete") return "done";
          if (v === "cancelled" || v === "canceled" || v === "blocked") return "cancelled";
          // Unknown statuses are not accepted by the support-agent API; omit.
          return undefined;
        };

        const normalizePriorityForSupportAgent = (
          value: unknown,
        ): "low" | "medium" | "high" | "urgent" | undefined => {
          if (value == null) return undefined;
          const v = String(value).trim().toLowerCase();
          if (!v) return undefined;
          if (v === "low") return "low";
          if (v === "medium") return "medium";
          if (v === "high") return "high";
          if (v === "urgent" || v === "critical") return "urgent";
          return undefined;
        };

        const sanitizedUpdates: TaskUpdateRequest = { ...(updates ?? {}) };
        if (sanitizedUpdates.status !== undefined) {
          const normalized = normalizeStatusForSupportAgent(sanitizedUpdates.status);
          if (normalized) sanitizedUpdates.status = normalized;
          else delete sanitizedUpdates.status;
        }

        if (sanitizedUpdates.priority !== undefined) {
          const normalizedPriority = normalizePriorityForSupportAgent(
            sanitizedUpdates.priority,
          );
          if (normalizedPriority) sanitizedUpdates.priority = normalizedPriority;
          else delete sanitizedUpdates.priority;
        }

        const response = await requestSupportAgent(
          `/my-tasks/${encodeURIComponent(idToUse)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify(sanitizedUpdates ?? {}),
            timeoutMs: 8000,
          },
        );

        if (response.status === 404) {
          throw new Error("Task not found");
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `Failed to update task: ${response.status} ${
              response.statusText
            }. ${errText.slice(0, 200)}`,
          );
        }

        const data = await parseJsonSafe(response);
        return data as UpdatedTaskItem;
      };

      try {
        return await doRequest(task_id);
      } catch (err) {
        const is404 =
          err instanceof Error &&
          err.message.toLowerCase().includes("not found");
        if (!is404 || !opts?.retryOn404 || !opts?.fallbackTitle) throw err;

        // Fallback: try to locate the task by title via My All Tasks and retry with that id
        try {
          const listRes = await requestSupportAgent(
            `/assistant/my-all-tasks?limit=200`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              timeoutMs: 8000,
            },
          );
          if (listRes.ok) {
            const raw = (await parseJsonSafe(listRes)) as {
              tasks?: Array<Record<string, unknown>>;
            };
            const found = (raw.tasks || []).find((t) => {
              const title = typeof t?.title === "string" ? t.title : "";
              return (
                title.trim().toLowerCase() ===
                opts.fallbackTitle!.trim().toLowerCase()
              );
            });
            const altId =
              typeof found?.task_id === "string"
                ? found.task_id
                : typeof found?._id === "string"
                  ? found._id
                  : typeof found?.id === "string"
                    ? found.id
                    : null;
            if (altId) {
              return await doRequest(altId);
            }
          }
        } catch (fallbackErr) {
          console.warn("Support-agent fallback lookup failed", fallbackErr);
        }

        throw err;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start a task (mark as in progress).
   * POST /agent/support-agent/v1/my-tasks/{task_id}/start/
   * Includes 404 fallback: if task not found, tries to resolve by title
   */
  const startMyTask = async (
    task_id: string,
    opts?: { fallbackTitle?: string; retryOn404?: boolean },
  ): Promise<StartTaskResponse> => {
    if (!task_id) throw new Error("task_id is required");

    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      if (authHeader === "Bearer anonymous") {
        throw new Error(
          "Support-agent authentication unavailable; please sign in again.",
        );
      }

      const doRequest = async (idToUse: string) => {
        const response = await requestSupportAgent(
          `/my-tasks/${encodeURIComponent(idToUse)}/start/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            timeoutMs: 8000,
          },
        );

        if (response.status === 404) {
          throw new Error("Task not found");
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `Failed to start task: ${response.status} ${
              response.statusText
            }. ${errText.slice(0, 200)}`,
          );
        }

        const data = await parseJsonSafe(response);
        return data as StartTaskResponse;
      };

      try {
        return await doRequest(task_id);
      } catch (err) {
        const is404 =
          err instanceof Error &&
          err.message.toLowerCase().includes("not found");
        if (!is404 || !opts?.retryOn404 || !opts?.fallbackTitle) throw err;

        // Fallback: try to locate the task by title via My All Tasks and retry with that id
        try {
          const listRes = await requestSupportAgent(
            `/assistant/my-all-tasks?limit=200`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              timeoutMs: 8000,
            },
          );
          if (listRes.ok) {
            const raw = (await parseJsonSafe(listRes)) as {
              tasks?: Array<Record<string, unknown>>;
            };
            const found = (raw.tasks || []).find((t) => {
              const title = typeof t?.title === "string" ? t.title : "";
              return (
                title.trim().toLowerCase() ===
                opts.fallbackTitle!.trim().toLowerCase()
              );
            });
            const altId =
              typeof found?.task_id === "string"
                ? found.task_id
                : typeof found?._id === "string"
                  ? found._id
                  : typeof found?.id === "string"
                    ? found.id
                    : null;
            if (altId) {
              return await doRequest(altId);
            }
          }
        } catch (fallbackErr) {
          console.warn("Support-agent fallback lookup failed", fallbackErr);
        }

        throw err;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete a task (mark as done).
   * POST /agent/support-agent/v1/my-tasks/{task_id}/complete/
   * Includes 404 fallback: if task not found, tries to resolve by title
   */
  const completeMyTask = async (
    task_id: string,
    opts?: { fallbackTitle?: string; retryOn404?: boolean },
  ): Promise<CompleteTaskResponse> => {
    if (!task_id) throw new Error("task_id is required");

    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      if (authHeader === "Bearer anonymous") {
        throw new Error(
          "Support-agent authentication unavailable; please sign in again.",
        );
      }

      const doRequest = async (idToUse: string) => {
        const response = await requestSupportAgent(
          `/my-tasks/${encodeURIComponent(idToUse)}/complete/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            timeoutMs: 8000,
          },
        );

        if (response.status === 404) {
          throw new Error("Task not found");
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `Failed to complete task: ${response.status} ${
              response.statusText
            }. ${errText.slice(0, 200)}`,
          );
        }

        const data = await parseJsonSafe(response);
        return data as CompleteTaskResponse;
      };

      try {
        return await doRequest(task_id);
      } catch (err) {
        const is404 =
          err instanceof Error &&
          err.message.toLowerCase().includes("not found");
        if (!is404 || !opts?.retryOn404 || !opts?.fallbackTitle) throw err;

        // Fallback: try to locate the task by title via My All Tasks and retry with that id
        try {
          const listRes = await requestSupportAgent(
            `/assistant/my-all-tasks?limit=200`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              timeoutMs: 8000,
            },
          );
          if (listRes.ok) {
            const raw = (await parseJsonSafe(listRes)) as {
              tasks?: Array<Record<string, unknown>>;
            };
            const found = (raw.tasks || []).find((t) => {
              const title = typeof t?.title === "string" ? t.title : "";
              return (
                title.trim().toLowerCase() ===
                opts.fallbackTitle!.trim().toLowerCase()
              );
            });
            const altId =
              typeof found?.task_id === "string"
                ? found.task_id
                : typeof found?._id === "string"
                  ? found._id
                  : typeof found?.id === "string"
                    ? found.id
                    : null;
            if (altId) {
              return await doRequest(altId);
            }
          }
        } catch (fallbackErr) {
          console.warn("Support-agent fallback lookup failed", fallbackErr);
        }

        throw err;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get AI analysis for a specific task.
   * Requires a valid `task_id` and authenticates via the same header logic used elsewhere.
   * The backend may use the task id to authorize access to the task's content.
   */
  const analyzeTask = async (
    task_id: string,
    includeContext: boolean = true,
  ): Promise<TaskAnalysisResponse> => {
    if (!task_id) throw new Error("task_id is required");

    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(
        `/my-tasks/${encodeURIComponent(task_id)}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ include_context: includeContext }),
          timeoutMs: 8000,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to analyze task: ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);
      return data as TaskAnalysisResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const askQuestion = async (
    query: string,
    includeContext: boolean = true,
  ): Promise<AskMeResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const requestBody: { query: string; include_context: boolean } = {
        query,
        include_context: includeContext,
      };

      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(`/assistant/ask-me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
        timeoutMs: 8000,
      });

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);
      return data as AskMeResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ask the AI assistant about your tasks.
   * Calls `/api/v1/assistant/ask-me/` and returns an AskMeResponse.
   */
  const askAssistant = async (
    query: string,
    includeContext: boolean = true,
  ): Promise<AskMeResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const requestBody: { query: string; include_context: boolean } = {
        query,
        include_context: includeContext,
      };

      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(`/assistant/ask-me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
        timeoutMs: 8000,
      });

      if (!response.ok) {
        throw new Error(`Failed to ask assistant: ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);
      return data as AskMeResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendations = async (): Promise<RecommendationsResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const doRequest = async () => {
        const authHeader = await getSupportAgentAuthHeader();
        return requestSupportAgent(`/assistant/recommendations`, {
          method: "GET", // Backend handles user data internally
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          // Recommendations can take longer because they aggregate multiple data sources
          timeoutMs: 20000,
        });
      };

      let response = await doRequest();

      // If token expired/invalid, refresh once and retry
      if (response.status === 401) {
        response = await doRequest();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to get recommendations: ${response.statusText}`,
        );
      }

      const data = await parseJsonSafe(response);
      const normalized: RecommendationsResponse = Array.isArray(data)
        ? { recommendations: data, timestamp: new Date().toISOString() }
        : (data as RecommendationsResponse);
      return normalized;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get personalized task recommendations.
   * Calls the backend endpoint `/api/v1/assistant/recommendations/`.
   */
  const getPersonalizedRecommendations =
    async (): Promise<RecommendationsResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const doRequest = async () => {
          const authHeader = await getSupportAgentAuthHeader();
          return requestSupportAgent(`/assistant/recommendations`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            // Personalized recommendations may be slower to compute
            timeoutMs: 20000,
          });
        };

        let response = await doRequest();

        // Refresh token on 401 and retry once
        if (response.status === 401) {
          response = await doRequest();
        }

        if (!response.ok) {
          throw new Error(
            `Failed to get personalized recommendations: ${response.statusText}`,
          );
        }

        const data = await parseJsonSafe(response);
        const normalized: RecommendationsResponse = Array.isArray(data)
          ? { recommendations: data, timestamp: new Date().toISOString() }
          : (data as RecommendationsResponse);
        return normalized;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    };

  const getNextAction = async (): Promise<NextActionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(`/assistant/next-action`, {
        method: "GET", // Backend handles user data internally
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        timeoutMs: 8000,
      });

      if (!response.ok) {
        throw new Error(`Failed to get next action: ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);
      const normalized: NextActionResponse = {
        recommendation: data.action || data.recommendation || "No action available",
        actionType: data.actionType || "priority",
        priority: data.priority || "medium",
        reasoning: data.reasoning || data.expected_impact || "No reasoning provided",
        context: {
          expected_impact: data.expected_impact,
          estimated_time: data.estimated_time,
          related_items: data.related_items || [],
        },
        timestamp: new Date().toISOString(),
      };
      return normalized;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyProgress = async (): Promise<ProgressResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(`/assistant/my-progress`, {
        method: "GET", // Backend handles user data internally
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        timeoutMs: 8000,
      });

      if (!response.ok) {
        throw new Error(`Failed to get progress: ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);
      console.log("Progress API response:", data);

      // Check if the response contains an error even with 200 status
      if (data.error || data.message) {
        throw new Error(data.error || data.message || "Unknown API error");
      }

      // Transform the flat API response to match the expected ProgressResponse structure
      const transformedData: ProgressResponse = {
        overall_progress: data.task_completion_rate || 0,
        tasks_summary: {
          total: data.total_tasks || 0,
          completed: data.completed_tasks || 0,
          in_progress: data.in_progress_tasks || 0,
          pending:
            data.pending_tasks ??
            Math.max(
              (data.total_tasks || 0) -
                (data.completed_tasks || 0) -
                (data.in_progress_tasks || 0),
              0,
            ),
        },
        projects_summary: {
          total: data.total_projects || 0,
          completed: 0, // Not provided in API response
          active: data.active_projects || 0,
        },
        skills_progress: {},
        recent_achievements: data.recent_achievements || [],
        areas_for_improvement: [],
        timestamp: new Date().toISOString(),
      };

      return transformedData;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get AI-powered analysis of your progress across all areas.
   * Calls `/api/v1/assistant/analyze-my-progress/`.
   */
  const analyzeMyProgress = async (): Promise<AnalyzeMyProgressResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(`/assistant/analyze-my-progress`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        timeoutMs: 8000,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to analyze my progress: ${response.statusText}`,
        );
      }

      const data = await parseJsonSafe(response);
      return data as AnalyzeMyProgressResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getCompleteProfile = async (): Promise<CompleteProfileResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(
        `/assistant/my-complete-profile`,
        {
          method: "GET", // Backend handles user data internally
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          timeoutMs: 8000,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get complete profile: ${response.statusText}`,
        );
      }

      const data = await parseJsonSafe(response);

      // Transform the flat API response to match the expected CompleteProfileResponse structure
      const transformedData: CompleteProfileResponse = {
        profile: {
          basic_info: data.user_profile || {},
          skills: data.skills_from_projects || data.user_profile?.skills || [],
          experience: data.user_profile?.experience || {},
          preferences: data.user_profile?.preferences || {},
        },
        activity_summary: {
          total_tasks: data.total_tasks || 0,
          completed_tasks: data.completed_tasks || 0,
          total_projects: data.user_profile?.experience?.projects?.length || 0,
          active_projects: data.active_projects || 0,
          github_contributions: 0, // Not provided in API response
          last_login: data.user_profile?.updated_at || new Date().toISOString(),
        },
        performance_metrics: {
          productivity_score: data.average_code_quality || 0,
          completion_rate:
            data.completed_tasks && data.total_tasks
              ? (data.completed_tasks / data.total_tasks) * 100
              : 0,
          average_task_time: 0, // Not provided in API response
          streak_days: 0, // Not provided in API response
        },
        tasks:
          data.tasks?.slice(0, 10).map((task: unknown) => ({
            _id: (task as Record<string, string>)._id,
            title: (task as Record<string, string>).title,
            status: (task as Record<string, string>).status,
            priority: (task as Record<string, string>).priority,
            created_at: (task as Record<string, string>).created_at,
          })) || [],
        code_quality_trend: data.code_quality_trend || [],
        recent_feedback:
          data.ai_feedback?.slice(0, 5).map((feedback: unknown) => ({
            _id: (feedback as Record<string, unknown>)._id,
            assessment: {
              overall:
                (
                  (feedback as Record<string, unknown>).assessment as Record<
                    string,
                    number
                  >
                )?.overall || 0,
              codeQuality:
                (
                  (feedback as Record<string, unknown>).assessment as Record<
                    string,
                    number
                  >
                )?.codeQuality || 0,
            },
            analysisDate: (feedback as Record<string, unknown>).analysisDate,
            totalIssues: (feedback as Record<string, unknown>).totalIssues,
          })) || [],
        pull_requests:
          data.pull_requests?.slice(0, 5).map((pr: unknown) => ({
            pull_request: {
              title:
                (
                  (pr as Record<string, unknown>).pull_request as Record<
                    string,
                    string
                  >
                )?.title || "",
              status:
                (
                  (pr as Record<string, unknown>).pull_request as Record<
                    string,
                    string
                  >
                )?.status || (pr as Record<string, string>).status,
              url:
                (
                  (pr as Record<string, unknown>).pull_request as Record<
                    string,
                    string
                  >
                )?.url || "",
            },
            submitted_at: (pr as Record<string, unknown>).submitted_at,
          })) || [],
        timestamp: new Date().toISOString(),
      };

      return transformedData;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyStats = async (): Promise<MyStatsResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(`/my-stats/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        timeoutMs: 8000,
      });

      if (!response.ok) {
        throw new Error(`Failed to get my stats: ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);
      return data as MyStatsResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyAllTask = async (
    limit: number = 10,
  ): Promise<MyAllTasksResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();

      console.log("[useSupportAgent] getMyAllTask starting...");
      console.log("[useSupportAgent] Auth header present:", !!authHeader && authHeader !== "Bearer anonymous");

      const response = await requestSupportAgent(
        `/assistant/my-all-tasks?limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          timeoutMs: 8000,
        },
      );

      console.log("[useSupportAgent] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[useSupportAgent] API returned error:", response.status, errorText.slice(0, 200));
        throw new Error(`Failed to get tasks: ${response.status} ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);

      console.log("[useSupportAgent] Raw tasks response:", {
        tasks_count: data.tasks?.length || 0,
        total_count: data.count,
        has_tasks: !!data.tasks,
      });

      // Validate response structure
      if (!data.tasks) {
        console.warn("[useSupportAgent] Response missing 'tasks' field, using empty array");
        data.tasks = [];
      }

      if (!Array.isArray(data.tasks)) {
        console.warn("[useSupportAgent] Tasks is not an array, converting to array");
        data.tasks = [data.tasks];
      }

      return data as MyAllTasksResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[useSupportAgent] Error in getMyAllTask:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyProjects = async (): Promise<MyProjectsResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();

      console.log("[useSupportAgent] getMyProjects starting...");
      console.log("[useSupportAgent] Auth header present:", !!authHeader && authHeader !== "Bearer anonymous");

      const response = await requestSupportAgent(`/assistant/my-projects`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        timeoutMs: 8000,
      });

      console.log("[useSupportAgent] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[useSupportAgent] API returned error:", response.status, errorText.slice(0, 200));
        throw new Error(`Failed to get projects: ${response.status} ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);

      console.log("[useSupportAgent] Raw API response:", {
        projects_count: data.projects?.length || 0,
        total_count: data.total_count,
        has_projects: !!data.projects,
        response_keys: Object.keys(data),
      });

      // Validate response structure
      if (!data.projects) {
        console.warn("[useSupportAgent] Response missing 'projects' field, using empty array");
        data.projects = [];
      }

      if (!Array.isArray(data.projects)) {
        console.warn("[useSupportAgent] Projects is not an array, converting to array");
        data.projects = [data.projects];
      }

      const result: MyProjectsResponse = {
        projects: (data.projects || []).map((project: any) => ({
          ...project,
          project_id: project.project_id || project._id || "",
          name: project.name || project.title || "Untitled Project",
          progress_percentage:
            typeof project.progress_percentage === "number"
              ? project.progress_percentage
              : typeof project.progress === "number"
                ? project.progress
                : 0,
          end_date: project.end_date || project.deadline,
        })),
        total_count: data.total_count ?? data.count ?? data.projects?.length ?? 0,
        summary: data.summary,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      console.log("[useSupportAgent] Returning projects response:", {
        projects_count: result.projects.length,
        total_count: result.total_count,
      });

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[useSupportAgent] Error in getMyProjects:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyProjectPlans = async (): Promise<MyProjectPlansResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();
      const response = await requestSupportAgent(
        `/assistant/my-project-plans`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          timeoutMs: 8000,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get project plans: ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);

      const rawPlans = data.project_plans || data.plans || [];
      const normalizedPlans = Array.isArray(rawPlans)
        ? rawPlans.map((plan: any) => ({
            ...plan,
            plan_id: plan.plan_id || plan._id || "",
            project_id: plan.project_id || (plan.project ? String(plan.project) : ""),
            title: plan.title || plan.summary || "Project Plan",
            description: plan.description || plan.summary || "",
            status: plan.status || "in_progress",
            milestones: plan.milestones || plan.major_milestones || [],
            deliverables: plan.deliverables || plan.key_features_deliverables || [],
          }))
        : [];

      return {
        project_plans: normalizedPlans,
        total_count: data.total_count ?? data.count ?? normalizedPlans.length,
        summary: data.summary,
        timestamp: data.timestamp || new Date().toISOString(),
      } as MyProjectPlansResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMypull_requests = async (): Promise<Mypull_requestsResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();

      console.log("[useSupportAgent] getMypull_requests starting...");
      const response = await requestSupportAgent(
        `/assistant/my-pull-requests`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          timeoutMs: 8000,
        },
      );

      console.log("[useSupportAgent] PRs Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[useSupportAgent] PRs API returned error:", response.status, errorText.slice(0, 200));
        throw new Error(`Failed to get pull requests: ${response.status} ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);

      console.log("[useSupportAgent] Raw PRs response:", {
        prs_count: data.pull_requests?.length || 0,
        total_count: data.count,
      });

      // Transform the API response to match the expected structure
      const normalizedPRs = (data.pull_requests || []).map((pr: unknown) => ({
        pr_id:
          (pr as Record<string, string>)._id ||
          (pr as Record<string, string>).githubId ||
          "",
        title:
          (pr as Record<string, Record<string, string>>).pull_request?.title ||
          "Untitled PR",
        description:
          (pr as Record<string, Record<string, string>>).pull_request
            ?.description || "",
        status:
          (pr as Record<string, string>).status ||
          (pr as Record<string, Record<string, string>>).pull_request?.status ||
          "unknown",
        state:
          (pr as Record<string, string>).status ||
          (pr as Record<string, Record<string, string>>).pull_request?.status,
        repository: (pr as Record<string, string>).repository || "",
        repository_url:
          (pr as Record<string, Record<string, string>>).pull_request?.url ||
          "",
        branch_name:
          (pr as Record<string, Record<string, string>>).pull_request?.branch ||
          "",
        created_at: (pr as Record<string, string>).submitted_at,
        task_id: (pr as Record<string, string>).task_id,
      }));

      return {
        pull_requests: normalizedPRs,
        total_count: data.count || data.pull_requests?.length || 0,
        timestamp: new Date().toISOString(),
      } as Mypull_requestsResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[useSupportAgent] Error in getMypull_requests:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyCodeFeedback = async (): Promise<MyCodeFeedbackResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();

      console.log("[useSupportAgent] getMyCodeFeedback starting...");
      const response = await requestSupportAgent(
        `/assistant/my-code-feedback`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          timeoutMs: 8000,
        },
      );

      console.log("[useSupportAgent] Feedback Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        const statusMessage =
          response.status === 401
            ? "Unauthorized - Please ensure you are logged in and your session is valid"
            : response.statusText;
        console.error("[useSupportAgent] Feedback API returned error:", response.status, errorText.slice(0, 100));
        throw new Error(
          `Failed to get code feedback: ${
            response.status
          } ${statusMessage}. ${errorText.slice(0, 100)}`,
        );
      }

      const data = await parseJsonSafe(response);

      console.log("[useSupportAgent] Raw feedback response:", {
        feedback_count: data.feedback?.length || 0,
        total_count: data.count,
      });

      // Validate response structure
      if (!data.feedback) {
        console.warn("[useSupportAgent] Response missing 'feedback' field, using empty array");
        data.feedback = [];
      }

      if (!Array.isArray(data.feedback)) {
        console.warn("[useSupportAgent] Feedback is not an array, converting to array");
        data.feedback = [data.feedback];
      }

      return data as MyCodeFeedbackResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[useSupportAgent] Error in getMyCodeFeedback:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyNotifications = async (
    limit: number = 50,
    unreadOnly: boolean = false,
  ): Promise<MyNotificationsResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeader = await getSupportAgentAuthHeader();

      console.log("[useSupportAgent] getMyNotifications starting...");
      console.log("[useSupportAgent] Params - limit:", limit, "unreadOnly:", unreadOnly);

      const response = await requestSupportAgent(
        `/assistant/my-notifications?limit=${limit}&unread_only=${unreadOnly}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          timeoutMs: 8000,
        },
      );

      console.log("[useSupportAgent] Notifications Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[useSupportAgent] Notifications API returned error:", response.status, errorText.slice(0, 200));
        throw new Error(`Failed to get notifications: ${response.status} ${response.statusText}`);
      }

      const data = await parseJsonSafe(response);

      console.log("[useSupportAgent] Raw notifications response:", {
        notifications_count: data.notifications?.length || 0,
        unread_count: data.unread_count || 0,
        total_count: data.count,
      });

      // Validate response structure
      if (!data.notifications) {
        console.warn("[useSupportAgent] Response missing 'notifications' field, using empty array");
        data.notifications = [];
      }

      if (!Array.isArray(data.notifications)) {
        console.warn("[useSupportAgent] Notifications is not an array, converting to array");
        data.notifications = [data.notifications];
      }

      return data as MyNotificationsResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[useSupportAgent] Error in getMyNotifications:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Core methods
    askQuestion,
    askAssistant,
    getRecommendations,
    getPersonalizedRecommendations,
    getNextAction,
    getMyProgress,
    getMyStats,
    analyzeTask,
    analyzeMyProgress,
    getCompleteProfile,
    getMyAllTask,
    getMyProjects,
    getMyProjectPlans,
    getMypull_requests,
    getMyCodeFeedback,
    getMyNotifications,
    updateMyTask,
    startMyTask,
    completeMyTask,
    ensureSupportAgentToken,

    // State
    isLoading,
    error,

    // Auth state
    isAuthenticated,
    user_id: user?.user_id || null,
  };
}
