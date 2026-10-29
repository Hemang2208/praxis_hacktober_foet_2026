"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Clock,
  FileText,
  Award,
  CheckCircle,
  AlertCircle,
  Users,
  BarChart3,
  Download,
  Share2,
  Edit,
  Trash2,
  Play,
  Calendar,
  Target,
  Zap,
  BookOpen,
  Loader2,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  selectCurrentCreatedAssessment,
  clearErrors,
  fetchAssessmentById,
  deleteAssessment,
  selectAssessmentLoading,
  selectAssessmentError,
  type AssessmentQuestion as Question,
} from "@/redux/slice/assessment.slice";
import { useProjects } from "@/hooks/useProjects";

// Remove local types - using Redux types instead

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

const getQuestionTypeIcon = (type: string) => {
  switch (type) {
    case "multiple_choice":
      return <Target className="h-4 w-4" />;
    case "true_false":
      return <CheckCircle className="h-4 w-4" />;
    case "short_answer":
      return <FileText className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
};

const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case "multiple_choice":
      return "Multiple Choice";
    case "true_false":
      return "True/False";
    case "short_answer":
      return "Short Answer";
    default:
      return "Unknown";
  }
};

export default function AssessmentViewPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const project_id = params.project_id as string;
  const assessmentId = params.assessmentId as string;

  const { currentProject } = useProjects();
  const currentCreatedAssessment = useAppSelector(
    selectCurrentCreatedAssessment,
  );
  const loading = useAppSelector(selectAssessmentLoading);
  const errors = useAppSelector(selectAssessmentError);

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch assessment data using Redux
  useEffect(() => {
    const fetchAssessmentData = async () => {
      // First check if we already have the assessment in Redux state
      if (
        currentCreatedAssessment &&
        currentCreatedAssessment.id === assessmentId
      ) {
        return; // Already have the data
      }

      // If not in state, fetch from API using Redux thunk
      try {
        await dispatch(fetchAssessmentById(assessmentId)).unwrap();
      } catch (error) {
        console.error("Failed to fetch assessment:", error);
        toast.error("Failed to load assessment");
      }
    };

    if (assessmentId) {
      fetchAssessmentData();
    }
  }, [assessmentId, currentCreatedAssessment, dispatch]);

  // Show error toast when errors occur
  useEffect(() => {
    if (errors.checkAssessment) {
      toast.error(errors.checkAssessment);
    }
    if (errors.deleteAssessment) {
      toast.error(errors.deleteAssessment);
    }
  }, [errors.checkAssessment, errors.deleteAssessment]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsQuestionDialogOpen(true);
  };

  const handleDeleteAssessment = async () => {
    if (!currentCreatedAssessment) return;

    if (
      window.confirm(
        "Are you sure you want to delete this assessment? This action cannot be undone.",
      )
    ) {
      try {
        await dispatch(deleteAssessment(currentCreatedAssessment.id)).unwrap();
        toast.success("Assessment deleted successfully");
        router.push(`/college/projects/${project_id}/assessment`);
      } catch (error) {
        console.error("Failed to delete assessment:", error);
        toast.error("Failed to delete assessment");
      }
    }
  };

  if (loading.checkAssessment) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-500" />
          <p className="text-slate-500">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (errors.checkAssessment && !currentCreatedAssessment) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Error Loading Assessment
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {errors.checkAssessment}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
            <Button
              onClick={() => {
                dispatch(clearErrors());
                dispatch(fetchAssessmentById(assessmentId));
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCreatedAssessment) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Assessment not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The assessment you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </p>
          <Button asChild className="mt-4">
            <span onClick={() => router.back()}>Go Back</span>
          </Button>
        </div>
      </div>
    );
  }

  // Use Redux state for assessment data
  const assessment = currentCreatedAssessment;

  const questionStats = {
    multipleChoice: assessment.questions.filter(
      (q) => q.type === "multiple_choice",
    ).length,
    trueFalse: assessment.questions.filter((q) => q.type === "true_false")
      .length,
    shortAnswer: assessment.questions.filter((q) => q.type === "short_answer")
      .length,
  };

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
              {assessment.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {currentProject?.title || "Project Assessment"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={getDifficultyColor(assessment.difficulty)}
          >
            {assessment.difficulty}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Assessment
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                View Submissions
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleDeleteAssessment}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Assessment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Assessment Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Questions</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {assessment.questions.length + 1}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Points</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {assessment.total_points}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Time Limit</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {assessment.time_limit}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Attempts</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {assessment.attempts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Assessment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Assessment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Description
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400">
                        {assessment.description || "No description provided"}
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                          Created
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                          Status
                        </h4>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-200"
                        >
                          {assessment.status || "Published"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Question Types Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Question Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            Multiple Choice
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">
                            {questionStats.multipleChoice}
                          </span>
                          <Progress
                            value={Math.round(
                              (questionStats.multipleChoice /
                                Math.max(1, assessment.questions.length)) *
                              100,
                            )}
                            className="w-20"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">
                            True/False
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">
                            {questionStats.trueFalse}
                          </span>
                          <Progress
                            value={Math.round(
                              (questionStats.trueFalse /
                                Math.max(1, assessment.questions.length)) *
                              100,
                            )}
                            className="w-20"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">
                            Short Answer
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">
                            {questionStats.shortAnswer}
                          </span>
                          <Progress
                            value={Math.round(
                              (questionStats.shortAnswer /
                                Math.max(1, assessment.questions.length)) *
                              100,
                            )}
                            className="w-20"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full" size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Preview Assessment
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <Users className="mr-2 h-4 w-4" />
                      View Submissions
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Assessment
                    </Button>
                  </CardContent>
                </Card>

                {/* Assessment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assessment Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Project</span>
                      <span className="text-sm font-medium">
                        {currentProject?.title || assessment.title || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Difficulty</span>
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(assessment.difficulty)}
                      >
                        {assessment.difficulty}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Questions</span>
                      <span className="text-sm font-medium">
                        {assessment.questions.length + 1}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">
                        Total Points
                      </span>
                      <span className="text-sm font-medium">
                        {assessment.total_points}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Time Limit</span>
                      <span className="text-sm font-medium">
                        {assessment.time_limit} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Assessment Questions ({assessment.questions.length})
              </h2>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            <div className="grid gap-4">
              {assessment.questions.map((question, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuestionClick(question)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-500">
                            Question {index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getQuestionTypeIcon(question.type)}
                            <span className="ml-1">
                              {getQuestionTypeLabel(question.type)}
                            </span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {question.points} pts
                          </Badge>
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium mb-2">
                          {question.question}
                        </p>
                        {question.type === "multiple_choice" &&
                          question.options && (
                            <div className="space-y-1">
                              {question.options.map((option, optionIndex) => (
                                <div
                                  key={optionIndex}
                                  className={`text-sm p-2 rounded ${
                                    option === question.correct_answer
                                      ? "bg-green-100 text-green-800"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optionIndex)}.{" "}
                                  {option}
                                  {option === question.correct_answer && (
                                    <CheckCircle className="inline ml-2 h-3 w-3" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        {question.type === "short_answer" && (
                          <div className="text-sm text-slate-600 bg-slate-100 p-2 rounded">
                            Expected: {question.correct_answer}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Analytics Coming Soon
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Detailed analytics and insights will be available once
                    students start taking the assessment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Settings Panel
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Configure assessment settings, permissions, and advanced
                    options.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Question Detail Dialog */}
      <Dialog
        open={isQuestionDialogOpen}
        onOpenChange={setIsQuestionDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedQuestion && getQuestionTypeIcon(selectedQuestion.type)}
              Question Details
            </DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Question
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedQuestion.question}
                </p>
              </div>

              {selectedQuestion.type === "multiple_choice" &&
                selectedQuestion.options && (
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Options
                    </h4>
                    <div className="space-y-2">
                      {selectedQuestion.options.map((option, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            option === selectedQuestion.correct_answer
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {String.fromCharCode(65 + index)}. {option}
                            </span>
                            {option === selectedQuestion.correct_answer && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Correct Answer
                </h4>
                <p className="text-green-700 bg-green-50 p-3 rounded-lg">
                  {selectedQuestion.correct_answer}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Explanation
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedQuestion.explanation}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-slate-600">Points: </span>
                  <Badge variant="outline">{selectedQuestion.points}</Badge>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Type: </span>
                  <Badge variant="outline">
                    {getQuestionTypeLabel(selectedQuestion.type)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
