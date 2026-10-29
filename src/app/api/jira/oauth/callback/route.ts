import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import JiraConnection from "@/models/JiraConnection";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const JIRA_REDIRECT_URI = process.env.JIRA_OAUTH_REDIRECT_URI;

function redirectToConnections(request: NextRequest, reason: string) {
  const url = new URL("/user/connections", request.url);

  url.searchParams.set("jira", "error");
  url.searchParams.set("reason", reason);

  return NextResponse.redirect(url);
}

function redirectToSuccess(request: NextRequest, redirectPath: string) {
  // Only allow internal relative paths.
  // Prevent open redirect vulnerabilities.
  const safePath =
    redirectPath.startsWith("/") && !redirectPath.startsWith("//")
      ? redirectPath
      : "/user/connections";

  const url = new URL(safePath, request.url);

  url.searchParams.set("jira", "connected");

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  /*
   * =========================================================
   * 1. Handle OAuth errors
   * =========================================================
   */

  if (error) {
    console.error("Jira OAuth authorization error:", error);

    return redirectToConnections(request, "authorization_denied");
  }

  /*
   * =========================================================
   * 2. Validate authorization response
   * =========================================================
   */

  if (!code || !state) {
    return redirectToConnections(request, "missing_params");
  }

  /*
   * =========================================================
   * 3. Read OAuth cookies
   * =========================================================
   */

  const cookieStore = await cookies();

  const savedState = cookieStore.get("jira_oauth_state")?.value;

  const redirectPath =
    cookieStore.get("jira_oauth_redirect")?.value || "/user/connections";

  /*
   * =========================================================
   * 4. Validate OAuth state
   * =========================================================
   *
   * Protects against CSRF attacks.
   */

  if (!savedState || state !== savedState) {
    console.error("Jira OAuth state mismatch");

    return redirectToConnections(request, "state_mismatch");
  }

  /*
   * =========================================================
   * 5. Validate environment configuration
   * =========================================================
   */

  if (!JIRA_CLIENT_ID || !JIRA_CLIENT_SECRET || !JIRA_REDIRECT_URI) {
    console.error("Jira OAuth environment variables are missing");

    return redirectToConnections(request, "not_configured");
  }

  try {
    /*
     * =======================================================
     * 6. Exchange authorization code for access token
     * =======================================================
     */

    const tokenResponse = await fetch(
      "https://auth.atlassian.com/oauth/token",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          grant_type: "authorization_code",

          client_id: JIRA_CLIENT_ID,

          client_secret: JIRA_CLIENT_SECRET,

          code,

          redirect_uri: JIRA_REDIRECT_URI,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();

      console.error("Jira token exchange failed:", errorText);

      return redirectToConnections(request, "token_exchange_failed");
    }

    const tokenData = await tokenResponse.json();

    const accessToken = tokenData.access_token;

    const refreshToken = tokenData.refresh_token;

    const expiresIn = Number(tokenData.expires_in);

    const grantedScope =
      typeof tokenData.scope === "string" ? tokenData.scope : "";

    /*
     * Access token is mandatory.
     */

    if (!accessToken) {
      console.error("Jira OAuth response did not contain access_token");

      return redirectToConnections(request, "missing_access_token");
    }

    /*
     * offline_access should give us a refresh token.
     */

    if (!refreshToken) {
      console.error("Jira OAuth response did not contain refresh_token");

      return redirectToConnections(request, "missing_refresh_token");
    }

    /*
     * =======================================================
     * 7. Get accessible Jira resources
     * =======================================================
     *
     * This gives us the Jira Cloud ID and site URL.
     */

    const resourcesResponse = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${accessToken}`,

          Accept: "application/json",
        },
      },
    );

    if (!resourcesResponse.ok) {
      const errorText = await resourcesResponse.text();

      console.error("Jira accessible resources failed:", errorText);

      return redirectToConnections(request, "accessible_resources_failed");
    }

    const resources = await resourcesResponse.json();

    if (!Array.isArray(resources) || resources.length === 0) {
      return redirectToConnections(request, "no_jira_access");
    }

    /*
     * Find a Jira resource that has
     * read:jira-work permission.
     */

    const jiraResource = resources.find(
      (resource: {
        id?: string;
        url?: string;
        name?: string;
        scopes?: string[];
      }) =>
        Array.isArray(resource.scopes) &&
        resource.scopes.includes("read:jira-work"),
    );

    if (!jiraResource?.id || !jiraResource?.url) {
      console.error("No Jira resource with read:jira-work scope found");

      return redirectToConnections(request, "no_jira_access");
    }

    const jiraCloudId = jiraResource.id;

    const siteUrl = jiraResource.url;

    /*
     * =======================================================
     * 8. Get Atlassian user information
     * =======================================================
     *
     * We configured:
     *
     *     User Identity API
     *     read:me
     *
     * Therefore use Atlassian's /me endpoint.
     */

    let displayName = "";
    let email = "";
    let jiraAccountId = "";

    try {
      const meResponse = await fetch("https://api.atlassian.com/me", {
        method: "GET",

        headers: {
          Authorization: `Bearer ${accessToken}`,

          Accept: "application/json",
        },
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();

        displayName = userData.name || userData.nickname || "";

        email = userData.email || "";

        jiraAccountId = userData.account_id || "";
      } else {
        const errorText = await meResponse.text();

        console.error("Atlassian /me request failed:", errorText);
      }
    } catch (error) {
      console.error("Failed to fetch Atlassian user:", error);
    }

    /*
     * =======================================================
     * 9. Calculate token expiration
     * =======================================================
     */

    const safeExpiresIn =
      Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;

    const expiresAt = new Date(Date.now() + safeExpiresIn * 1000);

    /*
     * =======================================================
     * 10. Get authenticated KIYO user
     * =======================================================
     */

    const jwtToken = cookieStore.get("aipm_token")?.value;

    if (!jwtToken) {
      return redirectToConnections(request, "not_authenticated");
    }

    const payload = await verifyJwt(jwtToken);

    if (!payload?.id) {
      return redirectToConnections(request, "not_authenticated");
    }

    const userId = String(payload.id);

    /*
     * =======================================================
     * 11. Connect database
     * =======================================================
     */

    await dbConnect();

    /*
     * =======================================================
     * 12. Save / update Jira connection
     * =======================================================
     */

    await JiraConnection.findOneAndUpdate(
      {
        user_id: userId,
      },

      {
        user_id: userId,

        /*
         * Atlassian account ID
         */
        jira_account_id: jiraAccountId || "",

        /*
         * Jira Cloud ID
         */
        jira_cloud_id: jiraCloudId,

        /*
         * Jira site URL
         */
        site_url: siteUrl,

        /*
         * Atlassian user information
         */
        display_name: displayName,

        email: email,

        /*
         * OAuth credentials.
         *
         * These stay server-side.
         * Never return these to frontend.
         */
        access_token: accessToken,

        refresh_token: refreshToken,

        token_expires_at: expiresAt,

        /*
         * Store the scopes actually granted.
         */
        scopes: grantedScope
          ? grantedScope.split(/\s+/).filter(Boolean)
          : ["read:jira-work", "read:me", "offline_access"],

        connected_at: new Date(),

        updated_at: new Date(),
      },

      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    /*
     * =======================================================
     * 13. Redirect back to KIYO
     * =======================================================
     */

    const response = redirectToSuccess(request, redirectPath);

    /*
     * Remove temporary OAuth state.
     */

    response.cookies.delete("jira_oauth_state");

    response.cookies.delete("jira_oauth_redirect");

    return response;
  } catch (error) {
    /*
     * Don't expose internal errors
     * to the frontend.
     */

    console.error("Jira OAuth callback error:", error);

    return redirectToConnections(request, "internal_error");
  }
}
