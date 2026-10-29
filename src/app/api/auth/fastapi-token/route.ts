import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { existsSync } from "fs";
import { verifyJwt } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import { Student, College, Company } from "@/models/User";

const encoder = new TextEncoder();
function getBackendSecret(): Uint8Array {
  return encoder.encode(process.env.JWT_SECRET || "changeme");
}

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
    // In Docker, reach the backend nginx via the shared kiyo-network
    return "http://nginx";
  }
  // NOTE: must NOT include /agent suffix; the caller path already adds it
  return "https://api.kiyoai.in";
}

async function createBackendAccessToken(user: any): Promise<string> {
  return await new SignJWT({
    sub: user._id.toString(),
    id: user._id.toString(),
    email: user.email,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 1800)
    .sign(getBackendSecret());
}

/**
 * POST /api/auth/fastapi-token
 * 
 * Exchange current session JWT for FastAPI JWT tokens
 * Calls backend FastAPI server to authenticate user
 * 
 * Requires: Valid Next.js session (aipm_token cookie)
 * Returns: { access_token, refresh_token, user_id, token_type }
 */
export async function POST() {
  try {
    // Get current user from session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("aipm_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "No session found. Please sign in first." },
        { status: 401 },
      );
    }

    // Verify session JWT
    const payload = await verifyJwt(sessionToken);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 },
      );
    }

    // Get user from database
    await dbConnect();
    let user = null;

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

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "User not found or email missing" },
        { status: 404 },
      );
    }

    // Resolve backend URL based on environment
    const fastApiUrl = getFastApiBackendUrl();
    
    try {
      // Attempt server-to-server authentication with user email
      const fastApiResponse = await fetch(
        `${fastApiUrl}/agent/support-agent/api/v1/auth/service-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // If you have a service token, add it here:
            // "X-Service-Token": process.env.FASTAPI_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            email: user.email,
            user_id: user._id.toString(),
            full_name: user.full_name || user.collegeName || user.companyName || "User",
            role: payload.role,
          }),
        },
      );

      if (!fastApiResponse.ok) {
        console.error(
          "[fastapi-token] FastAPI auth failed:",
          fastApiResponse.status,
          await fastApiResponse.text(),
        );
        
        // Fallback: Generate a proper access token the backend can verify
        console.warn("[fastapi-token] FastAPI unreachable, generating local access token");
        const fallbackToken = await createBackendAccessToken(user);
        return NextResponse.json(
          {
            access_token: fallbackToken,
            refresh_token: "",
            user_id: user._id.toString(),
            token_type: "bearer",
          },
          { status: 200 },
        );
      }

      const fastApiTokens = await fastApiResponse.json();

      // Handle queue-based responses from the backend.
      // When the queue system is enabled, the backend may return
      // {"status": "processing"|"completed", "request_id": "...", "result_url": "..."}
      // instead of the expected {"access_token": "...", ...} tokens.
      if (
        fastApiTokens &&
        typeof fastApiTokens === "object" &&
        fastApiTokens.request_id &&
        !fastApiTokens.access_token
      ) {
        console.warn(
          "[fastapi-token] Received queue response instead of tokens, attempting result_url",
          fastApiTokens.status,
        );

        // Try to fetch the actual result if the queue job is completed
        if (fastApiTokens.result_url && (fastApiTokens.status === "completed" || fastApiTokens.status === "processing")) {
          try {
            const resultUrl = `${fastApiUrl}${fastApiTokens.result_url}`;
            const resultRes = await fetch(resultUrl, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            if (resultRes.ok) {
              const resultData = await resultRes.json();
              if (resultData?.access_token) {
                return NextResponse.json(resultData, { status: 200 });
              }
              // Check nested result
              if (resultData?.result?.access_token) {
                return NextResponse.json(resultData.result, { status: 200 });
              }
            }
          } catch (resultErr) {
            console.warn("[fastapi-token] Failed to fetch queue result:", resultErr);
          }
        }

        // Fall back to local access token
        console.warn("[fastapi-token] Queue result not available, generating local access token");
        const queueFallbackToken = await createBackendAccessToken(user);
        return NextResponse.json(
          {
            access_token: queueFallbackToken,
            refresh_token: "",
            user_id: user._id.toString(),
            token_type: "bearer",
          },
          { status: 200 },
        );
      }

      return NextResponse.json(fastApiTokens, { status: 200 });
    } catch (fetchError) {
      console.error("[fastapi-token] Error calling FastAPI:", fetchError);
      
      // Fallback: generate a local access token the backend can verify
      const fetchFallbackToken = await createBackendAccessToken(user);
      return NextResponse.json(
        {
          access_token: fetchFallbackToken,
          refresh_token: "",
          user_id: user._id.toString(),
          token_type: "bearer",
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("[fastapi-token] Error:", error);
    return NextResponse.json(
      { error: "Failed to get FastAPI token" },
      { status: 500 },
    );
  }
}
