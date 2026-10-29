import { useState, useEffect, useCallback } from "react";
import { ASSESSMENT_AGENT_URL } from "@/utils/API_URL";

// Response from ${ASSESSMENT_AGENT_URL}/results/{submission_id}/compare
export interface PeerComparisonData {
  assessment_id: string;
  assessment_title: string;
  total_participants: number;
  your_score: number;
  your_percentage: number;
  your_rank: number;
  students_scored_lower: number;
  students_scored_higher: number;
  students_scored_same: number;
  percentile: number;
  average_score: number;
  average_percentage: number;
  highest_score: number;
  lowest_score: number;
  median_score: number;
  max_possible_score: number;
  top_performers: Array<{
    rank: number;
    score: number;
    percentage: number;
  }>;
  performance_summary: string;
}

interface UsePeerComparisonReturn {
  data: PeerComparisonData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePeerComparison(submissionId: string | null): UsePeerComparisonReturn {
  const [data, setData] = useState<PeerComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    if (!submissionId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/results/${encodeURIComponent(submissionId)}/compare`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch peer comparison data");
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
    fetchComparison();
  }, [fetchComparison]);

  return {
    data,
    loading,
    error,
    refetch: fetchComparison,
  };
}

export default usePeerComparison;
