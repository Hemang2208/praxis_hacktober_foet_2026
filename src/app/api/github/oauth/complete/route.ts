import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Complete GitHub OAuth after user logs in
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { githubToken, githubUsername, githubUrl } = body;

    if (!githubToken || !githubUsername || !githubUrl) {
      return NextResponse.json({ error: "Missing GitHub data" }, { status: 400 });
    }

    // Connect to database and save GitHub data
    const dbConnect = (await import("@/lib/dbConnect")).default;
    await dbConnect();
    const { User } = await import("@/models/User");

    const result = await User.findByIdAndUpdate(
      user._id,
      { $set: { "socialLinks.github": githubUrl, githubToken: githubToken } },
      { new: true, upsert: false }
    );

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "GitHub account linked successfully",
      githubUsername 
    });

  } catch (error) {
    console.error("Error completing GitHub OAuth:", error);
    return NextResponse.json({ 
      error: "Failed to complete GitHub OAuth" 
    }, { status: 500 });
  }
}