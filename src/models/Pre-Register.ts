import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPreRegister extends Document {
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  location: string;
  role: "student" | "college" | "company";
}

const PreRegisterSchema: Schema = new Schema(
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
    phone: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "college", "company"],
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const PreRegister =
  mongoose.models && mongoose.models.PreRegister
    ? (mongoose.models.PreRegister as Model<IPreRegister>)
    : mongoose.model<IPreRegister>("PreRegister", PreRegisterSchema);

export default PreRegister;
