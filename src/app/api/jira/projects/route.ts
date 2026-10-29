import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import JiraConnection from "@/models/JiraConnection";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;

async function getRefreshedAccessToken(
  connection: {
    access_token: string;
    refresh_token: string;
    token_expires_at: Date;
  },
  userId: string,
): Promise<string | null> {
  const tokenExpiresAt = new Date(connection.token_expires_at);

  // Refresh slightly before actual expiration.
  const isExpired = tokenExpiresAt.getTime() <= Date.now() + 60_000;

  if (!isExpired) {
    return connection.access_token;
  }

  if (!JIRA_CLIENT_ID || !JIRA_CLIENT_SECRET) {
    console.error("Jira OAuth credentials are not configured");

    return null;
  }

  if (!connection.refresh_token) {
    console.error("Jira refresh token is missing");

    return null;
  }

  try {
    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        grant_type: "refresh_token",

        client_id: JIRA_CLIENT_ID,

        client_secret: JIRA_CLIENT_SECRET,

        refresh_token: connection.refresh_token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Jira token refresh failed:", errorText);

      return null;
    }

    const data = await response.json();

    if (!data.access_token) {
      console.error("Jira token refresh response missing access_token");

      return null;
    }

    const expiresIn = Number(data.expires_in);

    const expiresAt = new Date(
      Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    );

    await dbConnect();

    /*
     * IMPORTANT:
     *
     * Atlassian uses rotating refresh tokens.
     * Every successful refresh may return a NEW
     * refresh token and the old one becomes invalid.
     */
    await JiraConnection.findOneAndUpdate(
      {
        user_id: userId,
      },
      {
        access_token: data.access_token,

        /*
         * Always save the new refresh token
         * when Atlassian returns one.
         */
        ...(data.refresh_token
          ? {
              refresh_token: data.refresh_token,
            }
          : {}),

        token_expires_at: expiresAt,

        updated_at: new Date(),
      },
    );

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing Jira token:", error);

    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    /*
     * =======================================================
     * 1. Authenticate KIYO user
     * =======================================================
     */

    const cookieStore = await cookies();

    const token = cookieStore.get("aipm_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        {
          status: 401,
        },
      );
    }

    const payload = await verifyJwt(token);

    const userId = payload?.id ? String(payload.id) : null;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * =======================================================
     * 2. Get Jira connection
     * =======================================================
     */

    await dbConnect();

    const connection = await JiraConnection.findOne({
      user_id: userId,
    }).lean();

    if (!connection) {
      return NextResponse.json(
        {
          error: "Jira not connected",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * =======================================================
     * 3. Validate Cloud ID
     * =======================================================
     *
     * OAuth 2.0 (3LO) Jira API calls MUST use the
     * Atlassian API gateway with the Jira Cloud ID.
     */

    if (!connection.jira_cloud_id) {
      console.error("Jira connection is missing jira_cloud_id");

      return NextResponse.json(
        {
          error: "Jira connection is missing Cloud ID. Please reconnect Jira.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * =======================================================
     * 4. Get valid access token
     * =======================================================
     */

    const accessToken = await getRefreshedAccessToken(
      {
        access_token: connection.access_token,

        refresh_token: connection.refresh_token,

        token_expires_at: connection.token_expires_at,
      },
      userId,
    );

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Jira authorization expired. Please reconnect Jira.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * =======================================================
     * 5. Fetch Jira projects
     * =======================================================
     *
     * IMPORTANT:
     *
     * For OAuth 2.0 (3LO):
     *
     * https://api.atlassian.com/ex/jira/{cloudId}/...
     *
     * NOT:
     *
     * https://your-domain.atlassian.net/...
     */

    const jiraProjectsUrl = `https://api.atlassian.com/ex/jira/${encodeURIComponent(
      connection.jira_cloud_id,
    )}/rest/api/3/project`;

    const projectsResponse = await fetch(jiraProjectsUrl, {
      method: "GET",

      headers: {
        Authorization: `Bearer ${accessToken}`,

        Accept: "application/json",
      },

      /*
       * Don't cache user-specific Jira data.
       */
      cache: "no-store",
    });

    /*
     * =======================================================
     * 6. Handle Jira API errors
     * =======================================================
     */

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text();

      console.error("Jira projects fetch failed:", {
        status: projectsResponse.status,

        statusText: projectsResponse.statusText,

        error: errorText,
      });

      if (projectsResponse.status === 401) {
        return NextResponse.json(
          {
            error: "Jira authorization expired. Please reconnect Jira.",
          },
          {
            status: 401,
          },
        );
      }

      if (projectsResponse.status === 403) {
        return NextResponse.json(
          {
            error: "You do not have permission to access Jira projects.",
          },
          {
            status: 403,
          },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch Jira projects",
        },
        {
          status: 502,
        },
      );
    }

    /*
     * =======================================================
     * 7. Parse projects
     * =======================================================
     */

    const projects = await projectsResponse.json();

    if (!Array.isArray(projects)) {
      console.error("Unexpected Jira projects response:", projects);

      return NextResponse.json(
        {
          error: "Invalid Jira projects response",
        },
        {
          status: 502,
        },
      );
    }

    /*
     * =======================================================
     * 8. Normalize project data
     * =======================================================
     */

    const simplified = projects.map(
      (project: {
        id?: string;
        key?: string;
        name?: string;
        projectTypeKey?: string;
        description?: string;
        lead?: {
          displayName?: string;
        };
      }) => ({
        id: project.id || "",

        key: project.key || "",

        name: project.name || "",

        type: project.projectTypeKey || "",

        description: project.description || "",

        lead: project.lead?.displayName || "",
      }),
    );

    /*
     * =======================================================
     * 9. Return projects
     * =======================================================
     */

    return NextResponse.json(
      {
        projects: simplified,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error fetching Jira projects:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch Jira projects",
      },
      {
        status: 500,
      },
    );
  }
}
