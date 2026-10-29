import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { User, IStudent } from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");
    if (!rawUsername) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    const username = rawUsername.trim().replace(/\/$/, "");
    if (!username) {
      return NextResponse.json({ error: "Invalid GitHub username format" }, { status: 400 });
    }

    await dbConnect();
    const appUser = await User.findById(user._id).lean();
    const userToken =
      appUser && appUser.role === "student"
        ? (appUser as unknown as IStudent).githubToken || process.env.GITHUB_ACCESS_TOKEN
        : process.env.GITHUB_ACCESS_TOKEN;

    const query = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  color
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { username } }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: "GitHub API error", details: errText },
        { status: res.status },
      );
    }

    const json = await res.json();
    if (json.errors) {
      return NextResponse.json(
        { error: "GitHub GraphQL error", details: json.errors },
        { status: 400 },
      );
    }

    const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) {
      return NextResponse.json(
        { error: "No contribution data found" },
        { status: 404 },
      );
    }

    return NextResponse.json(calendar);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch contributions", details: msg }, { status: 500 });
  }
}
