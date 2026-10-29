/**
 * GitHub utility functions for the Kiyo application
 */

/**
 * Extracts username from a GitHub URL or returns the input if it's already a username
 * @param input - GitHub URL or username
 * @returns GitHub username or null if invalid
 */
export function extractGitHubUsername(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  // If it's already a username (no URL format)
  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed.toLowerCase();
  }

  // Extract from various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/\?#]+)/i, // https://github.com/username
    /^([^\/\?#]+)$/, // Just username
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Validates if a string is a valid GitHub username
 * @param username - The username to validate
 * @returns True if valid, false otherwise
 */
export function isValidGitHubUsername(username: string): boolean {
  if (!username || typeof username !== "string") {
    return false;
  }

  const trimmed = username.trim();

  // GitHub username rules:
  // - 1-39 characters
  // - Only letters, numbers, and hyphens
  // - Cannot start or end with hyphen
  // - Cannot have consecutive hyphens
  const usernameRegex = /^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/i;

  return usernameRegex.test(trimmed) && !trimmed.includes("--");
}

/**
 * Formats a GitHub URL from a username
 * @param username - GitHub username
 * @returns Full GitHub profile URL
 */
export function formatGitHubURL(username: string): string {
  const cleanUsername = extractGitHubUsername(username);
  return cleanUsername ? `https://github.com/${cleanUsername}` : "";
}

/**
 * Formats repository URL
 * @param username - GitHub username
 * @param repo - Repository name
 * @returns Full GitHub repository URL
 */
export function formatRepoURL(username: string, repo: string): string {
  const cleanUsername = extractGitHubUsername(username);
  return cleanUsername ? `https://github.com/${cleanUsername}/${repo}` : "";
}

/**
 * Calculates code quality score based on repository metrics
 * @param repo - Repository data
 * @param commits - Commit data
 * @returns Quality score from 0-100
 */
export function calculateCodeQuality(
  repo: {
    description?: string;
    size?: number;
    pushed_at?: string;
    stargazers_count?: number;
    forks_count?: number;
  },
  commits: Record<string, unknown>[] = [],
  languages: Record<string, number> = {},
): number {
  let score = 70; // Base score

  // Documentation bonus
  if (repo.description && repo.description.length > 20) {
    score += 5;
  }

  // Repository size bonus (indicates active development)
  if (repo.size && repo.size > 0) {
    score += 5;
  }

  // Recent activity bonus
  if (repo.pushed_at) {
    const daysSinceLastPush = Math.floor(
      (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastPush < 30) score += 10;
    else if (daysSinceLastPush < 90) score += 5;
  }

  // Commit frequency bonus
  if (commits.length > 10) score += 5;
  if (commits.length > 50) score += 5;

  // Language diversity bonus
  const languageCount = Object.keys(languages).length;
  if (languageCount > 1) score += 3;
  if (languageCount > 3) score += 2;

  // Community engagement bonus
  if (repo.stargazers_count && repo.stargazers_count > 10) score += 3;
  if (repo.forks_count && repo.forks_count > 5) score += 2;

  return Math.min(100, Math.max(0, score));
}

/**
 * Formats relative time for commits and activities
 * @param date - Date string or Date object
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const targetDate = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - targetDate.getTime()) / 1000,
    );

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2629746)
      return `${Math.floor(diffInSeconds / 604800)}w ago`;
    if (diffInSeconds < 31556952)
      return `${Math.floor(diffInSeconds / 2629746)}mo ago`;

    return `${Math.floor(diffInSeconds / 31556952)}y ago`;
  } catch {
    return "unknown";
  }
}

/**
 * Gets language color for visualization
 * @param language - Programming language name
 * @returns CSS color class or hex color
 */
export function getLanguageColor(language: string): string {
  const languageColors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    "C#": "#239120",
    Go: "#00ADD8",
    Rust: "#dea584",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Swift: "#fa7343",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#1572B6",
    Shell: "#89e051",
    Vue: "#41b883",
    React: "#61dafb",
  };

  return languageColors[language] || "#586069";
}

/**
 * Generates AI feedback based on commit patterns
 * @param commits - Array of recent commits
 * @returns Array of AI feedback suggestions
 */
export function generateAIFeedback(
  commits: Array<{
    message: string;
    timestamp: string;
    additions: number;
    deletions: number;
  }>,
): Array<{
  type: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "positive";
  file?: string;
  line?: number;
}> {
  const feedback = [];

  // Analyze commit messages
  const commitMessages = commits.map((c) => c.message.toLowerCase());
  const hasGoodPrefixes = commitMessages.some(
    (msg) =>
      msg.startsWith("feat:") ||
      msg.startsWith("fix:") ||
      msg.startsWith("refactor:"),
  );

  if (!hasGoodPrefixes && commits.length > 0) {
    feedback.push({
      type: "suggestion",
      title: "Commit Message Convention",
      description:
        'Consider using conventional commit prefixes like "feat:", "fix:", "refactor:" to improve commit history readability.',
      severity: "medium" as const,
    });
  }

  // Analyze commit frequency
  if (commits.length > 0) {
    const recentCommits = commits.filter((c) => {
      const commitDate = new Date(c.timestamp);
      const daysDiff =
        (Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    if (recentCommits.length > 10) {
      feedback.push({
        type: "improvement",
        title: "Great Activity Level",
        description:
          "Excellent commit frequency! You're maintaining consistent development activity.",
        severity: "positive" as const,
      });
    }
  }

  // Analyze commit sizes
  const largeCommits = commits.filter((c) => c.additions + c.deletions > 500);
  if (largeCommits.length > commits.length * 0.3) {
    feedback.push({
      type: "warning",
      title: "Large Commit Size",
      description:
        "Consider breaking down large commits into smaller, focused changes for better code review and maintenance.",
      severity: "medium" as const,
    });
  }

  return feedback;
}

/**
 * Validates if a URL is a valid GitHub pull request URL
 * @param url - The URL to validate
 * @returns Object with validation result and parsed components
 */
export function validateGitHubPRUrl(url: string): {
  isValid: boolean;
  owner?: string;
  repo?: string;
  number?: string;
  error?: string;
} {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "URL is required" };
  }

  try {
    const urlObj = new URL(url.trim());

    // Accept both github.com and api.github.com
    if (
      urlObj.hostname !== "github.com" &&
      urlObj.hostname !== "api.github.com"
    ) {
      return {
        isValid: false,
        error: "URL must be from github.com or api.github.com",
      };
    }

    let owner, repo, number;

    if (urlObj.hostname === "github.com") {
      // Match PR URL pattern: /owner/repo/pull/number
      const prMatch = urlObj.pathname.match(
        /^\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/,
      );
      if (prMatch) {
        [, owner, repo, number] = prMatch;
      }
    } else if (urlObj.hostname === "api.github.com") {
      // Match API URL patterns: /repos/owner/repo/pulls/number or /repos/owner/repo/issues/number
      const apiMatch = urlObj.pathname.match(
        /^\/repos\/([^\/]+)\/([^\/]+)\/(pulls|issues)\/(\d+)$/,
      );
      if (apiMatch) {
        [, owner, repo, , number] = apiMatch;
      }
    }

    if (owner && repo && number) {
      return {
        isValid: true,
        owner,
        repo,
        number,
      };
    }

    return {
      isValid: false,
      error: "URL is not a valid GitHub pull request URL",
    };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}

/**
 * Converts any GitHub PR URL (web or API) to a web URL
 * @param url - GitHub PR URL to convert
 * @returns Web URL or null if invalid
 */
export function convertToGitHubWebUrl(url: string): string | null {
  const validation = validateGitHubPRUrl(url);
  if (
    !validation.isValid ||
    !validation.owner ||
    !validation.repo ||
    !validation.number
  ) {
    return null;
  }

  return `https://github.com/${validation.owner}/${validation.repo}/pull/${validation.number}`;
}

/**
 * Fetches and validates a GitHub PR using the GitHub API
 * @param url - GitHub PR URL
 * @param token - Optional GitHub API token for private repos
 * @returns Promise with PR data or error
 */
export async function fetchAndValidateGitHubPR(
  url: string,
  token?: string,
): Promise<{
  isValid: boolean;
  data?: {
    title: string;
    body: string;
    state: string;
    html_url: string;
    user: {
      login: string;
    };
    pull_request?: unknown;
  };
  error?: string;
}> {
  const validation = validateGitHubPRUrl(url);
  if (!validation.isValid) {
    return { isValid: false, error: validation.error };
  }

  const { owner, repo, number } = validation;

  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Kiyo-App",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Try pulls API first
    let apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
    let response = await fetch(apiUrl, { headers });

    // If pulls API fails with 404, try issues API (PRs are also issues)
    if (!response.ok && response.status === 404) {
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
      response = await fetch(apiUrl, { headers });
    }

    if (!response.ok) {
      return {
        isValid: false,
        error: `GitHub API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Verify this is actually a pull request
    const isPR = data.pull_request || apiUrl.includes("/pulls/");
    if (!isPR) {
      return {
        isValid: false,
        error: "URL points to an issue, not a pull request",
      };
    }

    return {
      isValid: true,
      data,
    };
  } catch (fetchError) {
    return {
      isValid: false,
      error: `Failed to fetch PR: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
    };
  }
}

/**
 * Validates if a repository can have commits fetched
 * @param repo - Repository object from GitHub API
 * @returns True if repository likely has commits
 */
export function canFetchCommits(repo: {
  size?: number;
  pushed_at?: string;
  default_branch?: string;
}): boolean {
  // Repository is empty if size is 0 or no pushed_at date
  if (repo.size === 0 || !repo.pushed_at) {
    return false;
  }

  // If it was never pushed to, it's empty
  const pushedAt = new Date(repo.pushed_at);
  if (isNaN(pushedAt.getTime())) {
    return false;
  }

  return true;
}

/**
 * Handles GitHub API errors with specific messaging
 * @param error - The error object from GitHub API
 * @param context - Additional context for logging
 * @returns Formatted error message
 */
export function handleGitHubAPIError(error: {
  status?: number;
  message?: string;
  response?: { status?: number };
}): { shouldLog: boolean; message: string; status?: number } {
  const status = error?.status || error?.response?.status;
  const enableVerboseLogging = process.env.GITHUB_VERBOSE_LOGGING === "true";

  switch (status) {
    case 404:
      return {
        shouldLog: enableVerboseLogging, // Only log if verbose mode is enabled
        message: "Not found or no access",
        status: 404,
      };
    case 409:
      return {
        shouldLog: enableVerboseLogging, // Only log if verbose mode is enabled
        message: "Repository is empty or has no commits",
        status: 409,
      };
    case 403:
      return {
        shouldLog: true, // Rate limits should always be logged
        message: "Rate limit exceeded or access denied",
        status: 403,
      };
    case 401:
      return {
        shouldLog: true, // Auth issues should always be logged
        message: "Authentication failed",
        status: 401,
      };
    default:
      return {
        shouldLog: true, // Unexpected errors should always be logged
        message: error?.message || "Unknown error",
        status: status || 500,
      };
  }
}

/**
 * Creates a safe repository identifier for logging
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Safe identifier string
 */
export function createRepoIdentifier(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}
