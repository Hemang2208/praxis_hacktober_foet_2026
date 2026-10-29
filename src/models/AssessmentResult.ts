import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface IQuestionFeedback {
  question_index: number;
  question: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  feedback: string;
}

export interface IAssessmentResult extends Document {
  submission_id: string;
  assessment_id: string;
  user_id: string;
  score: {
    total_score: number;
    max_score: number;
    percentage: number;
    correct_answers: number;
    total_questions: number;
  };
  feedback: {
    overall_feedback: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  question_feedback: IQuestionFeedback[];
  completed_at: Date;
  status: string;
}

const QuestionFeedbackSchema = new Schema<IQuestionFeedback>(
  {
    question_index: { type: Number, required: true },
    question: { type: String, required: true },
    student_answer: { type: String, default: "" },
    correct_answer: { type: String, required: true },
    is_correct: { type: Boolean, required: true },
    points_earned: { type: Number, required: true },
    max_points: { type: Number, required: true },
    feedback: { type: String, default: "" },
  },
  { _id: false }
);

const AssessmentResultSchema = new Schema<IAssessmentResult>(
  {
    submission_id: { type: String, required: true },
    assessment_id: { type: String, required: true },
    user_id: { type: String, required: true },
    score: {
      total_score: { type: Number, required: true },
      max_score: { type: Number, required: true },
      percentage: { type: Number, required: true },
      correct_answers: { type: Number, required: true },
      total_questions: { type: Number, required: true },
    },
    feedback: {
      overall_feedback: { type: String, default: "" },
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      recommendations: [{ type: String }],
    },
    question_feedback: [QuestionFeedbackSchema],
    completed_at: { type: Date, default: Date.now },
    status: { type: String, default: "completed" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "results", // Explicitly set collection name
  }
);

// Create indexes for common queries
AssessmentResultSchema.index({ assessment_id: 1 });
AssessmentResultSchema.index({ user_id: 1 });
AssessmentResultSchema.index({ submission_id: 1 }, { unique: true });

const AssessmentResult: Model<IAssessmentResult> =
  models.AssessmentResult ||
  mongoose.model<IAssessmentResult>("AssessmentResult", AssessmentResultSchema);

export default AssessmentResult;
