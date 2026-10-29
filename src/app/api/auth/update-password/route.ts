import { NextResponse } from "next/server";
import {User} from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { jwtVerify, JWTPayload } from 'jose';
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function PUT(request: Request) {
  try {
    await dbConnect();

    // Get token from authorization header or cookies
    let token: string | undefined;
    const authHeader = await request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get("aipm_token")?.value;
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Server misconfiguration: JWT secret missing" },
        { status: 500 }
      );
    }

    let decoded;
    try {
      // Use jose for JWT verification
      const encoder = new TextEncoder();
      const secret = encoder.encode(jwtSecret);
      try {
        const { payload } = await jwtVerify(token, secret);
        decoded = payload;
      } catch {
        decoded = null;
      }
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("user_id" in decoded)
    ) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    const user_id = (decoded as JWTPayload & { user_id?: string }).user_id;
    const { currentPassword, newPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Get user with password
    const user = await User.findById(user_id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(user_id, {
      $set: { password: hashedNewPassword }
    });

    return NextResponse.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
