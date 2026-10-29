import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { User, IStudent } from "@/models/User";
import {
  canFetchCommits,
  handleGitHubAPIError,
  createRepoIdentifier,
} from "@/lib/github";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return NextResponse.json(
        { error: "GitHub username is required" },
        { status: 400 },
      );
    }

    // Sanitize username - remove trailing slashes and trim whitespace
    const username = rawUsername.trim().replace(/\/$/, "");

    if (!username) {
      return NextResponse.json(
        { error: "Invalid GitHub username format" },
        { status: 400 },
      );
    }

    // Connect DB and load user record to pick up a per-user GitHub token if available
    await dbConnect();

    // Use MongoDB _id for lookup
    const appUser = await User.findById(user._id).lean();
    // Only students have githubToken property
    const userToken =
      appUser && appUser.role === "student"
        ? (appUser as unknown as IStudent).githubToken ||
          process.env.GITHUB_ACCESS_TOKEN
        : process.env.GITHUB_ACCESS_TOKEN;
    const octokit = new Octokit({ auth: userToken });

    // Fetch user info
    const userResponse = await octokit.rest.users.getByUsername({
      username,
    });

    // Check if the username matches the authenticated user (token owner)
    let isAuthenticatedUser = false;
    try {
      const authUserResponse = await octokit.rest.users.getAuthenticated();
      isAuthenticatedUser =
        authUserResponse.data.login.toLowerCase() === username.toLowerCase();
    } catch (error) {
      console.log("Could not verify authenticated user:", error);
    }

    // Fetch all repositories (paginated)
    let allRepos = [];
    let page = 1;
    let fetchMore = true;
    while (fetchMore) {
      const repoPage = isAuthenticatedUser
        ? await octokit.rest.repos.listForAuthenticatedUser({
            visibility: "all",
            sort: "updated",
            per_page: 100,
            page,
          })
        : await octokit.rest.repos.listForUser({
            username,
            sort: "updated",
            per_page: 100,
            page,
          });
      allRepos = allRepos.concat(repoPage.data);
      fetchMore = repoPage.data.length === 100;
      page++;
    }

    // Calculate total commits for the user across all repositories
    let totalCommits = 0;
    const recentCommits = [];

    // Limit to first 15 repos to get more commit coverage
    const reposToProcess = allRepos.slice(0, 15);

    for (const repo of reposToProcess) {
      const repoId = createRepoIdentifier(repo.owner.login, repo.name);

      try {
        // Skip repositories that can't have commits
        if (!canFetchCommits(repo)) {
          continue;
        }

        // Get contributors stats for the repo
        const statsResponse = await octokit.rest.repos.getContributorsStats({
          owner: repo.owner.login,
          repo: repo.name,
        });
        const userStats = Array.isArray(statsResponse.data)
          ? statsResponse.data.find(
              (contributor) =>
                contributor.author &&
                contributor.author.login &&
                contributor.author.login.toLowerCase() ===
                  username.toLowerCase(),
            )
          : undefined;
        if (userStats) {
          totalCommits += userStats.total;
        }

        // Get recent commits for display (last 30 per repo)
        let commitsResponse;
        try {
          commitsResponse = await octokit.rest.repos.listCommits({
            owner: repo.owner.login,
            repo: repo.name,
            author: username,
            per_page: 30,
          });
        } catch (err: unknown) {
          const error = err as { status?: number; message?: string };
          const errorInfo = handleGitHubAPIError(error);
          if (errorInfo.shouldLog) {
            console.log(`${errorInfo.message} for ${repoId}`);
          }
          continue;
        }

        for (const commit of commitsResponse.data) {
          // Fetch commit details with timeout to avoid hanging
          let additions = 0;
          let deletions = 0;
          let total = 0;
          try {
            // Create a promise that rejects after 5 seconds
            const commitDetailsPromise = octokit.rest.repos.getCommit({
              owner: repo.owner.login,
              repo: repo.name,
              ref: commit.sha,
            });

            const commitDetails = (await Promise.race([
              commitDetailsPromise,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000),
              ),
            ])) as any;

            additions = commitDetails.data.stats?.additions || 0;
            deletions = commitDetails.data.stats?.deletions || 0;
            total = commitDetails.data.stats?.total || 0;
          } catch (err: unknown) {
            // If commit details timeout or fail, use 0 stats instead of failing the entire request
            additions = 0;
            deletions = 0;
            total = 0;
          }
          recentCommits.push({
            id: commit.sha.substring(0, 7),
            message: commit.commit.message,
            author: commit.commit.author?.name || username,
            timestamp: commit.commit.author?.date,
            repository: repo.name,
            branch: commit?.commit?.tree?.sha ? "main" : "",
            url: commit.html_url,
            additions,
            deletions,
            total,
          });
        }
      } catch (error: unknown) {
        // Use utility function for consistent error handling
        const repoId = createRepoIdentifier(repo.owner.login, repo.name);
        const githubError = error as { status?: number; message?: string };
        const errorInfo = handleGitHubAPIError(githubError);

        if (errorInfo.shouldLog) {
          console.log(`${errorInfo.message} while processing ${repoId}`);
        }

        continue;
      }
    }

    // Sort commits most recent first (entries without timestamps sink to bottom)
    recentCommits.sort(
      (a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      },
    );

    const totalRepos = allRepos.length;
    const totalStars = allRepos.reduce(
      (sum, repo) => sum + (repo.stargazers_count || 0),
      0,
    );
    const totalForks = allRepos.reduce(
      (sum, repo) => sum + (repo.forks_count || 0),
      0,
    );

    // Get language distribution
    const languages = {};
    for (const repo of allRepos) {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    }

    const response = {
      user: {
        login: userResponse.data.login,
        name: userResponse.data.name,
        avatar_url: userResponse.data.avatar_url,
        bio: userResponse.data.bio,
        public_repos: userResponse.data.public_repos,
        followers: userResponse.data.followers,
        following: userResponse.data.following,
        created_at: userResponse.data.created_at,
        updated_at: userResponse.data.updated_at,
      },
      stats: {
        totalCommits,
        totalRepos,
        totalStars,
        totalForks,
        languages,
      },
      repositories: allRepos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        html_url: repo.html_url,
        private: repo.private,
        size: repo.size,
      })),
      commits: recentCommits.slice(0, 500),
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const githubError = error as { status?: number; message?: string };
    console.error("Error fetching GitHub data:", githubError.message || error);

    // Handle specific GitHub API errors
    if (githubError.status === 404) {
      return NextResponse.json(
        { error: "GitHub user not found" },
        { status: 404 },
      );
    }

    if (githubError.status === 403) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded or access denied" },
        { status: 429 },
      );
    }

    if (githubError.status === 401) {
      return NextResponse.json(
        { error: "GitHub authentication failed" },
        { status: 401 },
      );
    }

    if (githubError.status === 409) {
      return NextResponse.json(
        { error: "Repository conflict - possibly empty repository" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch GitHub data",
        details: githubError.message || "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
