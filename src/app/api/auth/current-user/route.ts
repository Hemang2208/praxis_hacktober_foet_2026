import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import { Student, College, Company } from "@/models/User";

/**
 * Get the current authenticated user's information
 * Returns the user's ID and basic profile data
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const payload = await verifyJwt(token);

    if (!payload || !payload.id) {
      console.log("[current-user] Invalid JWT payload:", payload);
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    // console.log("[current-user] JWT verified, payload:", {
    //   id: payload.id,
    //   role: payload.role,
    //   email: payload.email,
    // });

    await dbConnect();

    let user = null;

    // Find user based on role from JWT payload
    switch (payload.role) {
      case "student":
        user = await Student.findById(payload.id);
        break;
      case "college":
        user = await College.findById(payload.id);
        break;
      case "company":
        user = await Company.findById(payload.id);
        break;
      default:
        user = await Student.findById(payload.id);
    }

    if (!user) {
      // console.log(
      //   "[current-user] User not found in database for ID:",
      //   payload.id,
      //   "and role:",
      //   payload.role,
      // );
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    // console.log("[current-user] User found:", {
    //   id: user._id,
    //   email: user.email,
    //   role: user.role,
    // });

    return NextResponse.json({
      user: {
        user_id: user._id?.toString(),
        email: user.email,
        full_name: user.full_name || user.collegeName || user.companyName,
        role: user.role,
        socialLinks: (user as any).socialLinks || {},
        profile_picture: (user as any).profile_picture || (user as any).image_url || ""
      },
      success: true,
    });
  } catch (error) {
    console.error("[current-user] Error getting current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 },
    );
  }
}
