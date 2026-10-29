import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/jira-auth";
import dbConnect from "@/lib/dbConnect";
import JiraIssue from "@/models/JiraIssue";
import Task from "@/models/Task";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { task_id, jira_issue_key } = body;

    if (!task_id || !jira_issue_key) {
      return NextResponse.json(
        { error: "task_id and jira_issue_key are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const jiraIssue = await JiraIssue.findOne({
      user_id: userId,
      jira_issue_key,
    });

    if (!jiraIssue) {
      return NextResponse.json(
        { error: "Jira issue not found in synced issues" },
        { status: 404 }
      );
    }

    const task = await Task.findById(task_id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await Task.findByIdAndUpdate(task_id, {
      $set: {
        jira_issue_key: jiraIssue.jira_issue_key,
        jira_issue_url: jiraIssue.jira_url,
        jira_issue_summary: jiraIssue.summary,
      },
    });

    return NextResponse.json({
      success: true,
      task_id,
      jira_issue_key,
      jira_issue_url: jiraIssue.jira_url,
    });
  } catch (err) {
    console.error("Error linking Jira issue:", err);
    return NextResponse.json(
      { error: "Failed to link Jira issue" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { task_id } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const task = await Task.findById(task_id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await Task.findByIdAndUpdate(task_id, {
      $unset: {
        jira_issue_key: 1,
        jira_issue_url: 1,
        jira_issue_summary: 1,
      },
    });

    return NextResponse.json({ success: true, task_id });
  } catch (err) {
    console.error("Error unlinking Jira issue:", err);
    return NextResponse.json(
      { error: "Failed to unlink Jira issue" },
      { status: 500 }
    );
  }
}
