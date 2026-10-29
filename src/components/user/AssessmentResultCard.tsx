"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAssessmentResultView, QuestionFeedback } from "@/hooks/useAssessmentResultView";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  BookOpen,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";

interface AssessmentResultCardProps {
  submissionId: string;
  showQuestions?: boolean;
}

function QuestionCard({ question, index }: { question: QuestionFeedback; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`p-4 rounded-lg border ${
        question.is_correct 
          ? "border-green-200 bg-green-50/50" 
          : "border-red-200 bg-red-50/50"
      }`}
    >
      <div 
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${
            question.is_correct ? "bg-green-500" : "bg-red-500"
          }`}>
            {question.is_correct ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <XCircle className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700">
              Q{index + 1}. {question.question}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {question.type.replace("_", " ")}
              </Badge>
              <span className="text-xs text-slate-500">
                {question.points_earned}/{question.max_points} points
              </span>
            </div>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 pl-9">
          {question.options && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">Options:</div>
              <div className="space-y-1">
                {question.options.map((option, i) => (
                  <div 
                    key={i}
                    className={`text-sm px-2 py-1 rounded ${
                      option === question.correct_answer 
                        ? "bg-green-100 text-green-800" 
                        : option === question.student_answer && !question.is_correct
                        ? "bg-red-100 text-red-800"
                        : "text-slate-600"
                    }`}
                  >
                    {option}
                    {option === question.correct_answer && " ✓"}
                    {option === question.student_answer && option !== question.correct_answer && " (your answer)"}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-slate-500">Your Answer:</div>
              <div className={question.is_correct ? "text-green-700" : "text-red-700"}>
                {question.student_answer || "No answer"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Correct Answer:</div>
              <div className="text-green-700">{question.correct_answer}</div>
            </div>
          </div>

          {question.explanation && (
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-xs font-medium text-blue-700 mb-1">Explanation:</div>
              <div className="text-sm text-blue-800">{question.explanation}</div>
            </div>
          )}

          {question.feedback && (
            <div className="p-3 bg-slate-100 rounded">
              <div className="text-xs font-medium text-slate-500 mb-1">Feedback:</div>
              <div className="text-sm text-slate-700">{question.feedback}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AssessmentResultCard({ submissionId, showQuestions = true }: AssessmentResultCardProps) {
  const { data, loading, error } = useAssessmentResultView(submissionId);
  const [questionsExpanded, setQuestionsExpanded] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-sm text-slate-500">
            <div className="animate-pulse">Loading assessment result...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="py-4">
          <div className="text-sm text-red-600">
            {error || "Failed to load assessment result"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatArrayFeedback = (items: string[] | undefined): string => {
    if (!items || items.length === 0) return "No feedback available";
    return items.join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>{data.assessment_title}</span>
            </div>
            <Badge className={
              data.status === "Selected" 
                ? "bg-green-100 text-green-800" 
                : "bg-gray-100 text-gray-800"
            }>
              {data.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Overall Score</span>
              <span className="font-semibold">{data.score.percentage}%</span>
            </div>
            <Progress value={data.score.percentage} className="h-3" />
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-800">
                {data.score.total_score}/{data.score.max_score}
              </div>
              <div className="text-xs text-slate-500">Total Score</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">
                {data.score.correct_answers}
              </div>
              <div className="text-xs text-green-600">Correct</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">
                {data.score.total_questions - data.score.correct_answers}
              </div>
              <div className="text-xs text-red-600">Incorrect</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-700">
                {data.score.total_questions}
              </div>
              <div className="text-xs text-blue-600">Total Questions</div>
            </div>
          </div>

          {/* Dates Row */}
          <div className="flex justify-between items-center gap-4 text-sm text-slate-500 border rounded-lg px-4 py-2 bg-slate-50 my-2">
            {/* Completed At (left) */}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Completed: {(() => {
                // Fallback: use submitted_at if completed_at is undefined
                const rawDate = data.completed_at || data.submitted_at;
                const safeDate = rawDate?.replace(/(\.\d{3})\d+/, '$1');
                if (!safeDate) return 'N/A';
                const dateObj = new Date(safeDate);
                return dateObj.toLocaleString('en-IN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: 'Asia/Kolkata',
                }) + ' IST';
              })()}</span>
            </div>
            {/* Result Released (right) */}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Result Released: {(() => {
                // Fallback: use submitted_at if completed_at is undefined
                const rawDate = data.completed_at || data.submitted_at;
                const safeDate = rawDate?.replace(/(\.\d{3})\d+/, '$1');
                if (!safeDate) return 'N/A';
                const baseDate = new Date(safeDate);
                const releasedDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                return releasedDate.toLocaleString('en-IN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: 'Asia/Kolkata',
                }) + ' IST';
              })()}</span>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            {data.time_taken && (
              <span>Time taken: {Math.round(data.time_taken / 60)} mins</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <span>Feedback & Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Feedback */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm font-medium text-slate-700 mb-2">Overall</div>
            <div className="text-sm text-slate-600">{data.feedback.overall}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strengths */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
                <CheckCircle className="h-4 w-4" />
                Strengths
              </div>
              <div className="text-sm text-green-600">
                {formatArrayFeedback(data.feedback.strengths)}
              </div>
            </div>

            {/* Improvements */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-700 mb-2">
                <TrendingUp className="h-4 w-4" />
                Areas to Improve
              </div>
              <div className="text-sm text-orange-600">
                {formatArrayFeedback(data.feedback.improvements)}
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
                <BookOpen className="h-4 w-4" />
                Recommendations
              </div>
              <div className="text-sm text-blue-600">
                {formatArrayFeedback(data.feedback.recommendations)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question-by-Question Review */}
      {showQuestions && data.questions && data.questions.length > 0 && (
        <Card>
          <CardHeader 
            className="pb-2 cursor-pointer"
            onClick={() => setQuestionsExpanded(!questionsExpanded)}
          >
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <span>Question Review ({data.questions.length} questions)</span>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                {questionsExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </CardTitle>
          </CardHeader>
          {questionsExpanded && (
            <CardContent className="space-y-3">
              {data.questions.map((question, index) => (
                <QuestionCard key={question.question_id || index} question={question} index={index} />
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

export default AssessmentResultCard;
