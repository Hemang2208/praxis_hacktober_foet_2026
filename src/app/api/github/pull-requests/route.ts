import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/models/User";
import pull_request from "@/models/PullRequest";

// Helper to fetch PRs from GitHub
type GitHubPR = {
  url: string;
  html_url?: string;
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

const normalizepull_requestUrl = (input: string, fallbackHtmlUrl?: string) => {
  const candidate = (fallbackHtmlUrl || input || "").trim();
  if (!candidate) return input;
  // Prefer GitHub web URLs (needed by code-review-agent PR URL parsing)
  if (candidate.includes("github.com") && !candidate.includes("api.github.com")) {
    return candidate;
  }
  // Convert API URL to web URL when possible
  const apiMatch = candidate.match(
    /api\.github\.com\/repos\/(.+?)\/(.+?)\/(?:issues|pulls)\/(\d+)/,
  );
  if (apiMatch) {
    const [, owner, repo, number] = apiMatch;
    return `https://github.com/${owner}/${repo}/pull/${number}`;
  }
  return candidate;
};

async function fetchUserpull_requests(token: string): Promise<GitHubPR[]> {
  let allPRs: GitHubPR[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `https://api.github.com/search/issues?q=type:pr+author:@me&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (!res.ok) break;
    const data = await res.json();
    allPRs = allPRs.concat(data.items || []);
    hasMore = data.items && data.items.length === 100;
    page++;
  }
  // Normalize so callers can safely use `pr.url` as the web PR URL.
  return allPRs.map((pr: any) => {
    const normalizedUrl = normalizepull_requestUrl(String(pr?.url ?? ""), pr?.html_url);
    return {
      ...pr,
      url: normalizedUrl,
      html_url: pr?.html_url,
    } as GitHubPR;
  });
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const singleUrl = searchParams.get("singleUrl");

  // If singleUrl is provided, fetch that PR directly from GitHub
  if (singleUrl) {
    try {
      // Accept both github.com URLs and api.github.com URLs, and both /pull/ and /issues/ forms
      let owner: string | undefined;
      let repo: string | undefined;
      let number: string | undefined;

      try {
        const parsed = new URL(singleUrl);
        // Split and normalize path segments: remove empty parts
        const parts = parsed.pathname.split("/").filter(Boolean);
        // Possible shapes:
        // - github.com/: owner/repo/pull/:number
        // - github.com/: owner/repo/issues/:number
        // - api.github.com/: repos/owner/repo/pulls/:number
        // - api.github.com/: repos/owner/repo/issues/:number
        if (parts.length >= 4) {
          // handle api.github.com/repos/owner/repo/...
          if (parts[0] === "repos" && parts.length >= 5) {
            owner = parts[1];
            repo = parts[2];
            // pulls|pull|issues may appear at different indices
            number = parts[4];
          } else {
            // github.com/owner/repo/pull/123 or github.com/owner/repo/issues/123
            owner = parts[0];
            repo = parts[1];
            number = parts[3];
          }
        }
      } catch (err) {
        console.error("Error parsing singleUrl as URL:", singleUrl, err);
      }

      // Fallback: still try regex matches for odd cases
      if (!owner || !repo || !number) {
        let match = singleUrl.match(
          /github.com\/(.+?)\/(.+?)\/(?:pull|pulls)\/(\d+)/,
        );
        if (match) {
          [, owner, repo, number] = match;
        } else {
          match = singleUrl.match(/github.com\/(.+?)\/(.+?)\/issues\/(\d+)/);
          if (match) {
            [, owner, repo, number] = match;
          } else {
            match = singleUrl.match(
              /api.github.com\/repos\/(.+?)\/(.+?)\/(?:pulls|issues)\/(\d+)/,
            );
            if (match) {
              [, owner, repo, number] = match;
            }
          }
        }
      }

      // Ensure owner does not include a leading 'repos' segment accidentally
      if (owner && owner.startsWith("repos/")) {
        owner = owner.replace(/^repos\//, "");
      }

      if (!owner || !repo || !number) {
        console.error("Failed to parse PR URL:", singleUrl);
        return NextResponse.json({ error: "Invalid PR URL" }, { status: 400 });
      }

      // Get GitHub token from environment
      const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
      const headers: HeadersInit = {
        Accept: "application/vnd.github+json",
        "User-Agent": "Kiyo-App",
      };

      if (GITHUB_TOKEN) {
        headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
      }

      // Try pulls API first, then issues API (PRs are issues in GitHub API)
      let apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;

      let res = await fetch(apiUrl, { headers });

      // If pulls API fails, try issues API (pull requests are also issues)
      if (!res.ok) {
        apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
        res = await fetch(apiUrl, { headers });
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error("GitHub API error:", {
          status: res.status,
          statusText: res.statusText,
          body: errorText,
          url: apiUrl,
        });
        return NextResponse.json(
          {
            error: `PR not found: ${res.status} ${res.statusText}`,
            details: errorText,
          },
          { status: 404 },
        );
      }

      const pr = await res.json();
      // console.log("Successfully fetched PR data:", {
      //   title: pr.title,
      //   state: pr.state,
      // });

      const headSha = pr.head?.sha || null;
      const baseSha = pr.base?.sha || null;

      // Try to fetch diff via the .diff endpoint
      let diffText: string | null = null;
      try {
        // Use special Accept header to get diff format
        const diffHeaders: HeadersInit = {
          Accept: "application/vnd.github.v3.diff",
          "User-Agent": "Kiyo-App",
        };

        if (GITHUB_TOKEN) {
          diffHeaders["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
        }

        const diffUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;

        const diffRes = await fetch(diffUrl, { headers: diffHeaders });
        if (diffRes.ok) {
          const rawDiff = await diffRes.text();
          // Validate that we got actual diff content, not JSON
          if (rawDiff && !rawDiff.trim().startsWith("{")) {
            diffText = rawDiff;
            // console.log(
            //   "Successfully fetched diff, length:",
            //   diffText?.length || 0,
            // );
          } else {
            console.warn("Diff response appears to be JSON, not diff format");
          }
        } else {
          console.warn(
            "Failed to fetch PR diff:",
            diffRes.status,
            await diffRes.text(),
          );
        }
      } catch (e) {
        console.warn("Error fetching PR diff:", e);
      }

      const pull_request = {
        url: pr.html_url,
        title: pr.title,
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        user: {
          login: pr.user?.login || "unknown",
          avatar_url: pr.user?.avatar_url || "",
          html_url: pr.user?.html_url || "",
        },
        // Add pull_request specific data if available (from pulls API)
        pull_request: pr.pull_request || null,
        // Check if this is actually a pull request (issues API returns this)
        ispull_request: !!pr.pull_request || apiUrl.includes("/pulls/"),
        head_sha: headSha,
        base_sha: baseSha,
        // Ensure diff is a string, not a JSON object
        diff: diffText || "",
        // include number and repo owner/name for structured responses
        number:
          pr.number ||
          (pr.issue_url
            ? Number((pr.issue_url || "").split("/").pop())
            : undefined),
        repo_owner: owner,
        repo_name: repo,
      };

      console.log(
        "Returning PR with diff length:",
        pull_request.diff?.length || 0,
      );

      return NextResponse.json({ pull_request });
    } catch (error) {
      console.error("Error fetching PR:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch PR",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  // Default: fetch all PRs for the user
  // Replace with your auth logic to get user_id from session/cookie
  const user_id = req.headers.get("x-user-id");
  if (!user_id) {
    console.error("Missing x-user-id header for pull-requests API");
    return NextResponse.json(
      {
        error:
          "Missing x-user-id header. Please provide x-user-id in request headers or use singleUrl query parameter.",
      },
      { status: 400 },
    );
  }

  const user = await User.findById(user_id);

  if (!user) {
    console.error("User not found:", user_id);
    return NextResponse.json(
      {
        error: "User not found.",
      },
      { status: 400 },
    );
  }

  // Non-student roles (admin, manager, company) don't have personal GitHub tokens.
  // Return an empty PR list — linked PRs are visible via the singleUrl path instead.
  if (user.role !== "student") {
    return NextResponse.json({ pull_requests: [] });
  }

  const githubToken = "githubToken" in user ? user.githubToken : undefined;
  if (!githubToken) {
    console.error("GitHub token not found for user:", user_id);
    return NextResponse.json(
      {
        error: "GitHub token not found. Please connect your GitHub account.",
      },
      { status: 400 },
    );
  }

  try {
    const prs = await fetchUserpull_requests(githubToken);

    // Upsert PRs into pull_request collection
    for (const pr of prs) {
      if (!pr.url || !pr.state) continue;
      await pull_request.findOneAndUpdate(
        { "pull_request.url": pr.url, user_id: user._id },
        {
          user_id: user._id,
          task_id: null, // Not linked yet
          pull_request: {
            url: pr.url,
            branch: "", // GitHub API v3 search/issues does not return branch, can be filled later
            status: pr.state,
          },
          submitted_at: pr.created_at ? new Date(pr.created_at) : new Date(),
          status: pr.state,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    return NextResponse.json({ pull_requests: prs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch PRs" }, { status: 500 });
  }
}
