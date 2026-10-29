import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import { Student, College, Company } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Connect to database and verify user exists
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
        // Try to find in User collection as fallback
        user = await Student.findById(payload.id);
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Only allow student, college and company roles to access dashboard/platform
    if (user.role !== "student" && user.role !== "college" && user.role !== "company") {
      return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
    }

    return NextResponse.json({
      role: user.role,
      email: user.email,
      id: user._id.toString(),
      full_name: user.collegeName || user.companyName || user.full_name,
    });
  } catch (error) {
    console.error("[auth/check] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
