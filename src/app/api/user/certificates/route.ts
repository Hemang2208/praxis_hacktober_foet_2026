import { NextResponse } from "next/server";
// import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    // For now, return empty certificates array to prevent authentication errors
    // This can be updated when proper certificate system is implemented
    const certificates = [];

    return NextResponse.json(
      {
        certificates,
        count: certificates.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return NextResponse.json(
      { certificates: [], count: 0 },
      { status: 200 }, // Return 200 with empty data instead of error
    );
  }
}
