import mongoose, { Document, Schema } from "mongoose";
import { CONTACT_STATUSES, type ContactStatus } from "@/lib/view-status";

export interface IContact extends Document {
  full_name: string;
  email: string;
  message: string;
  status: ContactStatus;
}

const ContactSchema: Schema = new Schema(
  {
    full_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: CONTACT_STATUSES,
      default: "PENDING",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const Contact =
  mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);

export default Contact;
