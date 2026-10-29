import { useState, useCallback } from "react";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";

export interface ProjectCommit {
  _id?: string;
  commit_sha: string;
  author?: string;
  author_email?: string;
  message?: string;
  timestamp?: string;
  additions?: number;
  deletions?: number;
  files_changed?: number;
  url?: string;
  username?: string;
  repo?: string;
  synced_at?: string;
}

export interface SyncCommitsCounts {
  message?: string;
  total_fetched?: number;
  saved_commits?: number;
}

export interface SyncCommitsResponse {
  success: boolean;
  message?: string;
  data: {
    project_id: string;
    repository?: string;
    commitsCount: number;
    lastSync?: string;
    commits: ProjectCommit[];
  };
}

export interface SyncCommitsError {
  error: string;
  details?: string;
}

export interface UseSyncCommitsReturn {
  syncCommits: (
    project_id: string,
    username: string,
    repo: string,
  ) => Promise<SyncCommitsResponse>;
  getCommits: (
    project_id: string,
    limit?: number,
  ) => Promise<SyncCommitsResponse>;
  loading: boolean;
  error: string | null;
  data: SyncCommitsResponse | null;
}

export function useSyncCommits(): UseSyncCommitsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SyncCommitsResponse | null>(null);

  const parseErrorMessage = async (response: Response): Promise<string> => {
    try {
      const raw = await response.text();
      try {
        const json = JSON.parse(raw);
        return (
          json?.detail ||
          json?.error ||
          json?.message ||
          (typeof raw === "string" && raw.trim().length > 0
            ? raw
            : `HTTP ${response.status}`)
        );
      } catch {
        return raw?.trim?.() ? raw : `HTTP ${response.status}`;
      }
    } catch {
      return `HTTP ${response.status}`;
    }
  };

  const buildResponse = (
    project_id: string,
    commits: ProjectCommit[],
    message?: string,
    repositoryOverride?: string,
  ): SyncCommitsResponse => {
    const repository =
      repositoryOverride ||
      (commits[0]?.username && commits[0]?.repo
        ? `${commits[0].username}/${commits[0].repo}`
        : undefined);

    const latestMs = commits.reduce((max, c) => {
      const value = c.synced_at || c.timestamp;
      const ms = value ? Date.parse(value) : NaN;
      if (!Number.isFinite(ms)) return max;
      return Math.max(max, ms);
    }, 0);

    return {
      success: true,
      message,
      data: {
        project_id,
        repository,
        commitsCount: commits.length,
        lastSync: latestMs ? new Date(latestMs).toISOString() : undefined,
        commits,
      },
    };
  };

  const fetchCommitsList = useCallback(
    async (project_id: string, limit: number): Promise<ProjectCommit[]> => {
      const token = await fastAPIAuthService.getAccessToken();
      const url = `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/commits?limit=${limit}`;
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const result = await response.json().catch(() => null);
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.commits)
          ? result.commits
          : [];
      return list as ProjectCommit[];
    },
    [],
  );

  const syncCommits = useCallback(
    async (
      project_id: string,
      username: string,
      repo: string,
    ): Promise<SyncCommitsResponse> => {
      setLoading(true);
      setError(null);

      try {
        const token = await fastAPIAuthService.getAccessToken();
        const url = `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/sync-commits?username=${encodeURIComponent(username)}&repo=${encodeURIComponent(repo)}`;

        const response = await queueAwareFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const errorMsg = await parseErrorMessage(response);
          setError(errorMsg);
          throw new Error(errorMsg);
        }

        const counts = (await response
          .json()
          .catch(() => ({}))) as SyncCommitsCounts;
        const commits = await fetchCommitsList(project_id, 50);
        const next = buildResponse(
          project_id,
          commits,
          counts?.message,
          `${username}/${repo}`,
        );
        setData(next);
        return next;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCommitsList],
  );

  const getCommits = useCallback(
    async (
      project_id: string,
      limit: number = 50,
    ): Promise<SyncCommitsResponse> => {
      setLoading(true);
      setError(null);

      try {
        const commits = await fetchCommitsList(project_id, limit);
        const next = buildResponse(project_id, commits, undefined, undefined);
        setData(next);
        return next;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCommitsList],
  );

  return {
    syncCommits,
    getCommits,
    loading,
    error,
    data,
  };
}

export default useSyncCommits;
