import { NextResponse } from "next/server";
import { handleGitHubAPIError, createRepoIdentifier } from "@/lib/github";

// Replace with your logic to get the user's access token
const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Missing owner or repo" },
      { status: 400 },
    );
  }

  const repoId = createRepoIdentifier(owner, repo);

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!res.ok) {
      const error = { status: res.status, message: `HTTP ${res.status}` };
      const errorInfo = handleGitHubAPIError(error);

      if (errorInfo.shouldLog) {
        console.log(`${errorInfo.message} for ${repoId}`);
      }

      return NextResponse.json(
        { error: errorInfo.message },
        { status: errorInfo.status || 500 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const githubError = error as { status?: number; message?: string };
    const errorInfo = handleGitHubAPIError(githubError);

    if (errorInfo.shouldLog) {
      console.error(`${errorInfo.message} for ${repoId}:`, error);
    }

    return NextResponse.json(
      { error: errorInfo.message },
      { status: errorInfo.status || 500 },
    );
  }
}
