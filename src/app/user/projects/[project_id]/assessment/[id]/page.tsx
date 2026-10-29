"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { useUser as useReduxUser } from "@/redux/hooks";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  Target,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import {
  startSession,
  incrementWarning,
  markAssessmentCompleted,
} from "@/redux/slice/currentAssessment.slice";
import {
  submitAssessment,
  AssessmentSubmission,
} from "@/redux/slice/assessment.slice";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import useUserProfile from "@/hooks/useUserProfile";
import {
  canManageCompanyProjects,
  getViewerCompanySubrole,
} from "@/lib/company-rbac";

type Question = {
  question: string;
  type: string;
  options?: string[];
};

type Assessment = {
  id?: string;
  title?: string;
  description?: string;
  questions?: Question[];
};

type Result = {
  score?: { total_score?: number; max_score?: number; percentage?: number };
  feedback?: {
    overall?: string;
    strengths?: string[];
    improvements?: string[];
  };
} | null;

export default function AssessmentSubmitPage() {
  const mongoUserProfile = useUserProfile(); // Use full profile with subrole
  const mongoUser = mongoUserProfile.mongoUser; // Extract for backward compatibility
  const { user: reduxUser } = useReduxUser();
  const dispatch = useAppDispatch();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();

  const assessmentId = params.id as string;
  const project_id = params.project_id as string;
  const ASSESSMENT_BASE = "/agent/assessment-agent";

  // Get the user ID from either mongoUser._id or reduxUser._id
  const user_id = mongoUser?._id || reduxUser?._id;

  // Check subrole directly - useUserProfile now returns full profile with subrole
  const userSubrole = mongoUser?.subrole
    ? String(mongoUser.subrole).toLowerCase()
    : null;
  const canManageAssessment =
    userSubrole === "admin" ||
    userSubrole === "owner" ||
    canManageCompanyProjects(mongoUser as any);

  // Fetch assessment submissions when admin views (for results/analytics)
  useEffect(() => {
    if (canManageAssessment && assessmentId) {
      // Could load submissions/results here if needed
      console.log(
        "Admin viewing assessment - can see submissions and analytics",
      );
    }
  }, [canManageAssessment, assessmentId]);

  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Result>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-cheating state
  const [tabWarnings, setTabWarnings] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Configurable: time per question (in seconds)
  const timePerQuestion = 90; // 1.5 minutes = 90 seconds

  // Fetch assessment - show admin view if user is admin, otherwise show student take view
  useEffect(() => {
    let mounted = true;
    async function fetchAssessment() {
      if (!assessmentId || !mongoUser) return;
      setLoading(true);
      setError(null);
      try {
        const token = await fastAPIAuthService.getAccessToken();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        // Use different endpoint based on user role
        const endpoint = canManageAssessment
          ? `${ASSESSMENT_BASE}/assessments/${assessmentId}` // Full view with answers for admin
          : `${ASSESSMENT_BASE}/assessments/${assessmentId}/take`; // Take view without answers for student

        const res = await fetch(endpoint, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // Read response as text first to handle HTML error pages returned by proxies
        const text = await res.text();

        if (!res.ok) {
          // include a truncated response body to help debug
          const snippet = text ? text.slice(0, 1000) : `${res.status}`;
          throw new Error(`Request failed ${res.status}: ${snippet}`);
        }

        // Attempt to parse JSON; if parsing fails, the service likely returned HTML
        let data: Assessment | null = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          const snippet = text ? text.slice(0, 1000) : "<empty response>";
          throw new Error(
            `Expected JSON but received non-JSON response: ${snippet}`,
          );
        }

        if (mounted) setAssessment(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Fetch error";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAssessment();

    return () => {
      mounted = false;
    };
  }, [assessmentId, mongoUser, canManageAssessment, ASSESSMENT_BASE]);

  // Debug: Log assessment data
  useEffect(() => {
    if (assessment) {
      console.log("Assessment data:", assessment);
      console.log("Questions:", assessment.questions);
    }
  }, [assessment]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleOptionChange = (qIdx: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: value }));
  };

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!assessment || !assessment.questions || submitted) return;

      // Validate user_id before submission
      if (!user_id) {
        toast.error("User not loaded. Please refresh the page and try again.");
        return;
      }

      setSubmitting(true);
      try {
        const payload: AssessmentSubmission = {
          assessment_id: assessment.id,
          user_id: String(user_id),
          answers: assessment.questions.map((_, idx: number) => ({
            question_index: idx,
            answer: answers[idx] || "",
          })),
          submitted_at: new Date().toISOString(),
          auto_submitted: auto,
        };

        const data = await dispatch(
          submitAssessment(payload),
        ).unwrap();

        // Save returned result (score/feedback) if present
        setResult(data as unknown as Result);
        setSubmitted(true);

        // Mark assessment as completed to prevent multiple attempts
        if (assessment?.id) {
          dispatch(markAssessmentCompleted(assessment.id));
        }

        if (auto) {
          toast.success("Time's up! Assessment auto-submitted successfully!");
        } else {
          toast.success("Assessment submitted successfully!");
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          toast.error(e.message || "Submission error");
        } else {
          toast.error("Submission error");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [assessment, submitted, user_id, answers, dispatch],
  );

  // Initialize assessment session and timer
  useEffect(() => {
    if (assessment && !sessionStarted) {
      // Start the session
      dispatch(startSession());
      setSessionStarted(true);

      // Set timer = no. of questions * timePerQuestion
      if (assessment.questions?.length) {
        setTimeLeft(assessment.questions.length * timePerQuestion);
      }
    }
  }, [assessment, sessionStarted, dispatch, timePerQuestion]);

  // Timer countdown effect
  useEffect(() => {
    if (sessionStarted && timeLeft > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - auto submit
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionStarted, timeLeft, submitted, handleSubmit]);

  // Prevent right-click and common keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+U, Ctrl+Shift+C
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        toast.error("Developer tools access is blocked during assessment!");
        return false;
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      toast.error("Right-click is disabled during assessment!");
      return false;
    };

    if (sessionStarted) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("contextmenu", handleContextMenu);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [sessionStarted]);

  // Anti-cheating: Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && sessionStarted && !submitted) {
        // Tab is hidden (user switched away)
        const newWarningCount = tabWarnings + 1;
        setTabWarnings(newWarningCount);
        dispatch(incrementWarning());

        if (newWarningCount === 1) {
          toast.error(
            "⚠️ Warning: Tab switching detected! This is your first warning. Next time will result in auto-submission.",
            { duration: 5000 },
          );
        } else if (newWarningCount >= 2) {
          toast.error(
            "❌ Multiple tab switches detected! Assessment will be auto-submitted.",
            { duration: 3000 },
          );
          setTimeout(() => {
            handleSubmit(true);
          }, 3000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionStarted, submitted, tabWarnings, dispatch, handleSubmit]);

  // ---------------- UI ------------------
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-slate-500">Loading assessment...</p>
      </div>
    );
  }

  // Handle fetch errors
  if (error) {
    return (
      <div className="flex justify-center items-center h-96 flex-col space-y-4">
        <p className="text-red-500">Error: {error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Retry
        </Button>
        <Button
          onClick={() => router.push("/user/projects")}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex justify-center items-center h-96 flex-col space-y-4">
        <p className="text-red-500">Assessment data unavailable.</p>
        <Button
          onClick={() => router.push("/user/projects")}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  // ADMIN VIEW - Show full assessment with answers, submissions, and analytics
  if (canManageAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Button
            variant="ghost"
            className="-ml-2 mb-4"
            onClick={() =>
              router.push(`/user/projects/${project_id}/assessment`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessment
          </Button>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {assessment.title}
              <span className="text-lg font-normal text-slate-500 dark:text-slate-400 ml-3">
                (Admin View)
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {assessment.description}
            </p>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Total Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assessment.questions?.length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Total Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assessment.questions?.reduce(
                    (sum: number, q: any) => sum + (q.points || 1),
                    0,
                  ) || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Question Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(assessment.questions?.map((q: any) => q.type)).size}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Time Limit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assessment.questions?.length &&
                  assessment.questions.length > 0
                    ? `${assessment.questions.length * 1.5} min`
                    : "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Questions & Answers
            </h2>
            <div className="space-y-6">
              {assessment.questions && assessment.questions.length > 0 ? (
                assessment.questions.map((q: any, idx: number) => (
                  <Card
                    key={idx}
                    className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-semibold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              {q.type === "multiple_choice" && (
                                <Target className="h-4 w-4" />
                              )}
                              {q.type === "true_false" && (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              {q.type === "short_answer" && (
                                <FileText className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">
                                {q.type === "multiple_choice" &&
                                  "Multiple Choice"}
                                {q.type === "true_false" && "True/False"}
                                {q.type === "short_answer" && "Short Answer"}
                              </span>
                            </div>
                            <span className="text-sm text-slate-500">
                              {q.points || 1} points
                            </span>
                          </div>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-3">
                        {q.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Options for multiple choice */}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            Options:
                          </p>
                          {q.options.map((option: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              className={`p-3 rounded border transition-colors ${
                                q.correct_answer === option
                                  ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {q.correct_answer === option && (
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                )}
                                <span>{option}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Correct Answer */}
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded">
                        <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                          ✓ Correct Answer:
                        </p>
                        <p className="text-green-700 dark:text-green-300 font-semibold">
                          {q.correct_answer}
                        </p>
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded">
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                            💡 Explanation:
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No questions in this assessment yet.
                </div>
              )}
            </div>
          </div>

          {/* Admin Note */}
          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-purple-800 dark:text-purple-200">
                📋 Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-purple-700 dark:text-purple-300">
              <p>
                You are viewing this assessment as an admin. This view shows all
                questions and their correct answers. Students taking this
                assessment will not see the answers marked.
              </p>
              <p className="mt-2">
                To view student submissions and analytics, visit the assessment
                management page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // STUDENT VIEW - Show assessment with timer
  if (!assessment) {
    return (
      <div className="flex justify-center items-center h-96 flex-col space-y-4">
        <p className="text-red-500">Assessment data unavailable.</p>
        <Button
          onClick={() => router.push("/user/projects")}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  // Additional check for assessment questions
  if (!assessment.questions || assessment.questions.length === 0) {
    return (
      <div className="flex justify-center items-center h-96 flex-col space-y-4">
        <p className="text-yellow-500">This assessment has no questions</p>
        <Button
          onClick={() => router.push("/user/projects")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-8">
        {/* Success Animation */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto bg-green-200 dark:bg-green-800 rounded-full animate-ping opacity-75"></div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-green-600 dark:text-green-400">
            Assessment Submitted Successfully! 🎉
          </h1>
          <p className="text-xl text-slate-700 dark:text-slate-300">
            Thank you for completing the assessment
          </p>
        </div>

        {/* Assessment Summary */}
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {assessment?.questions?.length || 0}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Questions Answered
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Object.keys(answers).length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Responses Recorded
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results (if returned by submit API) */}
        {result && (
          <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                Assessment Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-left">
                {result.score && (
                  <div>
                    <div className="text-sm text-slate-600">Score</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {result.score.total_score}/{result.score.max_score} (
                      {result.score.percentage}%)
                    </div>
                  </div>
                )}

                {result.feedback && (
                  <div>
                    <div className="text-sm text-slate-600">Feedback</div>
                    <div className="text-slate-700 dark:text-slate-300">
                      {result.feedback.overall}
                    </div>
                    {result.feedback.strengths &&
                      result.feedback.strengths.length > 0 && (
                        <div className="mt-2">
                          <strong>Strengths:</strong>
                          <ul className="list-disc ml-5 mt-1 text-slate-700 dark:text-slate-300">
                            {result.feedback.strengths.map(
                              (s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {result.feedback.improvements &&
                      result.feedback.improvements.length > 0 && (
                        <div className="mt-2">
                          <strong>Improvements:</strong>
                          <ul className="list-disc ml-5 mt-1 text-slate-700 dark:text-slate-300">
                            {result.feedback.improvements.map(
                              (s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              What happens next?
            </h3>
            <div className="text-left space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">•</span>
                <span>
                  Your assessment has been securely submitted and recorded
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">•</span>
                <span>
                  Results will be processed and made available in 7 days
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">•</span>
                <span>
                  You&apos;ll receive an email notification when results are
                  ready
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">•</span>
                <span>Check your dashboard regularly for updates</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <Button
          onClick={() => router.push("/user/projects")}
          className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer text-white px-8 py-3 text-lg font-semibold"
          size="lg"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      {/* Enhanced Timer Display */}
      <Card
        className={`border-2 ${
          timeLeft <= 300
            ? "border-red-500 bg-red-50 dark:bg-red-950"
            : timeLeft <= 600
              ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
              : "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Time Remaining
              </span>
              {timeLeft <= 300 && (
                <span className="text-red-500 animate-pulse">⚠️</span>
              )}
            </div>
            <div
              className={`text-3xl font-bold ${
                timeLeft <= 300
                  ? "text-red-600"
                  : timeLeft <= 600
                    ? "text-yellow-600"
                    : "text-indigo-600"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
          {timeLeft <= 300 && (
            <div className="text-sm text-red-600 mt-2 font-medium">
              ⚠️ Less than 5 minutes remaining! Assessment will auto-submit when
              time runs out.
            </div>
          )}
          {timeLeft <= 600 && timeLeft > 300 && (
            <div className="text-sm text-yellow-600 mt-2 font-medium">
              ⏰ Less than 10 minutes remaining.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {assessment.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-slate-700 dark:text-slate-300 text-lg">
            {assessment.description}
          </div>
          <div className="mt-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Questions
            </h3>
            <div className="space-y-6">
              {assessment.questions && assessment.questions.length > 0 ? (
                assessment.questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="font-medium mb-2">
                      Q{idx + 1}. {q.question}
                    </div>
                    {q.type === "multiple_choice" ? (
                      q.options && q.options.length > 0 ? (
                        <ul className="space-y-2 mt-2">
                          {q.options.map((opt, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`q${idx}`}
                                value={opt}
                                checked={answers[idx] === opt}
                                onChange={() => handleOptionChange(idx, opt)}
                                className="accent-indigo-500"
                                disabled={submitting}
                                title={`Select option ${opt}`}
                              />
                              <span>{opt}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-red-500">
                          No options available for this question
                        </div>
                      )
                    ) : q.type === "true_false" ? (
                      <ul className="space-y-2 mt-2">
                        {["True", "False"].map((opt, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q${idx}`}
                              value={opt}
                              checked={answers[idx] === opt}
                              onChange={() => handleOptionChange(idx, opt)}
                              className="accent-indigo-500"
                              disabled={submitting}
                              title={`Select option ${opt}`}
                            />
                            <span className="text-lg font-medium">{opt}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <input
                        type="text"
                        className="mt-2 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                        placeholder="Enter your answer"
                        title="Enter your answer"
                        value={answers[idx] || ""}
                        onChange={(e) =>
                          handleOptionChange(idx, e.target.value)
                        }
                        disabled={submitting}
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-slate-500">No questions found.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Button
        className="w-full"
        onClick={() => handleSubmit(false)}
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit"}
      </Button>
    </div>
  );
}
