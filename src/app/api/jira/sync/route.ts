import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, getJiraAccessToken } from "@/lib/jira-auth";
import dbConnect from "@/lib/dbConnect";
import JiraIssue from "@/models/JiraIssue";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { project_key } = body;

    if (!project_key) {
      return NextResponse.json(
        { error: "project_key is required" },
        { status: 400 }
      );
    }

    const jiraAuth = await getJiraAccessToken(userId);
    if (!jiraAuth) {
      return NextResponse.json({ error: "Jira not connected" }, { status: 404 });
    }

    await dbConnect();

    let startAt = 0;
    const maxResults = 50;
    let totalSynced = 0;
    let total = 0;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        jql: `project = "${project_key}" order by updated DESC`,
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
        console.error("Jira sync fetch failed:", errText);
        return NextResponse.json(
          { error: "Failed to fetch issues from Jira" },
          { status: 502 }
        );
      }

      const data = await response.json();
      total = data.total;

      for (const issue of data.issues) {
        const issueData = {
          user_id: userId,
          jira_cloud_id: jiraAuth.siteUrl.replace("https://", "").replace(".atlassian.net", ""),
          jira_project_key: project_key,
          jira_issue_id: issue.id,
          jira_issue_key: issue.key,
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
          synced_at: new Date(),
        };

        await JiraIssue.findOneAndUpdate(
          { user_id: userId, jira_issue_key: issue.key },
          issueData,
          { upsert: true, new: true }
        );
        totalSynced++;
      }

      hasMore = data.startAt + data.maxResults < data.total;
      startAt += maxResults;
    }

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      total,
      project_key,
    });
  } catch (err) {
    console.error("Error syncing Jira issues:", err);
    return NextResponse.json(
      { error: "Failed to sync issues" },
      { status: 500 }
    );
  }
}
