import { model, models, Schema, Model, Document } from "mongoose";

export interface IJiraConnection extends Document {
  user_id: Schema.Types.ObjectId;
  jira_account_id: string;
  jira_cloud_id: string;
  site_url: string;
  display_name: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: Date;
  scopes: string[];
  connected_at: Date;
  updated_at: Date;
}

const JiraConnectionSchema = new Schema<IJiraConnection>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jira_account_id: {
      type: String,
      required: true,
    },
    jira_cloud_id: {
      type: String,
      required: true,
    },
    site_url: {
      type: String,
      required: true,
    },
    display_name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    access_token: {
      type: String,
      required: true,
    },
    refresh_token: {
      type: String,
      required: true,
    },
    token_expires_at: {
      type: Date,
      required: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    connected_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "connected_at", updatedAt: "updated_at" },
  }
);

JiraConnectionSchema.index({ user_id: 1 }, { unique: true });

const JiraConnection: Model<IJiraConnection> =
  models.JiraConnection ||
  model<IJiraConnection>("JiraConnection", JiraConnectionSchema);

export default JiraConnection;
