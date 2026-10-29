import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // First try to get the aipm_token from cookies (existing auth system)
    const cookieStore = await cookies();
    const aipmToken = cookieStore.get("aipm_token")?.value;

    if (aipmToken) {
      console.log("[get-token] Using aipm_token from cookies");
      return NextResponse.json({
        token: aipmToken,
        success: true,
      });
    }
    // No token found
    console.warn("[get-token] No authentication token available");
    return NextResponse.json(
      { error: "User not authenticated", debug: "No token available" },
      { status: 401 }
    );
  } catch (error) {
    console.error("[get-token] Error getting token:", error);
    return NextResponse.json(
      { error: "Failed to get authentication token", details: String(error) },
      { status: 500 }
    );
  }
}
