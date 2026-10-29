import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { emit_notification_event } from "@/lib/notificationEvents";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    
    // Explicitly delete both cookies from the cookie store
    cookieStore.delete("aipm_token");
    cookieStore.delete("token");

    if (token) {
      const payload = await verifyJwt(token);
      if (payload && typeof payload.id === "string") {
        await emit_notification_event({
          user_id: payload.id,
          event_type: "LOGOUT",
          title: "Logged Out",
          message: "You logged out successfully.",
          category: "system",
          priority: "low",
          event_key: `LOGOUT:${payload.id}:${new Date().toISOString().slice(0, 16)}`,
        });
      }
    }
  } catch (error) {
    console.error("Failed to emit LOGOUT notification:", error);
  }

  // Remove the aipm_token and token cookies from the response headers
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.delete("aipm_token");
  response.cookies.delete("token");
  response.cookies.set("aipm_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // Expire immediately
    maxAge: 0,
  });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // Expire immediately
    maxAge: 0,
  });
  return response;
}

export async function POST() {
  // Also support POST for logout
  return GET();
}
