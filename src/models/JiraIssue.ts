import { model, models, Schema, Model, Document } from "mongoose";

export interface IJiraIssue extends Document {
  user_id: Schema.Types.ObjectId;
  jira_cloud_id: string;
  jira_project_key: string;
  jira_issue_id: string;
  jira_issue_key: string;
  summary: string;
  description: string;
  status: string;
  priority: string;
  issue_type: string;
  assignee: string;
  reporter: string;
  labels: string[];
  sprint: string;
  jira_url: string;
  created_at: Date;
  updated_at: Date;
  synced_at: Date;
}

const JiraIssueSchema = new Schema<IJiraIssue>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jira_cloud_id: {
      type: String,
      required: true,
    },
    jira_project_key: {
      type: String,
      required: true,
    },
    jira_issue_id: {
      type: String,
      required: true,
    },
    jira_issue_key: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      default: "",
    },
    issue_type: {
      type: String,
      default: "",
    },
    assignee: {
      type: String,
      default: "",
    },
    reporter: {
      type: String,
      default: "",
    },
    labels: {
      type: [String],
      default: [],
    },
    sprint: {
      type: String,
      default: "",
    },
    jira_url: {
      type: String,
      default: "",
    },
    synced_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

JiraIssueSchema.index({ user_id: 1, jira_issue_key: 1 }, { unique: true });
JiraIssueSchema.index({ user_id: 1, jira_project_key: 1 });
JiraIssueSchema.index({ user_id: 1, jira_cloud_id: 1 });

const JiraIssue: Model<IJiraIssue> =
  models.JiraIssue ||
  model<IJiraIssue>("JiraIssue", JiraIssueSchema);

export default JiraIssue;
