import { useState, useEffect, useCallback } from "react";

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  html_url: string;
  private: boolean;
  size: number;
}

export interface GitHubCommit {
  id: string;
  message: string;
  author: string;
  timestamp: string;
  repository: string;
  branch: string;
  url?: string;
  additions: number;
  deletions: number;
}

export interface GitHubStats {
  totalCommits: number;
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  languages: Record<string, number>;
}

export interface GitHubData {
  user: GitHubUser | null;
  stats: GitHubStats | null;
  repositories: GitHubRepository[];
  commits: GitHubCommit[];
}

export interface RepositoryCommit {
  sha: string;
  message: string;
  author: {
    name?: string;
    email?: string;
    date?: string;
  };
  committer: {
    name?: string;
    email?: string;
    date?: string;
  };
  url: string;
  stats?: {
    additions?: number;
    deletions?: number;
    total?: number;
  };
}

export interface RepositoryContributor {
  login: string;
  contributions: number;
  avatar_url: string;
  html_url: string;
}

export interface Repositorypull_request {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  author?: string;
  html_url: string;
}

export interface RepositoryIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  author?: string;
  labels: {
    name?: string;
    color?: string;
  }[];
  html_url: string;
}

export interface RepositoryData {
  repository: GitHubRepository;
  commits: RepositoryCommit[];
  contributors: RepositoryContributor[];
  languages: Record<string, number>;
  pull_requests: Repositorypull_request[];
  issues: RepositoryIssue[];
  analytics: {
    codeQualityScore: number;
    totalCommits: number;
    totalContributors: number;
    openpull_requests: number;
    closedpull_requests: number;
    openIssues: number;
    closedIssues: number;
  };
}

export function useGitHubRepository(username?: string, repo?: string) {
  const [data, setData] = useState<RepositoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fetch user from /api/auth/current-user or use context

  const isSignedIn = true;

  const fetchRepositoryData = useCallback(async (githubUsername: string, repoName: string) => {
    if (!isSignedIn || !githubUsername || !repoName) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/repository?username=${githubUsername}&repo=${repoName}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch repository data");
      }

      const repoData = await response.json();
      setData(repoData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      console.error("Error fetching repository data:", err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (username && repo) {
      fetchRepositoryData(username, repo);
    }
  }, [username, repo, fetchRepositoryData]);

  return {
    data,
    loading,
    error,
    refetch: () => username && repo && fetchRepositoryData(username, repo),
  };
}
