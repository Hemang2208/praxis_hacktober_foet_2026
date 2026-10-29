import mongoose, { Document, Schema, model, models } from "mongoose";

export interface ITractionMilestone {
  title: string;
  timeline: string;
}

export interface ITractionTask {
  title: string;
  description: string;
  subTasks?: {
    title: string;
    description: string;
    estimatedHours: number;
  }[];
}

export interface ITraction extends Document {
  user: {
    uid: string;
    email: string;
    password?: string;
  };
  project: {
    title?: string;
    description?: string;
    isPlanGenerated: boolean;
    created_at: Date;
    updated_at: Date;
  };
  plan?: {
    summary: string;
    milestones: ITractionMilestone[];
    tasks: ITractionTask[];
    usedFallback: boolean;
    created_at: Date;
    updated_at: Date;
  };
  history: {
    action: string;
    at: Date;
  }[];
  extras: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const MilestoneSchema = new Schema<ITractionMilestone>(
  {
    title: { type: String, required: true },
    timeline: { type: String, required: true },
  },
  { _id: false },
);

const TaskSchema = new Schema<ITractionTask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    subTasks: {
      type: [
        {
          title: { type: String, required: true, default: "" },
          description: { type: String, required: true, default: "" },
          estimatedHours: { type: Number, required: true, default: 0 },
          _id: false,
        },
      ],
      default: [],
      required: true,
    },
  },
  { _id: false },
);

const TractionSchema = new Schema<ITraction>(
  {
    user: {
      uid: { type: String, required: true, unique: true },
      email: { type: String, required: true },
      password: { type: String, required: false, default: "" },
    },
    project: {
      title: { type: String, required: false },
      description: { type: String, required: false },
      isPlanGenerated: { type: Boolean, required: true, default: false },
      created_at: { type: Date, required: true, default: Date.now },
      updated_at: { type: Date, required: true, default: Date.now },
    },
    plan: {
      summary: { type: String, default: "" },
      milestones: { type: [MilestoneSchema], default: [] },
      tasks: { type: [TaskSchema], default: [] },
      usedFallback: { type: Boolean, default: false },
      created_at: { type: Date, default: Date.now },
      updated_at: { type: Date, default: Date.now },
    },
    history: [
      {
        action: { type: String, required: true },
        at: { type: Date, required: true, default: Date.now },
      },
    ],
    extras: { type: Schema.Types.Mixed, default: {} },
    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now },
  },
  {
    collection: "tractions",
  },
);

const Traction =
  (models.Traction as mongoose.Model<ITraction>) ||
  model<ITraction>("Traction", TractionSchema);

export default Traction;
