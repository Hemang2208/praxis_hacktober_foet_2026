import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { githubUsername } = await request.json();
    if (!githubUsername || typeof githubUsername !== "string") {
      return NextResponse.json(
        { error: "GitHub username is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Check if user is a student (only students have socialLinks)
    const dbUser = await User.findById(user._id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user's GitHub username in their social links
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          "socialLinks.github": `https://github.com/${githubUsername.trim()}`,
        },
      },
      { new: true, upsert: false },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "GitHub username updated successfully",
      githubUsername: githubUsername.trim(),
    });
  } catch (error: unknown) {
    console.error("Error updating GitHub username:", error);
    return NextResponse.json(
      { error: "Failed to update GitHub username" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const dbUser = await User.findById(user._id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract username from GitHub URL
    let githubUsername = null;
    if (
      dbUser.role === "student" &&
      "socialLinks" in dbUser &&
      dbUser.socialLinks?.github
    ) {
      const match = dbUser.socialLinks.github.match(/github\.com\/([^/]+)/);
      if (match) {
        githubUsername = match[1];
      }
    }

    return NextResponse.json({
      githubUsername,
    });
  } catch (error: unknown) {
    console.error("Error fetching GitHub username:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub username" },
      { status: 500 },
    );
  }
}
