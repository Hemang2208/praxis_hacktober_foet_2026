import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_REDIRECT_URI = process.env.JIRA_OAUTH_REDIRECT_URI;

export async function GET(request: NextRequest) {
  if (!JIRA_CLIENT_ID || !JIRA_REDIRECT_URI) {
    return NextResponse.json(
      { error: "Jira integration is not configured" },
      { status: 503 },
    );
  }

  // OAuth CSRF protection
  const state = crypto.randomBytes(32).toString("hex");

  const searchParams = request.nextUrl.searchParams;
  const redirect = searchParams.get("redirect") || "/user/connections";

  const authUrl = new URL("https://auth.atlassian.com/authorize");

  authUrl.searchParams.set("audience", "api.atlassian.com");

  authUrl.searchParams.set("client_id", JIRA_CLIENT_ID);

  // These scopes are configured in the Atlassian Developer Console.
  authUrl.searchParams.set("scope", "read:jira-work read:me offline_access");

  authUrl.searchParams.set("redirect_uri", JIRA_REDIRECT_URI);

  authUrl.searchParams.set("state", state);

  authUrl.searchParams.set("response_type", "code");

  authUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authUrl);

  // CSRF state
  response.cookies.set("jira_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  // Return location
  response.cookies.set("jira_oauth_redirect", redirect, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
