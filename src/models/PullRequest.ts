import mongoose, { Schema, Types, Document, Model } from "mongoose";

export interface Ipull_request extends Document {
  user_id: Types.ObjectId;
  task_id: Types.ObjectId;
  pull_request: {
    url: string;
    branch: string;
    status: string;
    title?: string;
    description?: string;
  };
  submitted_at: Date;
  status: string;
  githubId?: string;
}

const pull_requestSchema: Schema<Ipull_request> = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  task_id: { type: Schema.Types.ObjectId, ref: "Task", required: true },
  pull_request: {
    url: { type: String, required: true },
    branch: { type: String, required: false },
    status: { type: String, required: false },
    title: { type: String, required: false },
    description: { type: String, required: false },
  },
  submitted_at: { type: Date, required: true },
  status: { type: String, required: true },
  githubId: { type: String, required: false, sparse: true }, // sparse index allows multiple null values
});

const pull_request: Model<Ipull_request> =
  mongoose.models.pull_request ||
  mongoose.model<Ipull_request>("pull_request", pull_requestSchema);
export default pull_request;
