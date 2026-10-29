import mongoose, { Schema, Document, model, models, Types } from "mongoose";

// Subdocument interfaces
interface IResource {
  profile: string;
  skills: string[];
  experience: string;
  description: string;
  type: string;
  avatar?: string;
  username?: string;
  name?: string;
  user?: string;
}

interface ISprint {
  name: string;
  progress: number;
  status: string;
}

interface ITimelineEvent {
  title: string;
  description: string;
  type: string;
  date: Date;
}

interface ITeamMember {
  name: string;
  avatar: string;
  email?: string;
  role?: string;
  user?: Types.ObjectId;
}

interface IGitHubCommit {
  id: string;
  message: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  repository: string;
  branch: string;
  url: string;
  additions: number;
  deletions: number;
  avatarUrl?: string;
}

// Main document interface
export interface IProject extends Document {
  title: string;
  description: string;
  deadline?: Date;
  tags: string[];
  document: string;
  status: string;
  tasks: Types.ObjectId[];
  progress: number;
  team: ITeamMember[];
  // Frontend uses `team_members` in several places; keep typed alias for compatibility
  team_members?: ITeamMember[];
  sprints: ISprint[];
  timeline: ITimelineEvent[];
  resources: IResource[];
  user?: Types.ObjectId;
  created_by?: Types.ObjectId;
  companyId?: Types.ObjectId;
  // GitHub integration fields
  githubCommits?: IGitHubCommit[];
  github_repository?: string;
  lastCommitSync?: Date;
  // Jira integration fields
  jira_project_key?: string;
  jira_project_id?: string;
  lastJiraSync?: Date;
  created_at: Date;
  updated_at: Date;
}

// Sub-schemas
const ResourceSchema = new Schema<IResource>(
  {
    profile: { type: String, required: true },
    skills: [String],
    experience: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    avatar: { type: String, required: false },
    username: { type: String, required: false },
    name: { type: String, required: false },
    user: { type: String, required: false }, // Store as string to match backend
  },
  { _id: false },
);

const SprintSchema = new Schema<ISprint>(
  {
    name: String,
    progress: Number,
    status: String,
  },
  { _id: false },
);

const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    title: String,
    description: String,
    type: String,
    date: Date,
  },
  { _id: false },
);

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    name: {
      type: String,
    },
    avatar: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "Contributor",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    _id: false,
  },
);

const GitHubCommitSchema = new Schema<IGitHubCommit>(
  {
    id: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    authorEmail: {
      type: String,
      required: true,
    },
    timestamp: {
      type: String,
      required: true,
    },
    repository: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    additions: {
      type: Number,
      default: 0,
    },
    deletions: {
      type: Number,
      default: 0,
    },
    avatarUrl: {
      type: String,
    },
  },
  {
    _id: false,
  },
);

// Main Project schema
const ProjectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    deadline: Date,
    tags: [String],
    document: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "planning",
    },
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    progress: {
      type: Number,
      default: 0,
    },
    team: [TeamMemberSchema],
    // New field: persist frontend's `team_members` writes. Keeps backward compatibility.
    team_members: [TeamMemberSchema],
    sprints: [SprintSchema],
    timeline: [TimelineEventSchema],
    resources: [ResourceSchema],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // GitHub integration fields
    githubCommits: [GitHubCommitSchema],
    github_repository: { type: String },
    lastCommitSync: { type: Date },
    // Jira integration fields
    jira_project_key: { type: String },
    jira_project_id: { type: String },
    lastJiraSync: { type: Date },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const Project =
  (models.Project as mongoose.Model<IProject>) ||
  model<IProject>("Project", ProjectSchema);
export default Project;
