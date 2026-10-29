import { useState, useCallback } from 'react';

// Types based on the FastAPI backend structure

export interface ProjectCommit {
  id: string;
  commit_sha: string;
  author: string;
  author_email: string;
  message: string;
  timestamp: string;
  additions: number;
  deletions: number;
  files_changed: number;
  url: string;
  username: string;
  repo: string;
  synced_at: string;
}

export interface ProjectStatistics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  completion_percentage: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  overdue_tasks: number;
  high_priority_tasks: number;
  medium_priority_tasks: number;
  low_priority_tasks: number;
}

export interface CommitStats {
  total_commits: number;
  total_additions: number;
  total_deletions: number;
  unique_authors: number;
  files_changed: number;
}

export interface TaskDistribution {
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface ProgressItem {
  id: string;
  task_id: string;
  task_title: string;
  task_priority: string;
  progress_percentage: number;
  timestamp: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_hours: number;
  actual_hours: number;
  due_date?: string;
  assigned_to?: string;
}

export interface SyncCommitsResponse {
  message: string;
  total_fetched: number;
  saved_commits: number;
}

export interface ProjectDashboard {
  project_id: string;
  statistics: ProjectStatistics;
  commit_stats: CommitStats;
  tasks: Task[];
  recent_commits: ProjectCommit[];
  recent_progress: ProgressItem[];
  task_distribution: TaskDistribution;
  progress_timeline: ProgressItem[];
}

export interface summary {
  project_id: string;
  completion_percentage: number;
  total_tasks: number;
  total_commits: number;
  hours_spent: number;
  estimated_hours: number;
}

export interface UseProjectDataReturn {
  // Data
  commits: ProjectCommit[];
  dashboard: ProjectDashboard | null;
  summary: summary | null;
  statistics: ProjectStatistics | null;
  
  // Actions
  fetchCommits: (project_id: string, limit?: number) => Promise<ProjectCommit[]>;
  fetchDashboard: (project_id: string) => Promise<ProjectDashboard>;
  fetchSummary: (project_id: string) => Promise<summary>;
  fetchStatistics: (project_id: string) => Promise<ProjectStatistics>;
  syncCommits: (project_id: string, username: string, repo: string) => Promise<SyncCommitsResponse>;
  
  // State
  loading: boolean;
  error: string | null;
}

export function useProjectData(): UseProjectDataReturn {
  const [commits, setCommits] = useState<ProjectCommit[]>([]);
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [summary, setSummary] = useState<summary | null>(null);
  const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommits = useCallback(async (project_id: string, limit: number = 50): Promise<ProjectCommit[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/task/projects/${project_id}/commits?limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch commits');
      }

      const data = await response.json();
      setCommits(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboard = useCallback(async (project_id: string): Promise<ProjectDashboard> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/task/projects/${project_id}/dashboard`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard');
      }

      const data = await response.json();
      setDashboard(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (project_id: string): Promise<summary> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/task/projects/${project_id}/summary`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch summary');
      }

      const data = await response.json();
      setSummary(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async (project_id: string): Promise<ProjectStatistics> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/task/projects/${project_id}/statistics`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const syncCommits = useCallback(async (project_id: string, username: string, repo: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/task/projects/${project_id}/sync-commits?username=${encodeURIComponent(username)}&repo=${encodeURIComponent(repo)}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync commits');
      }

      const data = await response.json();
      // Refresh commits after sync
      await fetchCommits(project_id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCommits]);

  return {
    commits,
    dashboard,
    summary,
    statistics,
    fetchCommits,
    fetchDashboard,
    fetchSummary,
    fetchStatistics,
    syncCommits,
    loading,
    error,
  };
}

export default useProjectData;