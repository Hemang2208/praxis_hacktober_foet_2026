import mongoose, { Schema, model, models } from "mongoose";

export interface IEmailDeliveryLog {
  user_id: mongoose.Types.ObjectId;
  notification_id: mongoose.Types.ObjectId;
  event_type: string;
  email_sent: boolean;
  sent_at?: Date;
  delivery_status: "pending" | "sent" | "failed";
  error?: string;
  retry_count: number;
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
}

const EmailDeliveryLogSchema = new Schema<IEmailDeliveryLog>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    notification_id: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
    },
    event_type: {
      type: String,
      required: true,
      index: true,
    },
    email_sent: {
      type: Boolean,
      default: false,
    },
    sent_at: {
      type: Date,
    },
    delivery_status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    error: {
      type: String,
    },
    retry_count: {
      type: Number,
      default: 0,
    },
    idempotency_key: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

EmailDeliveryLogSchema.index({ user_id: 1, event_type: 1, created_at: -1 });
EmailDeliveryLogSchema.index({ delivery_status: 1, retry_count: 1 });

const EmailDeliveryLog =
  models?.EmailDeliveryLog
    ? (models.EmailDeliveryLog as mongoose.Model<IEmailDeliveryLog>)
    : model<IEmailDeliveryLog>("EmailDeliveryLog", EmailDeliveryLogSchema);

export default EmailDeliveryLog;
