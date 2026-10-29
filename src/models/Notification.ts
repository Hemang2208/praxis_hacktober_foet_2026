import mongoose, { Document, Schema, model, models, Types } from "mongoose";

export const NOTIFICATION_EVENT_TYPES = [
  "TASK_ASSIGNED",
  "TASK_COMPLETED",
  "TASK_IN_REVIEW",
  "TASK_REJECTED",
  "TASK_BLOCKED",
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "PR_SUBMITTED",
  "CODE_REVIEW_RESULT",
  "CODE_REVIEW_PASSED",
  "CODE_REVIEW_FAILED",
  "LOGIN",
  "LOGOUT",
  "AI_FEEDBACK_READY",
  "SYSTEM_ACTIVITY",
  "PROJECT_CREATED",
  "PROJECT_APPROVED",
  "PROJECT_REJECTED",
  "PROJECT_MEMBER_ADDED",
  "ASSESSMENT_READY",
  "ASSESSMENT_SUBMITTED",
  "PLAN_GENERATED",
  "SUPPORT_ESCALATION",
  "SUPERVISOR_TASK_SUBMITTED",
  "SUPERVISOR_TASK_BLOCKED",
  "SUPERVISOR_CODE_REVIEW_READY",
  "SUPERVISOR_ASSESSMENT_CREATED",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

// Interface for notification metadata payload
interface INotificationMetadata {
  task_id?: Types.ObjectId;
  task_title?: string;
  feedback_id?: Types.ObjectId;
  pull_request_url?: string;
  project_id?: Types.ObjectId;
  project_title?: string;
  review_status?: string;
  actor_user_id?: Types.ObjectId;
  assessment_id?: Types.ObjectId;
  plan_id?: string;
  reason?: string;
  [key: string]: unknown; // Allow additional custom data
}

// Main Notification document interface
export interface INotification extends Document {
  user_id: Types.ObjectId;
  event_type: NotificationEventType;
  event_key?: string;
  title: string;
  message: string;
  metadata?: INotificationMetadata;

  // Notification status
  is_read: boolean;
  read_at?: Date;

  // Delivery channels
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };

  // Delivery status
  delivered: {
    inApp: { status: boolean; deliveredAt?: Date };
    email: { status: boolean; deliveredAt?: Date; error?: string };
    push: { status: boolean; deliveredAt?: Date; error?: string };
  };

  // Priority and scheduling
  priority: "low" | "medium" | "high" | "urgent";
  scheduled_for?: Date; // For delayed notifications
  expires_at?: Date; // For auto-expiring notifications

  // Metadata
  created_by?: Types.ObjectId; // System or admin who created the notification
  category: "feedback" | "tasks" | "projects" | "system" | "achievements" | "reviews" | "assessments" | "support";

  created_at: Date;
  updated_at: Date;

  // Instance methods
  markAsDelivered(
    channel: "inApp" | "email" | "push",
    error?: string,
  ): Promise<void>;
}

// Notification preferences interface (stored in User model)
export interface INotificationPreferences {
  channels: {
    email: {
      aiFeeback: boolean;
      taskAssignments: boolean;
      deadlineReminders: boolean;
      projectUpdates: boolean;
      systemUpdates: boolean;
    };
    push: {
      ai_feedback: boolean;
      taskAssignments: boolean;
      deadlineReminders: boolean;
      projectUpdates: boolean;
    };
    inApp: {
      ai_feedback: boolean;
      taskAssignments: boolean;
      projectUpdates: boolean;
      achievements: boolean;
      systemUpdates: boolean;
    };
  };
  frequency: {
    email: "immediate" | "daily" | "weekly";
    push: "immediate" | "disabled";
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
    timezone: string;
  };
}

// Sub-schemas
const NotificationMetadataSchema = new Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    task_title: {
      type: String,
    },
    feedback_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIFeedback",
    },
    pull_request_url: {
      type: String,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    project_title: {
      type: String,
    },
    review_status: {
      type: String,
    },
    actor_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
    },
    plan_id: {
      type: String,
    },
    reason: {
      type: String,
    },
  },
  {
    _id: false,
    strict: false,
  },
); // Allow additional fields

