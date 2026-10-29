import dbConnect from "@/lib/dbConnect";
import JiraConnection from "@/models/JiraConnection";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;

export async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("aipm_token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return (payload?.id as string) || null;
}

export async function getRefreshedAccessToken(
  connection: {
    access_token: string;
    refresh_token: string;
    token_expires_at: Date;
  },
  userId: string
): Promise<string | null> {
  const isExpired = new Date(connection.token_expires_at) < new Date();

  if (!isExpired) {
    return connection.access_token;
  }

  if (!JIRA_CLIENT_ID || !JIRA_CLIENT_SECRET) {
    return null;
  }

  try {
    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        refresh_token: connection.refresh_token,
      }),
    });

    if (!response.ok) {
      console.error("Jira token refresh failed");
      return null;
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await dbConnect();
    await JiraConnection.findOneAndUpdate(
      { user_id: userId },
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: expiresAt,
      }
    );

    return data.access_token;
  } catch (err) {
    console.error("Error refreshing Jira token:", err);
    return null;
  }
}

export async function getJiraConnection(userId: string) {
  await dbConnect();
  const connection = await JiraConnection.findOne({ user_id: userId }).lean();
  if (!connection) return null;
  return connection;
}

export async function getJiraAccessToken(userId: string): Promise<{ token: string; siteUrl: string } | null> {
  const connection = await getJiraConnection(userId);
  if (!connection) return null;

  const token = await getRefreshedAccessToken(connection, userId);
  if (!token) return null;

  return { token, siteUrl: connection.site_url };
}
