import { Document, Schema, model, models, Types, Model } from "mongoose";

// Interface for individual chat messages
interface IChatMessage {
  role: "student" | "ai";
  content: string;
  timestamp: Date;
  messageId?: string;
}

// Main Feedback Chat document interface
export interface IFeedbackChat extends Document {
  feedbackId: Types.ObjectId; // Reference to AIFeedback
  task_id: Types.ObjectId; // Reference to Task
  user_id: Types.ObjectId; // Reference to User

  // Chat messages array
  messages: Types.DocumentArray<IChatMessage>;

  // Metadata
  created_at: Date;
  updated_at: Date;
  lastActivity: Date;
  isActive: boolean;

  // Methods
  addMessage(role: "student" | "ai", content: string): Promise<IFeedbackChat>;
  getRecentMessages(limit?: number): IChatMessage[];
}

// Model interface with static methods
export interface IFeedbackChatModel {
  findOrCreateChat(
    feedbackId: Types.ObjectId,
    task_id: Types.ObjectId,
    user_id: Types.ObjectId,
  ): Promise<IFeedbackChat>;
}

// Chat message sub-schema
const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ["student", "ai"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000, // Reasonable limit for chat messages
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    messageId: {
      type: String,
      default: () => new Types.ObjectId().toString(),
    },
  },
  {
    _id: true,
  },
);

// Main schema
const FeedbackChatSchema = new Schema<IFeedbackChat>(
  {
    feedbackId: {
      type: Schema.Types.ObjectId,
      ref: "AIFeedback",
      required: true,
      index: true,
    },
    task_id: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// Add indexes
FeedbackChatSchema.index({ feedbackId: 1, user_id: 1 });
FeedbackChatSchema.index({ task_id: 1, user_id: 1 });
FeedbackChatSchema.index({ lastActivity: -1 });

// Instance methods
FeedbackChatSchema.methods.addMessage = async function (
  role: "student" | "ai",
  content: string,
): Promise<IFeedbackChat> {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    messageId: new Types.ObjectId().toString(),
  });

  this.lastActivity = new Date();
  return await this.save();
};

FeedbackChatSchema.methods.getRecentMessages = function (
  limit: number = 50,
): IChatMessage[] {
  return this.messages
    .sort(
      (a: IChatMessage, b: IChatMessage) =>
        b.timestamp.getTime() - a.timestamp.getTime(),
    )
    .slice(0, limit)
    .reverse(); // Return in chronological order
};

// Static methods
FeedbackChatSchema.statics.findOrCreateChat = async function (
  feedbackId: Types.ObjectId,
  task_id: Types.ObjectId,
  user_id: Types.ObjectId,
) {
  let chat = await this.findOne({ feedbackId, user_id });

  if (!chat) {
    chat = await this.create({
      feedbackId,
      task_id,
      user_id,
      messages: [],
      isActive: true,
    });
  }

  return chat;
};

// Pre-save middleware
FeedbackChatSchema.pre("save", function () {
  if (this.isModified("messages")) {
    this.lastActivity = new Date();
  }
});

// Export model
const FeedbackChat: Model<IFeedbackChat> =
  models.FeedbackChat ||
  model<IFeedbackChat>("FeedbackChat", FeedbackChatSchema);
export default FeedbackChat;
