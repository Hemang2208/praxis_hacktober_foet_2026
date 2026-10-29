import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  // ...other fields
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
export interface GitHubStats {
  totalCommits: number;
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  languages: Record<string, number>;
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
export interface GitHubData {
  user: GitHubUser | null;
  stats: GitHubStats | null;
  repositories: GitHubRepository[];
  // commits will hold either raw commits or entries with a __key for per-repo caching
  commits: (GitHubCommit | RepoCommitsEntry)[];
}

export interface RepoCommitsEntry {
  __key: string; // "owner/repo"
  items: unknown[]; // commits array from API
}

export interface GitHubState {
  data: GitHubData;
  loading: boolean;
  error: string | null;
  // map from "owner/repo" -> commits array
  repoCommits: Record<string, unknown[]>;
}

type CachedPayload<T> = {
  savedAt: number;
  data: T;
};

// Cache indefinitely until manual refresh (no TTL)
const readCache = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed?.savedAt || !parsed?.data) return null;
    // No TTL check - cache persists indefinitely until manually cleared
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = <T>(key: string, data: T) => {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedPayload<T> = { savedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
};

// Helper function to manually clear GitHub cache from localStorage
const clearGitHubCacheFromStorage = (username: string) => {
  if (typeof window === "undefined") return;
  try {
    const cacheKey = `github:user:${username.toLowerCase()}`;
    localStorage.removeItem(cacheKey);
    // Also clear all repo commits cache for this user
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("github:commits:")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {}
};

const initialState: GitHubState = {
  data: {
    user: null,
    stats: null,
    repositories: [],
    commits: [],
  },
  loading: false,
  error: null,
  repoCommits: {},
};

export const fetchGitHubData = createAsyncThunk(
  "github/fetchGitHubData",
  async (username: string, { rejectWithValue }) => {
    try {
      const cacheKey = `github:user:${username.toLowerCase()}`;
      const cached = readCache<GitHubData>(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Fetch with timeout (120s) to prevent hanging on slow API
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      
      try {
        const response = await fetch(`/api/github/user?username=${username}`, {
          signal: controller.signal,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch GitHub data");
        }
        
        const data = (await response.json()) as GitHubData;
        
        // Normalize commits - ensure it's always a valid array
        if (!data.commits || !Array.isArray(data.commits)) {
          data.commits = [];
        }
        
        // Ensure stats has proper structure
        if (!data.stats) {
          data.stats = {
            totalCommits: 0,
            totalRepos: 0,
            totalStars: 0,
            totalForks: 0,
            languages: {},
          };
        }
        
        writeCache(cacheKey, data);
        return data;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      // If fetch fails but we have cached data, return it gracefully
      // This prevents the "0 commits" issue on network failures
      if (err instanceof Error && (err.name === "AbortError" || err.message === "The operation was aborted")) {
        return rejectWithValue("Request timeout - using cached data if available");
      }
      
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }
      return rejectWithValue("Unknown error");
    }
  },
);

// Fetch commits for a specific owner/repo and cache them keyed by "owner/repo"
export const fetchRepoCommits = createAsyncThunk(
  "github/fetchRepoCommits",
  async (
    { owner, repo }: { owner: string; repo: string },
    { rejectWithValue },
  ) => {
    try {
      const key = `${owner}/${repo}`;
      const cacheKey = `github:commits:${key.toLowerCase()}`;
      const cached = readCache<unknown[]>(cacheKey);
      if (cached) {
        return { key, commits: cached };
      }
      const response = await fetch(
        `/api/github/commits?owner=${owner}&repo=${repo}`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch repo commits");
      }
      const data = (await response.json()) as unknown[];
      writeCache(cacheKey, data);
      return { key, commits: data };
    } catch (err) {
      if (err instanceof Error) return rejectWithValue(err.message);
      return rejectWithValue("Unknown error");
    }
  },
);

const githubSlice = createSlice({
  name: "github",
  initialState,
  reducers: {
    // Manually set commits for a repo (key = "owner/repo")
    setRepoCommits(state, action) {
      const { key, commits } = action.payload as {
        key: string;
        commits: unknown[];
      };
      state.repoCommits[key] = commits;
    },
    // Clear cached GitHub state (e.g., on logout)
    clearGitHubCache(state) {
      state.data = {
        user: null,
        stats: null,
        repositories: [],
        commits: [],
      };
      state.loading = false;
      state.error = null;
    },
    // Clear GitHub cache from localStorage (manual refresh)
    // Only clear localStorage, keep Redux state so old data stays visible while refreshing
    clearGitHubCacheStorage(state, action) {
      const username = action.payload as string;
      clearGitHubCacheFromStorage(username);
      // Don't clear state.data - let old data stay visible while fetching new data
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGitHubData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGitHubData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchGitHubData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRepoCommits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRepoCommits.fulfilled, (state, action) => {
        state.loading = false;
        const { key, commits } = action.payload as {
          key: string;
          commits: unknown[];
        };
        state.repoCommits[key] = commits;
      })
      .addCase(fetchRepoCommits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setRepoCommits, clearGitHubCache, clearGitHubCacheStorage } = githubSlice.actions;
export default githubSlice.reducer;
