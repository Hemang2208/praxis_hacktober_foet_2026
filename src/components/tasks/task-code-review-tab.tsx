import React from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { buildCodeReviewMarkdown } from "@/lib/aiFeedback";

interface TaskCodeReviewTabProps {
  task: any;
}

/**
 * Extract a renderable markdown string from ai_feedback which may be:
 * - a plain string (legacy)
 * - a structured object with .review / .summary / assessment fields
 */
function resolveReviewMarkdown(aiFeeds: unknown): string | null {
  if (!aiFeeds) return null;
  if (typeof aiFeeds === "string") {
    return aiFeeds.replace(/\\n/g, "\n").trim() || null;
  }
  if (typeof aiFeeds !== "object") return null;

  const obj = aiFeeds as Record<string, unknown>;

  // If the object has a review string, use it directly
  if (typeof obj.review === "string" && obj.review.trim()) {
    return obj.review.replace(/\\n/g, "\n").trim();
  }

  // Try building markdown from structured fields (summary, assessment, comments, etc.)
  try {
    const markdown = buildCodeReviewMarkdown(obj as any);
    if (markdown && markdown.trim()) {
      return markdown.replace(/\\n/g, "\n");
    }
  } catch {
    // ignore build errors
  }

  // Last resort: if there's a summary string, use that
  if (typeof obj.summary === "string" && obj.summary.trim()) {
    return obj.summary.replace(/\\n/g, "\n").trim();
  }

  return null;
}

export function TaskCodeReviewTab({ task }: TaskCodeReviewTabProps) {
  const aiFeeds = task?.ai_feedback || null;

  if (!aiFeeds) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="w-full max-w-md border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Code Review Available
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Code review feedback will appear here once generated for a linked
              pull request.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (typeof aiFeeds === "object" && aiFeeds.status === "generating") {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="w-full max-w-md border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-400 mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Generating Code Review
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              AI is analyzing your pull request. This may take a moment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Resolve the review text — handles both string and structured object formats
  const reviewMarkdown = resolveReviewMarkdown(aiFeeds);

  if (!reviewMarkdown) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="w-full max-w-md border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Code Review Available
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Code review feedback will appear here once generated for a linked
              pull request.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
        <svg
          width="28"
          height="28"
          fill="none"
          viewBox="0 0 24 24"
          className="text-blue-600 dark:text-blue-400 shrink-0"
        >
          <path
            fill="currentColor"
            d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Code Review
        </h2>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 py-6">
        <div className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed break-words prose-code:break-words prose-ul:pl-6 prose-ol:pl-6 prose-li:my-1 prose-pre:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:max-w-full prose-table:overflow-x-auto">
          <ReactMarkdown>{reviewMarkdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