const ChannelsSchema = new Schema(
  {
    inApp: {
      type: Boolean,
      default: true,
    },
    email: {
      type: Boolean,
      default: false,
    },
    push: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const DeliveryStatusSchema = new Schema(
  {
    inApp: {
      status: {
        type: Boolean,
        default: false,
      },
      deliveredAt: {
        type: Date,
      },
    },
    email: {
      status: {
        type: Boolean,
        default: false,
      },
      deliveredAt: {
        type: Date,
      },
      error: {
        type: String,
      },
    },
    push: {
      status: {
        type: Boolean,
        default: false,
      },
      deliveredAt: {
        type: Date,
      },
      error: {
        type: String,
      },
    },
  },
  {
    _id: false,
  },
);

// Main schema
const NotificationSchema = new Schema<INotification>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event_type: {
      type: String,
      enum: NOTIFICATION_EVENT_TYPES,
      required: true,
      index: true,
      alias: "type",
    },
    event_key: {
      type: String,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    metadata: {
      type: NotificationMetadataSchema,
      alias: "data",
    },

    // Notification status
    is_read: {
      type: Boolean,
      default: false,
      index: true,
      alias: "isRead",
    },
    read_at: {
      type: Date,
      alias: "readAt",
    },

    // Delivery channels
    channels: {
      type: ChannelsSchema,
      default: { inApp: true, email: false, push: false },
    },

    // Delivery status
    delivered: {
      type: DeliveryStatusSchema,
      default: {
        inApp: { status: false },
        email: { status: false },
        push: { status: false },
      },
    },

    // Priority and scheduling
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    scheduled_for: {
      type: Date,
      index: true,
      alias: "scheduledFor",
    },
    expires_at: {
      type: Date,
      alias: "expiresAt",
    },

    // Metadata
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      alias: "createdBy",
    },
    category: {
      type: String,
      enum: ["feedback", "tasks", "projects", "system", "achievements", "reviews", "assessments", "support"],
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for efficient queries
NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, category: 1, created_at: -1 });
NotificationSchema.index({ scheduled_for: 1, "delivered.inApp.status": 1 });
NotificationSchema.index(
  { user_id: 1, event_key: 1 },
  { unique: true, sparse: true },
);

// TTL index for expired notifications (optional - removes after 30 days if expiresAt is set)
NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if notification is overdue
NotificationSchema.virtual("isOverdue").get(function () {
  return (
    this.scheduled_for &&
    this.scheduled_for < new Date() &&
    !this.delivered.inApp.status
  );
});

// Instance methods
NotificationSchema.methods.markAsRead = function () {
  this.is_read = true;
  this.read_at = new Date();
  return this.save();
};

NotificationSchema.methods.markAsDelivered = function (
  channel: "inApp" | "email" | "push",
  error?: string,
) {
  this.delivered[channel].status = !error;
  this.delivered[channel].deliveredAt = new Date();
  if (error) {
    this.delivered[channel].error = error;
  }
  return this.save();
};

// Static methods for creating specific notification types
NotificationSchema.statics.createAIFeedbackReadyNotification = function (
  user_id: Types.ObjectId,
  task_id: Types.ObjectId,
  task_title: string,
  feedback_id: Types.ObjectId,
  pull_request_url: string,
) {
  return this.create({
    user_id,
    event_type: "AI_FEEDBACK_READY",
    title: "AI Feedback Ready 🎯",
    message: `Your AI code review for "${task_title}" is ready to view. Check out the detailed feedback and suggestions to improve your code.`,
    metadata: {
      task_id,
      task_title,
      feedback_id,
      pull_request_url,
    },
    category: "feedback",
    priority: "medium",
    channels: {
      inApp: true,
      email: true, // Default to email for important feedback
      push: true,
    },
  });
};

NotificationSchema.statics.createTaskAssignedNotification = function (
  user_id: Types.ObjectId,
  task_id: Types.ObjectId,
  task_title: string,
  project_id?: Types.ObjectId,
  project_title?: string,
) {
  return this.create({
    user_id,
    event_type: "TASK_ASSIGNED",
    title: "New Task Assigned 📋",
    message: `You've been assigned a new task: "${task_title}"${project_title ? ` in project "${project_title}"` : ""}.`,
    metadata: {
      task_id,
      task_title,
      project_id,
      project_title,
    },
    category: "tasks",
    priority: "high",
    channels: {
      inApp: true,
      email: true,
      push: true,
    },
  });
};

NotificationSchema.statics.createPRLinkedNotification = function (
  user_id: Types.ObjectId,
  task_id: Types.ObjectId,
  task_title: string,
  pull_request_url: string,
) {
  return this.create({
    user_id,
    event_type: "PR_SUBMITTED",
    title: "Pull Request Submitted 🔗",
    message: `Pull request successfully linked to task: "${task_title}". Your submission is ready for review.`,
    metadata: {
      task_id,
      task_title,
      pull_request_url,
    },
    category: "tasks",
    priority: "medium",
    channels: {
      inApp: true,
      email: false,
      push: true,
    },
  });
};

NotificationSchema.statics.createPRUnlinkedNotification = function (
  user_id: Types.ObjectId,
  task_id: Types.ObjectId,
  task_title: string,
) {
  return this.create({
    user_id,
    event_type: "SYSTEM_ACTIVITY",
    title: "Pull Request Unlinked 🔓",
    message: `Pull request has been unlinked from task: "${task_title}". Task status has been updated to in-progress.`,
    metadata: {
      task_id,
      task_title,
    },
    category: "tasks",
    priority: "medium",
    channels: {
      inApp: true,
      email: false,
      push: false,
    },
  });
};

NotificationSchema.statics.createTaskSubmittedNotification = function (
  user_id: Types.ObjectId,
  task_id: Types.ObjectId,
  task_title: string,
  pull_request_url?: string,
) {
  return this.create({
    user_id,
    event_type: "PR_SUBMITTED",
    title: "Task Submitted ✅",
    message: `Task "${task_title}" has been successfully submitted${pull_request_url ? " with pull request" : ""}. Your work is now under review.`,
    metadata: {
      task_id,
      task_title,
      pull_request_url,
    },
    category: "tasks",
    priority: "medium",
    channels: {
      inApp: true,
      email: true,
      push: true,
    },
  });
};

// Interface for the model with static methods
interface INotificationModel extends mongoose.Model<INotification> {
  createAIFeedbackReadyNotification(
    user_id: Types.ObjectId,
    task_id: Types.ObjectId,
    task_title: string,
    feedback_id: Types.ObjectId,
    pull_request_url?: string,
  ): Promise<INotification>;

  createTaskAssignedNotification(
    user_id: Types.ObjectId,
    task_id: Types.ObjectId,
    task_title: string,
    project_id?: Types.ObjectId,
    project_title?: string,
  ): Promise<INotification>;

  createPRLinkedNotification(
    user_id: Types.ObjectId,
    task_id: Types.ObjectId,
    task_title: string,
    pull_request_url: string,
  ): Promise<INotification>;

  createPRUnlinkedNotification(
    user_id: Types.ObjectId,
    task_id: Types.ObjectId,
    task_title: string,
  ): Promise<INotification>;

  createTaskSubmittedNotification(
    user_id: Types.ObjectId,
    task_id: Types.ObjectId,
    task_title: string,
    pull_request_url?: string,
  ): Promise<INotification>;
}

// Clear any cached model to avoid conflicts
if (models.Notification) {
  delete models.Notification;
}

const Notification = model<INotification, INotificationModel>(
  "Notification",
  NotificationSchema,
);
export default Notification;
