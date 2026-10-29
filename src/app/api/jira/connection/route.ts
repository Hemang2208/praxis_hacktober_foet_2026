import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import JiraConnection from "@/models/JiraConnection";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("aipm_token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return (payload?.id as string) || null;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();
    const connection = await JiraConnection.findOne({ user_id: userId })
      .select("-access_token -refresh_token")
      .lean();

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    const isExpired = new Date(connection.token_expires_at) < new Date();

    return NextResponse.json({
      connected: true,
      site_url: connection.site_url,
      display_name: connection.display_name,
      email: connection.email,
      connected_at: connection.connected_at,
      is_expired: isExpired,
    });
  } catch (err) {
    console.error("Error checking Jira connection:", err);
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();
    await JiraConnection.deleteOne({ user_id: userId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error disconnecting Jira:", err);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
