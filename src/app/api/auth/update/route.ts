import { NextResponse } from "next/server";
import {User} from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { jwtVerify } from 'jose';
import { cookies } from "next/headers";

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

    const user_id = (decoded as { user_id?: string }).user_id;
    const updated_ata = await request.json();

    // If email is being updated, validate it and check for uniqueness
    if (updated_ata.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updated_ata.email)) {
        return NextResponse.json(
          { error: "Please provide a valid email address" },
          { status: 400 }
        );
      }

      // Check if email already exists for another user
      const existingUser = await User.findOne({
        email: updated_ata.email.toLowerCase(),
        _id: { $ne: user_id },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 409 }
        );
      }

      // Convert email to lowercase
      updated_ata.email = updated_ata.email.toLowerCase();
    }

    // Remove any fields that shouldn't be updated directly
    delete updated_ata.password;
    delete updated_ata._id;
    delete updated_ata.created_at;
    delete updated_ata.updated_at;

    // Update user data
    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      { $set: updated_ata },
      { new: true, select: "-password" }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error);
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