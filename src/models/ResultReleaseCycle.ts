import mongoose, { Schema, Document, model, models, Types } from "mongoose";

export interface IResultReleaseCycle extends Document {
  project_id: Types.ObjectId;
  user_id: Types.ObjectId;
  projectTitle: string;
  created_at: Date;
  processingDate: Date; // Date when results should be released (7 days after project creation)
  status: "pending" | "completed" | "failed";
  emailsSent: number;
  error?: string;
  processedAt?: Date;
}

const ResultReleaseCycleSchema = new Schema<IResultReleaseCycle>(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectTitle: {
      type: String,
      required: true,
    },
    processingDate: {
      type: Date,
      required: true,
      index: true, // Index for efficient queries
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true, // Index for efficient queries
    },
    emailsSent: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// Compound index for efficient queries
ResultReleaseCycleSchema.index({ processingDate: 1, status: 1 });
ResultReleaseCycleSchema.index({ project_id: 1 }, { unique: true }); // One cycle per project

const ResultReleaseCycle =
  (models.ResultReleaseCycle as mongoose.Model<IResultReleaseCycle>) ||
  model<IResultReleaseCycle>("ResultReleaseCycle", ResultReleaseCycleSchema);

export default ResultReleaseCycle;
