export interface CodeReviewCommentInput {
  line?: number;
  column?: number;
  fileName?: string;
  message?: string;
  severity?: "info" | "warning" | "error" | "suggestion" | string;
  category?: string;
  suggestion?: string;
  example?: string;
}

export interface CodeReviewAssessmentInput {
  codeQuality?: number;
  documentation?: number;
  testCoverage?: number;
  performance?: number;
  security?: number;
  bestPractices?: number;
  overall?: number;
}

export interface CodeReviewPayloadInput {
  review?: string | null;
  summary?: string | null;
  assessment?: CodeReviewAssessmentInput | null;
  strengths?: string[] | null;
  improvements?: string[] | null;
  recommendations?: string[] | null;
  comments?: CodeReviewCommentInput[] | null;
  pull_request_url?: string | null;
  repository_url?: string | null;
  branch_name?: string | null;
  ai_model?: string | null;
  processing_time?: number | null;
}

const formatScoreLine = (label: string, value?: number): string | null => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `- ${label}: ${value}/100`;
};

const formatListSection = (
  title: string,
  values: string[] | null | undefined,
) => {
  if (!Array.isArray(values) || values.length === 0) return "";
  return [title, ...values.map((item) => `- ${item}`)].join("\n");
};

export function deriveReviewSummary(
  summary?: string | null,
  review?: string | null,
): string {
  const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
  if (trimmedSummary) return trimmedSummary;

  const trimmedReview = typeof review === "string" ? review.trim() : "";
  if (!trimmedReview) return "AI code review completed.";

  const firstMeaningfulLine = trimmedReview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#"));

  if (firstMeaningfulLine) {
    return firstMeaningfulLine.length > 180
      ? `${firstMeaningfulLine.slice(0, 177)}...`
      : firstMeaningfulLine;
  }

  return trimmedReview.length > 180
    ? `${trimmedReview.slice(0, 177)}...`
    : trimmedReview;
}

export function buildCodeReviewMarkdown(
  payload: CodeReviewPayloadInput,
): string {
  if (typeof payload.review === "string" && payload.review.trim()) {
    return payload.review.trim();
  }

  const lines: string[] = ["# AI Code Review"];

  const summary = deriveReviewSummary(payload.summary, payload.review);
  if (summary) {
    lines.push("", "## Summary", summary);
  }

  const assessment = payload.assessment ?? undefined;
  const scoreLines = assessment
    ? [
        formatScoreLine("Overall", assessment.overall),
        formatScoreLine("Code Quality", assessment.codeQuality),
        formatScoreLine("Documentation", assessment.documentation),
        formatScoreLine("Test Coverage", assessment.testCoverage),
        formatScoreLine("Performance", assessment.performance),
        formatScoreLine("Security", assessment.security),
        formatScoreLine("Best Practices", assessment.bestPractices),
      ].filter((item): item is string => Boolean(item))
    : [];

  if (scoreLines.length > 0) {
    lines.push("", "## Assessment", ...scoreLines);
  }

  const strengthsSection = formatListSection("## Strengths", payload.strengths);
  if (strengthsSection) {
    lines.push("", strengthsSection);
  }

  const improvementsSection = formatListSection(
    "## Improvements",
    payload.improvements,
  );
  if (improvementsSection) {
    lines.push("", improvementsSection);
  }

  const recommendationsSection = formatListSection(
    "## Recommendations",
    payload.recommendations,
  );
  if (recommendationsSection) {
    lines.push("", recommendationsSection);
  }

  if (Array.isArray(payload.comments) && payload.comments.length > 0) {
    const commentLines = payload.comments.map((comment) => {
      const locationParts = [comment.fileName, comment.line]
        .filter((part) => part !== undefined && part !== null && part !== "")
        .join(":");
      const header = locationParts ? `- ${locationParts}` : "- Comment";
      const message = comment.message?.trim() || "Review comment";
      const suffix = comment.suggestion?.trim()
        ? `\n  - Suggestion: ${comment.suggestion.trim()}`
        : "";
      return `${header}: ${message}${suffix}`;
    });

    lines.push("", "## Comments", ...commentLines);
  }

  if (
    payload.pull_request_url ||
    payload.repository_url ||
    payload.branch_name
  ) {
    const meta: string[] = [];
    if (payload.pull_request_url)
      meta.push(`- PR: ${payload.pull_request_url}`);
    if (payload.repository_url)
      meta.push(`- Repository: ${payload.repository_url}`);
    if (payload.branch_name) meta.push(`- Branch: ${payload.branch_name}`);
    if (payload.ai_model) meta.push(`- Model: ${payload.ai_model}`);
    if (typeof payload.processing_time === "number") {
      meta.push(`- Processing Time: ${payload.processing_time}ms`);
    }

    if (meta.length > 0) {
      lines.push("", "## Metadata", ...meta);
    }
  }

  return lines.join("\n").trim();
}
