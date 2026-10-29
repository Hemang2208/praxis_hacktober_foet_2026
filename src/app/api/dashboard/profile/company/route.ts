import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Company } from '@/models/User';
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function PUT(request: NextRequest) {
  try {
    const userRole = "company"; // Static role for this endpoint

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
    // console.log("Company profile update request:", {
    //   companyId: payload.id,
    //   updated_ata: data,
    //   timestamp: new Date().toISOString(),
    // });

    // Remove sensitive fields that shouldn't be updated through this endpoint
    const { ...updated_ata } = data;

    await dbConnect();

    // First, check if company exists
    const existingCompany = await Company.findById(payload.id);
    if (!existingCompany) {
      console.error("Company not found:", payload.id);
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // console.log("Existing company found:", {
    //   id: existingCompany._id,
    //   companyName: existingCompany.companyName,
    // });

    const updatedCompany = await Company.findByIdAndUpdate(
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
        lean: false, // Return a mongoose document, not a plain object
      },
    ).select("-password");

    if (!updatedCompany) {
      console.error("Failed to update company:", payload.id);
      return NextResponse.json(
        { error: "Company update failed" },
        { status: 400 },
      );
    }

    // console.log("Company profile updated successfully:", {
    //   companyId: updatedCompany._id,
    //   companyName: updatedCompany.companyName,
    //   fieldsUpdated: Object.keys(updated_ata),
    //   timestamp: new Date().toISOString(),
    // });

    return NextResponse.json({
      success: true,
      message: "Company profile updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Error updating company profile:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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

    if (role !== "company") {
      return NextResponse.json(
        { error: "Invalid role for this endpoint" },
        { status: 400 },
      );
    }

    await dbConnect();

    const company = await Company.findById(payload.id).select("-password");

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      company: company,
    });
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
