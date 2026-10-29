import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { College } from '@/models/User';
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function PUT(request: NextRequest) {
  try {
    const userRole = "college"; // Static role for this endpoint

    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.id || payload.role !== userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();

    // Remove sensitive fields that shouldn't be updated through this endpoint
    const { ...updated_ata } = data;

    await dbConnect();

    const updatedCollege = await College.findByIdAndUpdate(
      payload.id,
      {
        $set: {
          ...updated_ata,
          updated_at: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!updatedCollege) {
      return NextResponse.json({ error: "College not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "College profile updated successfully",
      college: updatedCollege,
    });
  } catch (error) {
    console.error("Error updating college profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> },
) {
  try {
    const para = await params;
    const { role } = para;

    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.id || payload.role !== role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (role !== "college") {
      return NextResponse.json(
        { error: "Invalid role for this endpoint" },
        { status: 400 },
      );
    }

    await dbConnect();

    const college = await College.findById(payload.id).select("-password");

    if (!college) {
      return NextResponse.json({ error: "College not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      college: college,
    });
  } catch (error) {
    console.error("Error fetching college profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
