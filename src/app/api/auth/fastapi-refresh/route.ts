import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";

function isRunningInDocker(): boolean {
  try {
    return existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

function getFastApiBackendUrl(): string {
  if (process.env.FASTAPI_BACKEND_URL) return process.env.FASTAPI_BACKEND_URL;
  if (process.env.DOCKER_MODE === "true" || isRunningInDocker()) {
    return "http://nginx";
  }
  return "https://api.kiyoai.in/agent";
}

/**
 * POST /api/auth/fastapi-refresh
 * 
 * Refresh FastAPI access token using refresh token
 * Calls FastAPI backend's refresh endpoint
 * 
 * Body: { refresh_token: string }
 * Returns: { access_token: string, token_type: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body as { refresh_token?: string };

    if (!refresh_token) {
      return NextResponse.json(
        { error: "Refresh token required" },
        { status: 400 },
      );
    }

    // Call FastAPI refresh endpoint
    const fastApiUrl = getFastApiBackendUrl();

    try {
      const fastApiResponse = await fetch(
        `${fastApiUrl}/agent/support-agent/api/v1/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token }),
        },
      );

      if (!fastApiResponse.ok) {
        console.error(
          "[fastapi-refresh] FastAPI refresh failed:",
          fastApiResponse.status,
        );
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: fastApiResponse.status },
        );
      }

      const refreshedTokens = await fastApiResponse.json();
      return NextResponse.json(refreshedTokens, { status: 200 });
    } catch (fetchError) {
      console.error("[fastapi-refresh] Error calling FastAPI:", fetchError);
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[fastapi-refresh] Error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }
}
