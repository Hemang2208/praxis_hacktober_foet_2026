import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, getJiraAccessToken } from "@/lib/jira-auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const projectKey = searchParams.get("project_key");

    if (!query) {
      return NextResponse.json(
        { error: "q parameter is required" },
        { status: 400 }
      );
    }

    const jiraAuth = await getJiraAccessToken(userId);
    if (!jiraAuth) {
      return NextResponse.json({ error: "Jira not connected" }, { status: 404 });
    }

    const jqlParts: string[] = [];
    if (projectKey) {
      jqlParts.push(`project = "${projectKey}"`);
    }
    jqlParts.push(`(summary ~ "${query}" OR key = "${query}")`);

    const params = new URLSearchParams({
      jql: jqlParts.join(" AND ") + " order by updated DESC",
      maxResults: "10",
      fields: "summary,status,priority,issuetype,assignee,project",
    });

    const response = await fetch(
      `${jiraAuth.siteUrl}/rest/api/3/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${jiraAuth.token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to search Jira" },
        { status: 502 }
      );
    }

    const data = await response.json();

    const issues = data.issues.map(
      (issue: {
        id: string;
        key: string;
        fields: {
          summary: string;
          status: { name: string };
          priority: { name: string };
          issuetype: { name: string };
          assignee: { displayName: string } | null;
          project: { key: string };
        };
      }) => ({
        jira_issue_id: issue.id,
        jira_issue_key: issue.key,
        summary: issue.fields.summary || "",
        status: issue.fields.status?.name || "",
        priority: issue.fields.priority?.name || "",
        issue_type: issue.fields.issuetype?.name || "",
        assignee: issue.fields.assignee?.displayName || "",
        project_key: issue.fields.project?.key || "",
        jira_url: `${jiraAuth.siteUrl}/browse/${issue.key}`,
      })
    );

    return NextResponse.json({ issues });
  } catch (err) {
    console.error("Error searching Jira:", err);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
