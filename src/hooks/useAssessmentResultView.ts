import { useState, useEffect, useCallback } from "react";
import { ASSESSMENT_AGENT_URL } from "@/utils/API_URL";

// Question feedback from the view endpoint
export interface QuestionFeedback {
  question_id: string;
  question: string;
  type: string;
  options?: string[];
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  explanation: string;
  feedback?: string;
}

// Overall feedback structure
export interface OverallFeedback {
  overall: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

// Score breakdown
export interface ScoreBreakdown {
  total_score: number;
  max_score: number;
  percentage: number;
  correct_answers: number;
  total_questions: number;
}

// Complete assessment result view from the API
export interface AssessmentResultView {
  submission_id: string;
  assessment_id: string;
  project_id: string;
  user_id: string;
  assessment_title: string;
  assessment_description?: string;
  difficulty?: string;
  status: string;
  submitted_at: string;
  completed_at: string;
  time_taken?: number; // in seconds
  score: ScoreBreakdown;
  feedback: OverallFeedback;
  questions: QuestionFeedback[];
}

interface UseAssessmentResultViewReturn {
  data: AssessmentResultView | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAssessmentResultView(
  submissionId: string | null
): UseAssessmentResultViewReturn {
  const [data, setData] = useState<AssessmentResultView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResultView = useCallback(async () => {
    if (!submissionId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/results/${encodeURIComponent(submissionId)}/view`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch assessment result");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchResultView();
  }, [fetchResultView]);

  return {
    data,
    loading,
    error,
    refetch: fetchResultView,
  };
}

export default useAssessmentResultView;
