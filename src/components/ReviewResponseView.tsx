import React from "react";
import ReactMarkdown from "react-markdown";

export const ReviewResponseView: React.FC<{ response: { review: string } }> = ({
  response,
}) => {
  const formattedReview = response?.review
    ? response.review.replace(/\\n/g, "\n")
    : "";

  return (
    <div className="review-response w-full h-full flex flex-col min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
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
          <ReactMarkdown>{formattedReview}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
