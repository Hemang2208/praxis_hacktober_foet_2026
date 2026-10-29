import mongoose from "mongoose";

// Define the interface for the project plan
export interface IProjectPlan {
  project_id: string;
  summary: string;
  key_features_deliverables: string[];
  major_milestones: {
    name: string;
    timeline: string;
  }[];
  high_level_tasks: {
    task_name: string;
    description: string;
    dependencies: string[];
    estimated_duration: string;
  }[];
  updated_at: string;
  created_at: string;
}

// Define the ProjectPlan schema
const ProjectPlanSchema = new mongoose.Schema<IProjectPlan>(
  {
    project_id: { type: String, required: true },
    summary: { type: String, required: true },
    key_features_deliverables: [{ type: String }],
    major_milestones: [
      {
        name: { type: String, required: true },
        timeline: { type: String, required: true },
      },
    ],
    high_level_tasks: [
      {
        task_name: { type: String, required: true },
        description: { type: String, required: true },
        dependencies: [{ type: String }],
        estimated_duration: { type: String, required: true },
      },
    ],
    updated_at: { type: String, required: true },
    created_at: { type: String, required: true },
  },
  {
    collection: "project_plans",
    timestamps: false, // We're managing timestamps manually
  }
);

// Create indexes for better performance
ProjectPlanSchema.index({ project_id: 1 });
ProjectPlanSchema.index({ created_at: -1 });

// Create or get the model
const ProjectPlan = (mongoose.models.ProjectPlan as mongoose.Model<IProjectPlan>) ||
  mongoose.model<IProjectPlan>("ProjectPlan", ProjectPlanSchema);

export default ProjectPlan;
