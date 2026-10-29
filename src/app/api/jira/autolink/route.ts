import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, getJiraAccessToken } from "@/lib/jira-auth";
import dbConnect from "@/lib/dbConnect";
import JiraIssue from "@/models/JiraIssue";

const JIRA_KEY_PATTERN = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { texts, project_key } = body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: "texts array is required" },
        { status: 400 }
      );
    }

    const keys = new Set<string>();
    for (const text of texts) {
      if (typeof text !== "string") continue;
      let match;
      JIRA_KEY_PATTERN.lastIndex = 0;
      while ((match = JIRA_KEY_PATTERN.exec(text)) !== null) {
        keys.add(match[1]);
      }
    }

    if (keys.size === 0) {
      return NextResponse.json({ issues: [] });
    }

    await dbConnect();

    const query: Record<string, unknown> = {
      user_id: userId,
      jira_issue_key: { $in: Array.from(keys) },
    };

    if (project_key) {
      query.jira_project_key = project_key;
    }

    const syncedIssues = await JiraIssue.find(query).lean();

    const jiraAuth = await getJiraAccessToken(userId);
    const resolvedIssues = [];

    const syncedKeys = new Set(syncedIssues.map((i) => i.jira_issue_key));
    const unresolvedKeys = Array.from(keys).filter(
      (k) => !syncedKeys.has(k)
    );

    if (jiraAuth && unresolvedKeys.length > 0) {
      const jql = `key in (${unresolvedKeys.join(", ")})`;
      const params = new URLSearchParams({
        jql,
        maxResults: String(unresolvedKeys.length),
        fields: "summary,status,priority,issuetype,assignee,project",
      });

      try {
        const response = await fetch(
          `${jiraAuth.siteUrl}/rest/api/3/search?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${jiraAuth.token}`,
              Accept: "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          for (const issue of data.issues) {
            const issueData = {
              user_id: userId,
              jira_cloud_id: jiraAuth.siteUrl
                .replace("https://", "")
                .replace(".atlassian.net", ""),
              jira_project_key: issue.fields.project?.key || "",
              jira_issue_id: issue.id,
              jira_issue_key: issue.key,
              summary: issue.fields.summary || "",
              description: "",
              status: issue.fields.status?.name || "",
              priority: issue.fields.priority?.name || "",
              issue_type: issue.fields.issuetype?.name || "",
              assignee: issue.fields.assignee?.displayName || "",
              reporter: issue.fields.reporter?.displayName || "",
              labels: issue.fields.labels || [],
              sprint: "",
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

            resolvedIssues.push({
              jira_issue_key: issue.key,
              summary: issue.fields.summary || "",
              status: issue.fields.status?.name || "",
              priority: issue.fields.priority?.name || "",
              issue_type: issue.fields.issuetype?.name || "",
              jira_url: `${jiraAuth.siteUrl}/browse/${issue.key}`,
            });
          }
        }
      } catch (err) {
        console.error("Error resolving Jira keys from API:", err);
      }
    }

    for (const issue of syncedIssues) {
      if (!resolvedIssues.find((r) => r.jira_issue_key === issue.jira_issue_key)) {
        resolvedIssues.push({
          jira_issue_key: issue.jira_issue_key,
          summary: issue.summary,
          status: issue.status,
          priority: issue.priority,
          issue_type: issue.issue_type,
          jira_url: issue.jira_url,
        });
      }
    }

    return NextResponse.json({
      issues: resolvedIssues,
      keys_found: Array.from(keys),
    });
  } catch (err) {
    console.error("Error autolinking Jira issues:", err);
    return NextResponse.json(
      { error: "Failed to autolink issues" },
      { status: 500 }
    );
  }
}
