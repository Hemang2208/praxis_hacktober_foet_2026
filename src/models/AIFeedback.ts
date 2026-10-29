import mongoose, { Document, Schema, model, models, Types } from "mongoose";

// Interface for code review comments
interface ICodeComment {
  _id: Types.ObjectId;
  line: number;
  column?: number;
  fileName: string;
  message: string;
  severity: "info" | "warning" | "error" | "suggestion";
  category:
    | "code-quality"
    | "performance"
    | "security"
    | "best-practices"
    | "documentation";
  suggestion?: string;
  example?: string;
}

// Interface for overall assessment metrics
interface IAssessment {
  codeQuality: number; // 0-100
  documentation: number; // 0-100
  testCoverage: number; // 0-100
  performance: number; // 0-100
  security: number; // 0-100
  bestPractices: number; // 0-100
  overall: number; // 0-100
}

// Main AI Feedback document interface
export interface IAIFeedback extends Document {
  task_id: Types.ObjectId;
  user_id: Types.ObjectId;
  pull_request_url: string;
  repository_url?: string;
  branch_name?: string;
  commitHash?: string;
  review?: string;

  // Code review data
  comments: Types.DocumentArray<ICodeComment>;
  assessment?: IAssessment;

  // Summary and recommendations
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];

  // AI processing metadata
  ai_model: string;
  processing_time: number; // milliseconds
  analysisDate: Date;
  status: "pending" | "completed" | "failed" | "reviewing";
  error?: string;

  // Feedback stats
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;

  // Student interaction
  isRead: boolean;
  readAt?: Date;
  studentRating?: number; // 1-5 stars
  studentFeedback?: string;

  created_at: Date;
  updated_at: Date;

  // Methods
  markAsRead(): Promise<IAIFeedback>;
  addStudentRating(rating: number, feedback?: string): Promise<IAIFeedback>;
}

// Sub-schemas
const CodeCommentSchema = new Schema<ICodeComment>({
  line: {
    type: Number,
    required: true,
  },
  column: {
    type: Number,
  },
  fileName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ["info", "warning", "error", "suggestion"],
    required: true,
  },
  category: {
    type: String,
    enum: [
      "code-quality",
      "performance",
      "security",
      "best-practices",
      "documentation",
    ],
    required: true,
  },
  suggestion: { type: String },
  example: { type: String },
});

const AssessmentSchema = new Schema<IAssessment>(
  {
    codeQuality: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    documentation: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    testCoverage: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    performance: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    security: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    bestPractices: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    overall: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
  },
  { _id: false },
);

// Main schema
const AIFeedbackSchema = new Schema<IAIFeedback>(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pull_request_url: {
      type: String,
      required: true,
    },
    repository_url: {
      type: String,
    },
    branch_name: {
      type: String,
    },
    commitHash: {
      type: String,
    },
    review: {
      type: String,
    },

    // Code review data
    comments: {
      type: [CodeCommentSchema],
      default: [],
    },
    assessment: {
      type: AssessmentSchema,
    },

    // Summary and recommendations
    summary: {
      type: String,
      required: true,
    },
    strengths: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },

    // AI processing metadata
    ai_model: {
      type: String,
      required: true,
      default: "gpt-4",
    },
    processing_time: {
      type: Number,
      required: true,
    },
    analysisDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "reviewing"],
      default: "pending",
      index: true,
    },
    error: {
      type: String,
    },

    // Feedback stats
    totalIssues: {
      type: Number,
      default: 0,
    },
    criticalIssues: {
      type: Number,
      default: 0,
    },
    warningIssues: {
      type: Number,
      default: 0,
    },
    infoIssues: {
      type: Number,
      default: 0,
    },

    // Student interaction
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    studentRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    studentFeedback: {
      type: String,
    },
  },
  {
    collection: "ai_feedback",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for efficient queries
AIFeedbackSchema.index({ task_id: 1, user_id: 1 });
AIFeedbackSchema.index({ task_id: 1, pull_request_url: 1 });
AIFeedbackSchema.index({ status: 1, created_at: -1 });
AIFeedbackSchema.index({ user_id: 1, isRead: 1 });

// Virtual for getting severity counts
AIFeedbackSchema.virtual("severityCounts").get(function () {
  const counts = {
    error: 0,
    warning: 0,
    info: 0,
    suggestion: 0,
  };

  this.comments.forEach((comment) => {
    counts[comment.severity]++;
  });

  return counts;
});

// Pre-save middleware to calculate issue counts
AIFeedbackSchema.pre("save", function (next) {
  if (this.isModified("comments")) {
    const severityCounts = {
      error: 0,
      warning: 0,
      info: 0,
      suggestion: 0,
    };

    this.comments.forEach((comment) => {
      severityCounts[comment.severity]++;
    });

    this.totalIssues = this.comments.length;
    this.criticalIssues = severityCounts.error;
    this.warningIssues = severityCounts.warning;
    this.infoIssues = severityCounts.info + severityCounts.suggestion;
  }
  next();
});

// Method to mark as read
AIFeedbackSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to add student rating
AIFeedbackSchema.methods.addStudentRating = function (
  rating: number,
  feedback?: string,
) {
  this.studentRating = rating;
  if (feedback) {
    this.studentFeedback = feedback;
  }
  return this.save();
};

// Clear any cached model to avoid conflicts
if (models.AIFeedback) {
  delete models.AIFeedback;
}

const AIFeedback = model<IAIFeedback>("AIFeedback", AIFeedbackSchema);
export default AIFeedback;
