"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AssessmentScores {
  codeQuality?: number;
  documentation?: number;
  testCoverage?: number;
  performance?: number;
  overall?: number;
}

interface CodeFeedback {
  task_id?: string;
  feedback?: string;
  assessment?: AssessmentScores;
  strengths?: string[];
  improvements?: string[];
  pull_request_url?: string;
  analysisDate?: string;
  ai_model?: string;
}

interface CodeFeedbackDisplayProps {
  feedbacks: CodeFeedback[];
  totalCount?: number;
}

export function CodeFeedbackDisplay({
  feedbacks,
  totalCount,
}: CodeFeedbackDisplayProps) {
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No code feedback available yet. 🚀
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-sm font-semibold text-muted-foreground mb-4">
        💬 Code Feedback ({totalCount || feedbacks.length} total)
      </div>

      <div className="space-y-6">
        {feedbacks.map((feedback, index) => {
          const scores = feedback.assessment || {};
          const overallScore = scores.overall || 0;
          const taskShortId =
            feedback.task_id?.slice(0, 8) || `Task ${index + 1}`;
          const scoreColor =
            overallScore >= 90 ? "🟢" : overallScore >= 75 ? "🟡" : "🔴";

          return (
            <div
              key={index}
              className="pb-5 border-b border-border last:border-0"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{scoreColor}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {taskShortId}
                  </span>
                  <Badge
                    variant={
                      overallScore >= 90
                        ? "default"
                        : overallScore >= 75
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {overallScore}%
                  </Badge>
                </div>
              </div>

              {/* Feedback text */}
              {feedback.feedback && (
                <p className="text-sm mb-3 text-foreground/80">
                  {feedback.feedback}
                </p>
              )}

              {/* Scores inline */}
              <div className="flex flex-wrap gap-3 text-xs mb-3">
                <span className="text-muted-foreground">
                  📊 <strong>Quality:</strong> {scores.codeQuality || 0}%
                </span>
                <span className="text-muted-foreground">
                  <strong>Docs:</strong> {scores.documentation || 0}%
                </span>
                <span className="text-muted-foreground">
                  <strong>Tests:</strong> {scores.testCoverage || 0}%
                </span>
                <span className="text-muted-foreground">
                  <strong>Perf:</strong> {scores.performance || 0}%
                </span>
              </div>

              {/* Strengths */}
              {feedback.strengths && feedback.strengths.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-green-600">
                    ✅ Strengths:{" "}
                  </span>
                  <span className="text-xs text-foreground/70">
                    {feedback.strengths.join(", ")}
                  </span>
                </div>
              )}

              {/* Improvements */}
              {feedback.improvements && feedback.improvements.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-blue-600">
                    💡 Improvements:{" "}
                  </span>
                  <span className="text-xs text-foreground/70">
                    {feedback.improvements.join(", ")}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-2">
                  {feedback.analysisDate && (
                    <span>
                      📅 {new Date(feedback.analysisDate).toLocaleDateString()}
                    </span>
                  )}
                  {feedback.ai_model && <span>• {feedback.ai_model}</span>}
                </div>
                {feedback.pull_request_url && (
                  <Link
                    href={feedback.pull_request_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    🔗 View PR
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
