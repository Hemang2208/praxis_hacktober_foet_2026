"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Brain,
  Clock,
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  createAssessment,
  fetchAssessmentsByProject,
  selectAssessmentLoading,
  selectAssessmentError,
  selectCurrentCreatedAssessment,
  clearErrors,
  resetAssessmentState,
  CreateAssessmentRequest,
} from "@/redux/slice/assessment.slice";
import { useProjects } from "@/hooks/useProjects";

const difficultyOptions = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Basic concepts and fundamental understanding",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Applied knowledge and problem-solving",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Complex scenarios and deep understanding",
  },
] as const;

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-700 border-green-200";
    case "intermediate":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "advanced":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function AssessmentCreationPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const project_id = params.project_id as string;

  const { currentProject } = useProjects();
  const loading = useAppSelector(selectAssessmentLoading);
  const error = useAppSelector(selectAssessmentError);
  const currentCreatedAssessment = useAppSelector(
    selectCurrentCreatedAssessment
  );

  // Form state
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [assessmentExists, setAssessmentExists] = useState<boolean>(false);
  const [, setCheckingExists] = useState<boolean>(true);
  const [, setLastError] = useState<string | null>(null);
  const [, setRetryCount] = useState<number>(0);
  // Reset any transient assessment state on mount and fetch assessments for this project
  useEffect(() => {
    if (project_id) {
      dispatch(resetAssessmentState());
      setCheckingExists(true);
      dispatch(fetchAssessmentsByProject(project_id))
        .unwrap()
        .then((assessments) => {
          setAssessmentExists(Array.isArray(assessments) && assessments.length > 0);
          setCheckingExists(false);
        })
        .catch((err) => {
          console.warn("Assessment fetch failed:", err);
          setAssessmentExists(false);
          setCheckingExists(false);
        });
    }
  }, [project_id, dispatch]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // Helper: format error into a readable string for toasts
  const formatErrorToString = (err: unknown): string => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    try {
      if (Array.isArray(err)) {
        return err
          .map((item) => {
            if (!item) return "";
            if (typeof item === "string") return item;
            if (typeof item === "object") {
              const maybe = item as unknown as { message?: string; msg?: string };
              if (maybe.message) return maybe.message;
              if (maybe.msg) return maybe.msg;
              return JSON.stringify(item);
            }
            return String(item);
          })
          .join("; ");
      }

      if (typeof err === "object") {
        const o = err as unknown as { message?: string; msg?: string };
        if (o.message) return o.message;
        if (o.msg) return o.msg;
        return JSON.stringify(err);
      }

      return String(err);
    } catch {
      return String(err);
    }
  };

  // Helper: render error as React nodes (handles arrays/objects)
  const renderErrorNode = (err: unknown) => {
    if (!err) return null;
    if (typeof err === "string") return <>{err}</>;
    if (err instanceof Error) return <>{err.message}</>;
    if (Array.isArray(err)) {
      return (
        <div className="space-y-1">
          {err.map((e, i) => (
            <div key={i} className="text-sm whitespace-pre-wrap">
              {typeof e === "string"
                ? e
                : ((): string => {
                    if (typeof e === "object") {
                      const o = e as unknown as { message?: string; msg?: string };
                      return o.message || o.msg || JSON.stringify(e);
                    }
                    return String(e);
                  })()}
            </div>
          ))}
        </div>
      );
    }
    if (typeof err === "object") {
      const o = err as unknown as { message?: string; msg?: string };
      return (
        <div className="text-sm whitespace-pre-wrap">
          {o.message || o.msg || JSON.stringify(o)}
        </div>
      );
    }
    return <>{String(err)}</>;
  };

  const handleCreateAssessment = async () => {
    if (!project_id) {
      toast.error("Project ID is required");
      return;
    }

    if (numQuestions < 1 || numQuestions > 50) {
      toast.error("Number of questions must be between 1 and 50");
      return;
    }

    const assessmentData: CreateAssessmentRequest = {
      project_id: project_id,
      difficulty,
      num_questions: numQuestions,
    };

    const loadingToast = toast.loading("Creating assessment...");

    try {
      await dispatch(createAssessment(assessmentData)).unwrap();
      toast.success("Assessment created successfully!", { id: loadingToast });
      setAssessmentExists(true);
      setLastError(null); // Clear any previous errors
      setRetryCount(0); // Reset retry count on success
      console.log("🔍 ASSESSMENT_UI_RERENDER — handleCreateAssessment completed");
    } catch (error) {
      console.error("Failed to create assessment:", error);

      // Create a user-friendly message from structured errors
      const errorMessage = formatErrorToString(error);
      setLastError(errorMessage || "Failed to create assessment");
      setRetryCount((prev) => prev + 1);

      // Provide more context for common failure types
      let toastMessage = errorMessage || "Failed to create assessment";
      if (typeof error === "string") {
        if (error.includes("Connection error")) {
          toastMessage =
            "🔌 AI service connection failed. Please ensure the backend AI service is properly configured and running.";
        } else if (error.includes("500")) {
          toastMessage =
            "⚠️ Server error occurred. The assessment generation service may be temporarily unavailable.";
        } else if (error.includes("timeout")) {
          toastMessage =
            "⏱️ Assessment generation timed out. Try with fewer questions or try again later.";
        } else if (error.includes("Failed to generate assessment")) {
          toastMessage =
            "🤖 AI assessment generation failed. Please check the backend configuration and API keys.";
        }
      }

      toast.error(toastMessage, {
        id: loadingToast,
        duration: 8000, // Show error longer for better visibility
        style: {
          maxWidth: "500px",
          wordWrap: "break-word",
        },
      });
    }
  };

  const handleViewAssessment = () => {
    if (currentCreatedAssessment) {
      router.push(
        `/college/projects/${project_id}/assessment/${currentCreatedAssessment.id}`
      );
    }
  };

  // Render immediately — assessment existence is derived from redux state

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Assessment Manager
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {currentProject?.title || "Loading project..."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Troubleshooting Info */}
      {!assessmentExists && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">
              Assessment Generation Requirements
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              Assessment creation requires an active AI service connection. If
              you encounter connection errors, please ensure:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The backend Python FastAPI server is running</li>
                <li>AI service (OpenAI/other) API keys are configured</li>
                <li>Network connectivity is stable</li>
              </ul>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Assessment Status Alert */}
      {assessmentExists && currentCreatedAssessment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">
              Assessment Already Exists
            </AlertTitle>
            <AlertDescription className="text-green-700">
              An assessment has already been created for this project. You can
              view and manage it below.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {assessmentExists && currentCreatedAssessment ? (
        // Show existing assessment details
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Existing Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Title
                  </Label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {currentCreatedAssessment?.title || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Difficulty
                  </Label>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={getDifficultyColor(
                        currentCreatedAssessment?.difficulty || "beginner"
                      )}
                    >
                      {currentCreatedAssessment?.difficulty || "N/A"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Questions
                  </Label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {currentCreatedAssessment?.questions?.length || 0}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Total Points
                  </Label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {currentCreatedAssessment?.total_points || 0}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Time Limit
                  </Label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {currentCreatedAssessment?.time_limit || 0} minutes
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Created
                  </Label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {currentCreatedAssessment?.created_at
                      ? new Date(
                          currentCreatedAssessment.created_at
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-600">
                  Description
                </Label>
                <p className="text-slate-700 dark:text-slate-300 mt-1">
                  {currentCreatedAssessment?.description ||
                    "No description available"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleViewAssessment}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Assessment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAssessmentExists(false)}
                >
                  Create New Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        // Show assessment creation form
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Create New Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Alert */}
              {error.createAssessment && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Error</AlertTitle>
                  <AlertDescription className="text-red-700">
                    {renderErrorNode(error.createAssessment)}
                  </AlertDescription>
                </Alert>
              )}

              {/* Difficulty Selection */}
              <div className="space-y-3">
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  Assessment Difficulty
                </Label>
                <Select
                  value={difficulty}
                  onValueChange={(
                    value: "beginner" | "intermediate" | "advanced"
                  ) => setDifficulty(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty level" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-slate-500">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Questions */}
              <div className="space-y-3">
                <Label htmlFor="numQuestions" className="text-sm font-medium">
                  Number of Questions
                </Label>
                <Input
                  id="numQuestions"
                  type="number"
                  min="1"
                  max="50"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  placeholder="Enter number of questions (1-50)"
                />
                <p className="text-xs text-slate-500">
                  Recommended: 10-15 questions for comprehensive assessment
                </p>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  Assessment Preview
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Difficulty:</span>
                    <Badge
                      variant="outline"
                      className={`ml-2 ${getDifficultyColor(difficulty)}`}
                    >
                      {difficulty}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-600">Questions:</span>
                    <span className="ml-2 font-medium">{numQuestions}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Estimated Time:</span>
                    <span className="ml-2 font-medium">
                      {numQuestions * 2} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Project:</span>
                    <span className="ml-2 font-medium">
                      {currentProject?.title || "Current Project"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateAssessment}
                  disabled={loading.createAssessment}
                  className="flex-1"
                >
                  {loading.createAssessment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Assessment...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Create Assessment
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
