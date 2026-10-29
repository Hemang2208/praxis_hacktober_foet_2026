import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { College, Company } from "@/models/User";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function PUT(
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

    if (role !== "company" && role !== "college") {
      return NextResponse.json(
        { error: "Invalid role for this endpoint" },
        { status: 400 },
      );
    }

    const data = await request.json();

    // Remove sensitive fields that shouldn't be updated through this endpoint
    const { ...updated_ata } = data;

    await dbConnect();

    let updatedProfile;

    if (role === "company") {
      updatedProfile = await Company.findByIdAndUpdate(
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

      if (!updatedProfile) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 },
        );
      }
    } else {
      updatedProfile = await College.findByIdAndUpdate(
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

      if (!updatedProfile) {
        return NextResponse.json(
          { error: "College not found" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} profile updated successfully`,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error(`Error updating profile:`, error);
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

    if (role !== "company" && role !== "college") {
      return NextResponse.json(
        { error: "Invalid role for this endpoint" },
        { status: 400 },
      );
    }

    await dbConnect();

    let profile;

    if (role === "company") {
      profile = await Company.findById(payload.id).select("-password");
      if (!profile) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 },
        );
      }
    } else {
      profile = await College.findById(payload.id).select("-password");
      if (!profile) {
        return NextResponse.json(
          { error: "College not found" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      profile: profile,
    });
  } catch (error) {
    console.error(`Error fetching profile:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
