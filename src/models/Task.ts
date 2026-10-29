// models/Task.ts
import mongoose, { Document, model, models, Types } from "mongoose";

interface ISubTask {
  _id: Types.ObjectId;
  title: string;
  completed: boolean;
  description?: string;
  created_at?: Date;
}

interface IComment {
  _id: Types.ObjectId;
  user_id: string;
  message: string;
  created_at: Date;
}

interface INote {
  _id: Types.ObjectId;
  content: string;
  created_at: Date;
  updated_at?: Date;
  parent_id?: Types.ObjectId | null;
  is_deleted: boolean;
  is_edited?: boolean;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface IAttachment {
  _id: Types.ObjectId;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface ITimeTracking {
  estimated: number; // in hours
  logged: number; // in hours
  remaining: number; // in hours
}

export interface ITask extends Document {
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "submitted" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  due_date?: Date;
  assigned_to?: string;
  project_id?: Types.ObjectId;
  project?: Types.ObjectId; // Keep both for backward compatibility
  tags: string[];
  sub_tasks: Types.DocumentArray<ISubTask>;
  comments: Types.DocumentArray<IComment>;
  notes: Types.DocumentArray<INote>;
  attachments: Types.DocumentArray<IAttachment>;
  time_tracking: ITimeTracking;
  dependencies: Types.ObjectId[]; // IDs of tasks this task depends on
  completed_at?: Date; // Add this field back
  linked_pr_id?: string | null;
  linked_pull_request?: Types.ObjectId | null;

  // Jira integration
  jira_issue_key?: string | null;
  jira_issue_url?: string | null;
  jira_issue_summary?: string | null;

  // AI Feedback reference
  ai_feedback?: Types.ObjectId | null;
  has_feedback?: boolean;
  feedback_status?: "pending" | "ready" | "reviewed";
  feedback_notification_sent?: boolean;

  created_at: Date;
  updated_at: Date;
}

const SubTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  description: String,
  created_at: { type: Date, default: Date.now },
});

const CommentSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const NoteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date },
  parent_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  is_deleted: { type: Boolean, default: false },
  is_edited: { type: Boolean, default: false },
  author: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: "" },
  },
});

const AttachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
});

const TimeTrackingSchema = new mongoose.Schema({
  estimated: { type: Number, default: 0 },
  logged: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },
});

const TaskSchema = new mongoose.Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: {
        values: ["todo", "in-progress", "submitted", "completed", "blocked"],
        message: "{VALUE} is not a valid status",
      },
      default: "todo",
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "{VALUE} is not a valid priority",
      },
      default: "medium",
    },
    due_date: Date,
    assigned_to: String,
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    tags: { type: [String], default: [] },
    sub_tasks: { type: [SubTaskSchema], default: [] },
    comments: { type: [CommentSchema], default: [] },
    notes: { type: [NoteSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    time_tracking: { type: TimeTrackingSchema, default: () => ({}) },
    dependencies: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    completed_at: Date, // Add this field
    linked_pr_id: { type: String, default: null },
    linked_pull_request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "pull_request",
      default: null,
    },
    jira_issue_key: { type: String, default: null },
    jira_issue_url: { type: String, default: null },
    jira_issue_summary: { type: String, default: null },

    // AI Feedback reference
    ai_feedback: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIFeedback",
      default: null,
    },
    has_feedback: {
      type: Boolean,
      default: false,
      index: true,
    },
    feedback_status: {
      type: String,
      enum: ["pending", "ready", "reviewed"],
      default: "pending",
    },
    feedback_notification_sent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// Clear any cached model to avoid schema conflicts
if (models.Task) {
  delete models.Task;
}

const Task = model<ITask>("Task", TaskSchema);
export default Task;
