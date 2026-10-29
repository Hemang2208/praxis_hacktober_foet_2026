import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, getJiraAccessToken } from "@/lib/jira-auth";
import dbConnect from "@/lib/dbConnect";
import JiraIssue from "@/models/JiraIssue";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectKey = searchParams.get("project_key");
    const status = searchParams.get("status");
    const assignee = searchParams.get("assignee");
    const search = searchParams.get("search");
    const startAt = parseInt(searchParams.get("start_at") || "0", 10);
    const maxResults = Math.min(parseInt(searchParams.get("max_results") || "50", 10), 100);

    const jiraAuth = await getJiraAccessToken(userId);
    if (!jiraAuth) {
      return NextResponse.json({ error: "Jira not connected" }, { status: 404 });
    }

    const jqlParts: string[] = [];
    if (projectKey) {
      jqlParts.push(`project = "${projectKey}"`);
    }
    if (status) {
      jqlParts.push(`status = "${status}"`);
    }
    if (assignee) {
      jqlParts.push(`assignee = "${assignee}"`);
    }
    if (search) {
      jqlParts.push(`summary ~ "${search}" OR description ~ "${search}"`);
    }

    const jql = jqlParts.length > 0 ? jqlParts.join(" AND ") : "order by updated DESC";

    const params = new URLSearchParams({
      jql,
      startAt: String(startAt),
      maxResults: String(maxResults),
      fields: "summary,status,priority,issuetype,assignee,reporter,labels,created,updated,project,customfield_10010",
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
      const errText = await response.text();
      console.error("Jira issues fetch failed:", errText);
      return NextResponse.json(
        { error: "Failed to fetch Jira issues" },
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
          description: string;
          status: { name: string };
          priority: { name: string };
          issuetype: { name: string };
          assignee: { displayName: string } | null;
          reporter: { displayName: string } | null;
          labels: string[];
          created: string;
          updated: string;
          project: { key: string };
          customfield_10010?: { name: string } | null;
        };
      }) => ({
        jira_issue_id: issue.id,
        jira_issue_key: issue.key,
        jira_project_key: issue.fields.project.key,
        summary: issue.fields.summary || "",
        description: issue.fields.description || "",
        status: issue.fields.status?.name || "",
        priority: issue.fields.priority?.name || "",
        issue_type: issue.fields.issuetype?.name || "",
        assignee: issue.fields.assignee?.displayName || "",
        reporter: issue.fields.reporter?.displayName || "",
        labels: issue.fields.labels || [],
        sprint: issue.fields.customfield_10010?.name || "",
        jira_url: `${jiraAuth.siteUrl}/browse/${issue.key}`,
        created_at: issue.fields.created,
        updated_at: issue.fields.updated,
      })
    );

    return NextResponse.json({
      issues,
      total: data.total,
      startAt: data.startAt,
      maxResults: data.maxResults,
      hasMore: data.startAt + data.maxResults < data.total,
    });
  } catch (err) {
    console.error("Error fetching Jira issues:", err);
    return NextResponse.json(
      { error: "Failed to fetch issues" },
      { status: 500 }
    );
  }
}
