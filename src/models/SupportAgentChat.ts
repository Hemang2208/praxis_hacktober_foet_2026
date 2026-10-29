import { Document, Schema, model, models, Types, Model } from "mongoose";

interface ISupportMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ISupportMessageExtended extends ISupportMessage {
  type?: string;
  data?: unknown;
}

export interface ISupportAgentChat extends Document {
  user_id?: Types.ObjectId; // reference to User (optional)
  title?: string;
  messages: Types.DocumentArray<ISupportMessageExtended>;
  created_at: Date;
  updated_at: Date;
  lastActivity: Date;
  is_deleted?: boolean;
  deleted_at?: Date;
  addMessage(
    role: "user" | "assistant",
    content: string,
    type?: string,
    data?: unknown,
  ): Promise<ISupportAgentChat>;
  getRecentMessages(limit?: number): ISupportMessageExtended[];
}

const SupportMessageSchema = new Schema<ISupportMessageExtended>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      required: false,
    },
    data: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  { _id: true },
);

const SupportAgentChatSchema = new Schema<ISupportAgentChat>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    // externaluser_id: {
    //   type: String,
    //   required: false,
    //   index: true,
    // },
    title: {
      type: String,
      default: "Support Chat",
    },
    messages: {
      type: [SupportMessageSchema],
      default: [],
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_at: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

SupportAgentChatSchema.methods.addMessage = async function (
  role: "user" | "assistant",
  content: string,
  type?: string,
  data?: unknown,
) {
  const msg: ISupportMessageExtended = { role, content, timestamp: new Date() };
  if (type) msg.type = type;
  if (typeof data !== "undefined") msg.data = data;
  // Avoid `any` by casting the DocumentArray to a plain array for push
  (this.messages as unknown as ISupportMessageExtended[]).push(msg);
  this.lastActivity = new Date();
  return this.save();
};

SupportAgentChatSchema.methods.getRecentMessages = function (
  limit: number = 100,
) {
  return this.messages.slice(-limit).map((m: ISupportMessageExtended) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    type: m.type,
    data: m.data,
  }));
};

SupportAgentChatSchema.index({
  user_id: 1,
  lastActivity: -1,
});

const SupportAgentChat: Model<ISupportAgentChat> =
  models.SupportAgentChat ||
  model<ISupportAgentChat>("SupportAgentChat", SupportAgentChatSchema);
export default SupportAgentChat;
