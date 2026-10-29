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
  Copy,
  ChevronUp,
  ChevronDown,
  MoreVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  selectCurrentCreatedAssessment,
  clearErrors,
  fetchAssessmentById,
  deleteAssessment,
  updateAssessment,
  getAssessmentForTaking,
  getProjectResults,
  selectAssessmentLoading,
  selectAssessmentError,
  selectProjectResults,
  type AssessmentQuestion as Question,
} from "@/redux/slice/assessment.slice";
import { useProjects } from "@/hooks/useProjects";
import { AssessmentDetailSkeleton } from "@/components/ui/assessment-skeleton";

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
  const assessmentId = params.assessment_id as string;

  const { currentProject } = useProjects();
  const currentCreatedAssessment = useAppSelector(
    selectCurrentCreatedAssessment,
  );
  const loading = useAppSelector(selectAssessmentLoading);
  const errors = useAppSelector(selectAssessmentError);
  const projectResults = useAppSelector(selectProjectResults);

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isSubmissionsDialogOpen, setIsSubmissionsDialogOpen] = useState(false);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [isEditQuestionDialogOpen, setIsEditQuestionDialogOpen] =
    useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<
    number | null
  >(null);
  const [previewAssessment, setPreviewAssessment] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    difficulty: "intermediate" as "beginner" | "intermediate" | "advanced",
    time_limit: 30,
  });
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    type: "multiple_choice" as
      | "multiple_choice"
      | "true_false"
      | "short_answer",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: "",
    points: 1,
  });
  const [editingQuestion, setEditingQuestion] = useState({
    question: "",
    type: "multiple_choice" as
      | "multiple_choice"
      | "true_false"
      | "short_answer",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: "",
    points: 1,
  });

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
        router.push(`/dashboard/projects/${project_id}/assessment`);
      } catch (error) {
        console.error("Failed to delete assessment:", error);
        toast.error("Failed to delete assessment");
      }
    }
  };

  const handleEditAssessment = () => {
    if (!currentCreatedAssessment) return;

    setEditForm({
      title: currentCreatedAssessment.title,
      description: currentCreatedAssessment.description || "",
      difficulty: currentCreatedAssessment.difficulty,
      time_limit: currentCreatedAssessment.time_limit,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveAssessment = async () => {
    if (!currentCreatedAssessment) return;

    try {
      await dispatch(
        updateAssessment({
          assessmentId: currentCreatedAssessment.id,
          updatedData: editForm,
        }),
      ).unwrap();
      toast.success("Assessment updated successfully");
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update assessment:", error);
      toast.error("Failed to update assessment");
    }
  };

  const handlePreviewAssessment = async () => {
    if (!currentCreatedAssessment) return;

    try {
      const previewData = await dispatch(
        getAssessmentForTaking(currentCreatedAssessment.id),
      ).unwrap();
      setPreviewAssessment(previewData);
      setIsPreviewDialogOpen(true);
    } catch (error) {
      console.error("Failed to load preview:", error);
      toast.error("Failed to load assessment preview");
    }
  };

  const handleViewSubmissions = async () => {
    if (!project_id) return;

    try {
      await dispatch(getProjectResults(project_id)).unwrap();
      setIsSubmissionsDialogOpen(true);
    } catch (error) {
      console.error("Failed to load submissions:", error);
      toast.error("Failed to load submissions");
    }
  };

  const handleViewAnalytics = async () => {
    if (!project_id) return;

    try {
      await dispatch(getProjectResults(project_id)).unwrap();
      setActiveTab("analytics");
    } catch (error) {
      console.error("Failed to load analytics data:", error);
      toast.error("Failed to load analytics data");
    }
  };

  const handleAddQuestion = () => {
    setNewQuestion({
      question: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correct_answer: "",
      explanation: "",
      points: 1,
    });
    setIsAddQuestionDialogOpen(true);
  };

  const handleSaveNewQuestion = async () => {
    if (!currentCreatedAssessment) return;

    // Validate the question
    if (!newQuestion.question.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (!newQuestion.correct_answer.trim()) {
      toast.error("Correct answer is required");
      return;
    }

    if (
      newQuestion.type === "multiple_choice" &&
      newQuestion.options.some((opt) => !opt.trim())
    ) {
      toast.error("All options must be filled for multiple choice questions");
      return;
    }

    try {
      // Create the new question object
      const questionToAdd: Question = {
        question: newQuestion.question.trim(),
        type: newQuestion.type,
        options:
          newQuestion.type === "multiple_choice"
            ? newQuestion.options.filter((opt) => opt.trim())
            : undefined,
        correct_answer: newQuestion.correct_answer.trim(),
        explanation: newQuestion.explanation.trim(),
        points: newQuestion.points,
      };

      // Add the question to the current assessment
      const updatedQuestions = [
        ...currentCreatedAssessment.questions,
        questionToAdd,
      ];
      const updatedTotalPoints =
        currentCreatedAssessment.total_points + questionToAdd.points;

      // Update the assessment with the new question
      await dispatch(
        updateAssessment({
          assessmentId: currentCreatedAssessment.id,
          updatedData: {
            questions: updatedQuestions,
            total_points: updatedTotalPoints,
          },
        }),
      ).unwrap();

      toast.success("Question added successfully");
      setIsAddQuestionDialogOpen(false);
    } catch (error) {
      console.error("Failed to add question:", error);
      toast.error("Failed to add question");
    }
  };

  const updateQuestionOption = (index: number, value: string) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  const handleShareAssessment = async () => {
    if (!currentCreatedAssessment || !assessmentId) return;

    // Create shareable URL
    const shareUrl = `${window.location.origin}/assessment/take/${assessmentId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Assessment link copied to clipboard!");
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Assessment link copied to clipboard!");
      } catch (fallbackError) {
        toast.error("Failed to copy link. Please copy manually: " + shareUrl);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleExportAssessment = () => {
    if (!currentCreatedAssessment) return;

    try {
      // Create exportable assessment data
      const exportData = {
        id: currentCreatedAssessment.id,
        title: currentCreatedAssessment.title,
        description: currentCreatedAssessment.description,
        difficulty: currentCreatedAssessment.difficulty,
        time_limit: currentCreatedAssessment.time_limit,
        total_points: currentCreatedAssessment.total_points,
        questions: currentCreatedAssessment.questions.map((q, index) => ({
          question_number: index + 1,
          question: q.question,
          type: q.type,
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          points: q.points,
        })),
        created_at: currentCreatedAssessment.created_at,
        exported_at: new Date().toISOString(),
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `assessment-${currentCreatedAssessment.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();

      toast.success("Assessment exported successfully!");
    } catch (error) {
      console.error("Failed to export assessment:", error);
      toast.error("Failed to export assessment");
    }
  };

  const handleEditQuestion = (index: number) => {
    if (!currentCreatedAssessment) return;

    const question = currentCreatedAssessment.questions[index];
    setEditingQuestionIndex(index);
    setEditingQuestion({
      question: question.question,
      type: question.type,
      options: question.options || ["", "", "", ""],
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      points: question.points,
    });
    setIsEditQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = async (index: number) => {
    if (!currentCreatedAssessment) return;

    if (
      window.confirm(
        "Are you sure you want to delete this question? This action cannot be undone.",
      )
    ) {
      try {
        const questionToDelete = currentCreatedAssessment.questions[index];
        const updatedQuestions = currentCreatedAssessment.questions.filter(
          (_, i) => i !== index,
        );
        const updatedTotalPoints =
          currentCreatedAssessment.total_points - questionToDelete.points;

        await dispatch(
          updateAssessment({
            assessmentId: currentCreatedAssessment.id,
            updatedData: {
              questions: updatedQuestions,
              total_points: updatedTotalPoints,
            },
          }),
        ).unwrap();

        toast.success("Question deleted successfully");
      } catch (error) {
        console.error("Failed to delete question:", error);
        toast.error("Failed to delete question");
      }
    }
  };

  const handleSaveEditedQuestion = async () => {
    if (!currentCreatedAssessment || editingQuestionIndex === null) return;

    // Validate the question (same validation as add question)
    if (!editingQuestion.question.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (!editingQuestion.correct_answer.trim()) {
      toast.error("Correct answer is required");
      return;
    }

    if (
      editingQuestion.type === "multiple_choice" &&
      editingQuestion.options.some((opt) => !opt.trim())
    ) {
      toast.error("All options must be filled for multiple choice questions");
      return;
    }

    try {
      const updatedQuestion: Question = {
        question: editingQuestion.question.trim(),
        type: editingQuestion.type,
        options:
          editingQuestion.type === "multiple_choice"
            ? editingQuestion.options.filter((opt) => opt.trim())
            : undefined,
        correct_answer: editingQuestion.correct_answer.trim(),
        explanation: editingQuestion.explanation.trim(),
        points: editingQuestion.points,
      };

      const updatedQuestions = [...currentCreatedAssessment.questions];
      const oldPoints = updatedQuestions[editingQuestionIndex].points;
      updatedQuestions[editingQuestionIndex] = updatedQuestion;

      const pointsDifference = updatedQuestion.points - oldPoints;
      const updatedTotalPoints =
        currentCreatedAssessment.total_points + pointsDifference;

      await dispatch(
        updateAssessment({
          assessmentId: currentCreatedAssessment.id,
          updatedData: {
            questions: updatedQuestions,
            total_points: updatedTotalPoints,
          },
        }),
      ).unwrap();

      toast.success("Question updated successfully");
      setIsEditQuestionDialogOpen(false);
      setEditingQuestionIndex(null);
    } catch (error) {
      console.error("Failed to update question:", error);
      toast.error("Failed to update question");
    }
  };

  const updateEditingQuestionOption = (index: number, value: string) => {
    const updatedOptions = [...editingQuestion.options];
    updatedOptions[index] = value;
    setEditingQuestion({ ...editingQuestion, options: updatedOptions });
  };

  const handleDuplicateQuestion = async (index: number) => {
    if (!currentCreatedAssessment) return;

    try {
      const questionToDuplicate = currentCreatedAssessment.questions[index];
      const duplicatedQuestion: Question = {
        question: `${questionToDuplicate.question} (Copy)`,
        type: questionToDuplicate.type,
        options: questionToDuplicate.options
          ? [...questionToDuplicate.options]
          : undefined,
        correct_answer: questionToDuplicate.correct_answer,
        explanation: questionToDuplicate.explanation,
        points: questionToDuplicate.points,
      };

      const updatedQuestions = [
        ...currentCreatedAssessment.questions,
        duplicatedQuestion,
      ];
      const updatedTotalPoints =
        currentCreatedAssessment.total_points + duplicatedQuestion.points;

      await dispatch(
        updateAssessment({
          assessmentId: currentCreatedAssessment.id,
          updatedData: {
            questions: updatedQuestions,
            total_points: updatedTotalPoints,
          },
        }),
      ).unwrap();

      toast.success("Question duplicated successfully");
    } catch (error) {
      console.error("Failed to duplicate question:", error);
      toast.error("Failed to duplicate question");
    }
  };

  const handleMoveQuestionUp = async (index: number) => {
    if (!currentCreatedAssessment || index === 0) return;

    try {
      const updatedQuestions = [...currentCreatedAssessment.questions];
      [updatedQuestions[index - 1], updatedQuestions[index]] = [
        updatedQuestions[index],
        updatedQuestions[index - 1],
      ];

      await dispatch(
        updateAssessment({
          assessmentId: currentCreatedAssessment.id,
          updatedData: {
            questions: updatedQuestions,
          },
        }),
      ).unwrap();

      toast.success("Question moved up successfully");
    } catch (error) {
      console.error("Failed to move question:", error);
      toast.error("Failed to move question");
    }
  };

  const handleMoveQuestionDown = async (index: number) => {
    if (
      !currentCreatedAssessment ||
      index === currentCreatedAssessment.questions.length - 1
    )
      return;

    try {
      const updatedQuestions = [...currentCreatedAssessment.questions];
      [updatedQuestions[index], updatedQuestions[index + 1]] = [
        updatedQuestions[index + 1],
        updatedQuestions[index],
      ];

      await dispatch(
        updateAssessment({
          assessmentId: currentCreatedAssessment.id,
          updatedData: {
            questions: updatedQuestions,
          },
        }),
      ).unwrap();

      toast.success("Question moved down successfully");
    } catch (error) {
      console.error("Failed to move question:", error);
      toast.error("Failed to move question");
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

  // Calculate analytics data
  const analyticsData = {
    totalSubmissions: projectResults.length,
    completedSubmissions: projectResults.filter((r) => r.status === "completed")
      .length,
    averageScore:
      projectResults.length > 0
        ? projectResults.reduce((acc, r) => acc + (r.percentage || 0), 0) /
          projectResults.length
        : 0,
    highestScore:
      projectResults.length > 0
        ? Math.max(...projectResults.map((r) => r.percentage || 0))
        : 0,
    lowestScore:
      projectResults.length > 0
        ? Math.min(...projectResults.map((r) => r.percentage || 0))
        : 0,
    passingRate:
      projectResults.length > 0
        ? (projectResults.filter((r) => (r.percentage || 0) >= 60).length /
            projectResults.length) *
          100
        : 0,
    selectedStudents: projectResults.filter((r) => r.isSelected).length,
  };

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
      {/* Loading State */}
      {loading.checkAssessment && !currentCreatedAssessment && (
        <AssessmentDetailSkeleton />
      )}

      {/* Content */}
      {currentCreatedAssessment && (
        <>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareAssessment}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAssessment}
              >
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
                  <DropdownMenuItem onClick={handleEditAssessment}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Assessment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleViewSubmissions}>
                    <Users className="mr-2 h-4 w-4" />
                    View Submissions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleViewAnalytics}>
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
                      {assessment.questions.length}
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
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
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
                            {assessment.description ||
                              "No description provided"}
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
                              {new Date(
                                assessment.created_at,
                              ).toLocaleDateString()}
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
                                value={
                                  (questionStats.multipleChoice /
                                    Math.max(assessment.questions.length, 1)) *
                                  100
                                }
                                className="w-20 h-2 bg-slate-200 [&_[data-slot=progress-indicator]]:bg-blue-600"
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
                                value={
                                  (questionStats.trueFalse /
                                    Math.max(assessment.questions.length, 1)) *
                                  100
                                }
                                className="w-20 h-2 bg-slate-200 [&_[data-slot=progress-indicator]]:bg-green-600"
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
                                value={
                                  (questionStats.shortAnswer /
                                    Math.max(assessment.questions.length, 1)) *
                                  100
                                }
                                className="w-20 h-2 bg-slate-200 [&_[data-slot=progress-indicator]]:bg-purple-600"
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
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={handlePreviewAssessment}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Preview Assessment
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={handleViewSubmissions}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          View Submissions
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={handleViewAnalytics}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Analytics
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={handleEditAssessment}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Assessment
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Assessment Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Assessment Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">
                            Project
                          </span>
                          <span className="text-sm font-medium">
                            {currentProject?.title ||
                              assessment.title ||
                              "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">
                            Difficulty
                          </span>
                          <Badge
                            variant="outline"
                            className={getDifficultyColor(
                              assessment.difficulty,
                            )}
                          >
                            {assessment.difficulty}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">
                            Questions
                          </span>
                          <span className="text-sm font-medium">
                            {assessment.questions.length}
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
                          <span className="text-sm text-slate-600">
                            Time Limit
                          </span>
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
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-600">
                      Total Points:{" "}
                      <span className="font-medium">
                        {assessment.total_points}
                      </span>
                    </div>
                    <Button size="sm" onClick={handleAddQuestion}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>
                </div>

                {/* Questions Management Info */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Question Management
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Use the action buttons to manage individual questions:
                      Move, Edit, Duplicate, or Delete. Click on a question card
                      to view full details. Use the "More Actions" menu for
                      additional options.
                    </p>
                  </CardContent>
                </Card>

                {/* Bulk Actions */}
                {assessment.questions.length > 0 && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-600" />
                          <span className="text-sm font-medium text-slate-700">
                            Bulk Operations
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading.updateAssessment}
                            onClick={() => {
                              const confirmMsg =
                                "This will reorder questions by type (Multiple Choice → True/False → Short Answer). Continue?";
                              if (window.confirm(confirmMsg)) {
                                const sortedQuestions = [
                                  ...assessment.questions,
                                ].sort((a, b) => {
                                  const typeOrder = {
                                    multiple_choice: 0,
                                    true_false: 1,
                                    short_answer: 2,
                                  };
                                  return typeOrder[a.type] - typeOrder[b.type];
                                });
                                dispatch(
                                  updateAssessment({
                                    assessmentId: assessment.id,
                                    updatedData: { questions: sortedQuestions },
                                  }),
                                );
                              }
                            }}
                          >
                            <Target className="mr-2 h-4 w-4" />
                            Sort by Type
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading.updateAssessment}
                            onClick={() => {
                              const confirmMsg =
                                "This will reorder questions by points (highest first). Continue?";
                              if (window.confirm(confirmMsg)) {
                                const sortedQuestions = [
                                  ...assessment.questions,
                                ].sort((a, b) => b.points - a.points);
                                dispatch(
                                  updateAssessment({
                                    assessmentId: assessment.id,
                                    updatedData: { questions: sortedQuestions },
                                  }),
                                );
                              }
                            }}
                          >
                            <Award className="mr-2 h-4 w-4" />
                            Sort by Points
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading.updateAssessment}
                            onClick={() => {
                              const confirmMsg =
                                "This will shuffle all questions randomly. Continue?";
                              if (window.confirm(confirmMsg)) {
                                const shuffledQuestions = [
                                  ...assessment.questions,
                                ].sort(() => Math.random() - 0.5);
                                dispatch(
                                  updateAssessment({
                                    assessmentId: assessment.id,
                                    updatedData: {
                                      questions: shuffledQuestions,
                                    },
                                  }),
                                );
                              }
                            }}
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            Shuffle Order
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {assessment.questions.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                      <CardContent className="p-8 text-center">
                        <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                          No Questions Added Yet
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                          Start building your assessment by adding your first
                          question.
                        </p>
                        <Button onClick={handleAddQuestion}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Your First Question
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    assessment.questions.map((question, index) => (
                      <Card
                        key={index}
                        className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-slate-200 hover:border-l-blue-400"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div
                              className="flex-1"
                              onClick={() => handleQuestionClick(question)}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                                    Q{index + 1}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {getQuestionTypeIcon(question.type)}
                                    <span className="ml-1">
                                      {getQuestionTypeLabel(question.type)}
                                    </span>
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-green-50 text-green-700 border-green-200"
                                  >
                                    {question.points} pts
                                  </Badge>
                                </div>
                                <div className="ml-auto">
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-slate-50 text-slate-600"
                                  >
                                    {question.question.length > 50
                                      ? question.question.length + " chars"
                                      : "Short"}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-slate-900 dark:text-slate-100 font-medium mb-3 line-clamp-2">
                                {question.question}
                              </p>
                              {question.type === "multiple_choice" &&
                                question.options && (
                                  <div className="space-y-1">
                                    {question.options.map(
                                      (option, optionIndex) => (
                                        <div
                                          key={optionIndex}
                                          className={`text-sm p-2 rounded ${
                                            option === question.correct_answer
                                              ? "bg-green-100 text-green-800"
                                              : "bg-slate-100 text-slate-600"
                                          }`}
                                        >
                                          {String.fromCharCode(
                                            65 + optionIndex,
                                          )}
                                          . {option}
                                          {option ===
                                            question.correct_answer && (
                                            <CheckCircle className="inline ml-2 h-3 w-3" />
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              {question.type === "short_answer" && (
                                <div className="text-sm text-slate-600 bg-slate-100 p-2 rounded">
                                  Expected: {question.correct_answer}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 ml-4">
                              {/* Move Up Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveQuestionUp(index);
                                }}
                                disabled={
                                  index === 0 || loading.updateAssessment
                                }
                                title="Move Up"
                                className="px-2"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>

                              {/* Move Down Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveQuestionDown(index);
                                }}
                                disabled={
                                  index === assessment.questions.length - 1 ||
                                  loading.updateAssessment
                                }
                                title="Move Down"
                                className="px-2"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>

                              {/* Edit Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditQuestion(index);
                                }}
                                disabled={loading.updateAssessment}
                                title="Edit Question"
                                className="px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>

                              {/* Duplicate Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateQuestion(index);
                                }}
                                disabled={loading.updateAssessment}
                                title="Duplicate Question"
                                className="px-2"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>

                              {/* Delete Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuestion(index);
                                }}
                                disabled={loading.updateAssessment}
                                title="Delete Question"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>

                              {/* More Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="px-2"
                                    title="More Actions"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuestionClick(question);
                                    }}
                                  >
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditQuestion(index);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Quick Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateQuestion(index);
                                    }}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate & Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteQuestion(index);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Question
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Question Summary Footer */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                              <span>
                                Position: {index + 1} of{" "}
                                {assessment.questions.length}
                              </span>
                              <span>•</span>
                              <span>
                                {question.options?.length
                                  ? `${question.options.length} options`
                                  : question.type === "true_false"
                                    ? "2 options"
                                    : "Text answer"}
                              </span>
                              {question.explanation && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">
                                    Has explanation
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {loading.updateAssessment && (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Updating...</span>
                                </div>
                              )}
                              <span className="text-slate-400">
                                Click to view details
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                {loading.getProjectResults ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mr-3" />
                        <span>Loading analytics data...</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : projectResults.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Assessment Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                          No Data Available
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                          Analytics will be available once students start
                          submitting assessments.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Analytics Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">
                                Submissions
                              </p>
                              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {analyticsData.totalSubmissions}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">
                                Completed
                              </p>
                              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {analyticsData.completedSubmissions}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <Award className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">
                                Average Score
                              </p>
                              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {analyticsData.averageScore.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Target className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">
                                Passing Rate
                              </p>
                              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {analyticsData.passingRate.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Analytics */}
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Score Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Score Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                90-100% (Excellent)
                              </span>
                              <span className="text-sm text-slate-600">
                                {
                                  projectResults.filter(
                                    (r) => (r.percentage || 0) >= 90,
                                  ).length
                                }{" "}
                                students
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <Progress
                                value={
                                  (projectResults.filter(
                                    (r) => (r.percentage || 0) >= 90,
                                  ).length /
                                    Math.max(projectResults.length, 1)) *
                                  100
                                }
                                className="bg-slate-200 [&_[data-slot=progress-indicator]]:bg-green-600"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                80-89% (Good)
                              </span>
                              <span className="text-sm text-slate-600">
                                {
                                  projectResults.filter(
                                    (r) =>
                                      (r.percentage || 0) >= 80 &&
                                      (r.percentage || 0) < 90,
                                  ).length
                                }{" "}
                                students
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <Progress
                                value={
                                  (projectResults.filter(
                                    (r) =>
                                      (r.percentage || 0) >= 80 &&
                                      (r.percentage || 0) < 90,
                                  ).length /
                                    Math.max(projectResults.length, 1)) *
                                  100
                                }
                                className="bg-slate-200 [&_[data-slot=progress-indicator]]:bg-blue-600"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                60-79% (Pass)
                              </span>
                              <span className="text-sm text-slate-600">
                                {
                                  projectResults.filter(
                                    (r) =>
                                      (r.percentage || 0) >= 60 &&
                                      (r.percentage || 0) < 80,
                                  ).length
                                }{" "}
                                students
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <Progress
                                value={
                                  (projectResults.filter(
                                    (r) =>
                                      (r.percentage || 0) >= 60 &&
                                      (r.percentage || 0) < 80,
                                  ).length /
                                    Math.max(projectResults.length, 1)) *
                                  100
                                }
                                className="bg-slate-200 [&_[data-slot=progress-indicator]]:bg-yellow-600"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Below 60% (Fail)
                              </span>
                              <span className="text-sm text-slate-600">
                                {
                                  projectResults.filter(
                                    (r) => (r.percentage || 0) < 60,
                                  ).length
                                }{" "}
                                students
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <Progress
                                value={
                                  (projectResults.filter(
                                    (r) => (r.percentage || 0) < 60,
                                  ).length /
                                    Math.max(projectResults.length, 1)) *
                                  100
                                }
                                className="bg-slate-200 [&_[data-slot=progress-indicator]]:bg-red-600"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Key Metrics */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Key Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium">Highest Score</span>
                            <span className="text-green-600 font-bold">
                              {analyticsData.highestScore.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium">Lowest Score</span>
                            <span className="text-red-600 font-bold">
                              {analyticsData.lowestScore.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium">Completion Rate</span>
                            <span className="font-bold">
                              {analyticsData.totalSubmissions > 0
                                ? (
                                    (analyticsData.completedSubmissions /
                                      analyticsData.totalSubmissions) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium">
                              Students Selected
                            </span>
                            <span className="text-blue-600 font-bold">
                              {analyticsData.selectedStudents}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top Performers */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Performers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {projectResults
                            .sort(
                              (a, b) =>
                                (b.percentage || 0) - (a.percentage || 0),
                            )
                            .slice(0, 5)
                            .map((result, index) => (
                              <div
                                key={result.user_id || index}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 bg-slate-200 rounded-full">
                                    <span className="text-sm font-bold">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {result.user_name || "Unknown User"}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      {result.user_email}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-600">
                                    {result.percentage?.toFixed(1)}%
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {result.score?.total_score || 0}/
                                    {result.score?.max_score || 0}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
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
                  {selectedQuestion &&
                    getQuestionTypeIcon(selectedQuestion.type)}
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

          {/* Edit Assessment Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Assessment
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    placeholder="Assessment title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    placeholder="Assessment description (optional)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={editForm.difficulty}
                    onValueChange={(
                      value: "beginner" | "intermediate" | "advanced",
                    ) => setEditForm({ ...editForm, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    min="5"
                    max="180"
                    value={editForm.time_limit}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        time_limit: parseInt(e.target.value) || 30,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAssessment}
                  disabled={loading.updateAssessment}
                >
                  {loading.updateAssessment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Preview Assessment Dialog */}
          <Dialog
            open={isPreviewDialogOpen}
            onOpenChange={setIsPreviewDialogOpen}
          >
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Assessment Preview -{" "}
                  {previewAssessment?.title || "Loading..."}
                </DialogTitle>
              </DialogHeader>
              {previewAssessment && (
                <div className="space-y-6">
                  {/* Assessment Info */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">
                      Assessment Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Difficulty: </span>
                        <Badge
                          variant="outline"
                          className={getDifficultyColor(
                            previewAssessment.difficulty,
                          )}
                        >
                          {previewAssessment.difficulty}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-slate-600">Time Limit: </span>
                        <span className="font-medium">
                          {previewAssessment.time_limit} minutes
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">
                          Total Questions:{" "}
                        </span>
                        <span className="font-medium">
                          {previewAssessment.questions.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Total Points: </span>
                        <span className="font-medium">
                          {previewAssessment.total_points}
                        </span>
                      </div>
                    </div>
                    {previewAssessment.description && (
                      <div className="mt-3">
                        <span className="text-slate-600">Description: </span>
                        <p className="text-slate-700 mt-1">
                          {previewAssessment.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Questions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Questions</h3>
                    {previewAssessment.questions.map(
                      (question: any, index: number) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                Question {index + 1}
                              </h4>
                              <div className="flex items-center gap-2">
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
                            </div>

                            <p className="text-slate-900 dark:text-slate-100">
                              {question.question}
                            </p>

                            {question.type === "multiple_choice" &&
                              question.options && (
                                <div className="space-y-2 ml-4">
                                  {question.options.map(
                                    (option: string, optionIndex: number) => (
                                      <div
                                        key={optionIndex}
                                        className="flex items-center space-x-2"
                                      >
                                        <div className="w-4 h-4 border border-slate-300 rounded-full"></div>
                                        <span className="text-slate-700">
                                          {String.fromCharCode(
                                            65 + optionIndex,
                                          )}
                                          . {option}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                            {question.type === "true_false" && (
                              <div className="space-y-2 ml-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 border border-slate-300 rounded-full"></div>
                                  <span className="text-slate-700">True</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 border border-slate-300 rounded-full"></div>
                                  <span className="text-slate-700">False</span>
                                </div>
                              </div>
                            )}

                            {question.type === "short_answer" && (
                              <div className="ml-4">
                                <div className="border border-slate-300 rounded p-3 bg-slate-50">
                                  <span className="text-slate-500 italic">
                                    Your answer here...
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ),
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setIsPreviewDialogOpen(false)}>
                  Close Preview
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Submissions Dialog */}
          <Dialog
            open={isSubmissionsDialogOpen}
            onOpenChange={setIsSubmissionsDialogOpen}
          >
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assessment Submissions
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {loading.getProjectResults ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading submissions...</span>
                  </div>
                ) : projectResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      No Submissions Yet
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Students haven't submitted this assessment yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        {projectResults.length} submission
                        {projectResults.length !== 1 ? "s" : ""} found
                      </p>
                    </div>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Percentage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Selected</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projectResults.map((result, index) => (
                            <TableRow key={result.user_id || index}>
                              <TableCell className="font-medium">
                                {result.user_name || "Unknown User"}
                              </TableCell>
                              <TableCell>
                                {result.user_email || "No email"}
                              </TableCell>
                              <TableCell>
                                {result.score?.total_score || 0} /{" "}
                                {result.score?.max_score || 0}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-medium ${
                                      result.percentage >= 80
                                        ? "text-green-600"
                                        : result.percentage >= 60
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {result.percentage?.toFixed(1) || "0"}%
                                  </span>
                                  <div className="w-16 bg-slate-200 rounded-full h-2">
                                    <Progress
                                      value={Math.min(
                                        result.percentage || 0,
                                        100,
                                      )}
                                      className={
                                        `w-16 h-2 bg-slate-200 ` +
                                        (result.percentage >= 80
                                          ? "[&_[data-slot=progress-indicator]]:bg-green-600"
                                          : result.percentage >= 60
                                            ? "[&_[data-slot=progress-indicator]]:bg-yellow-600"
                                            : "[&_[data-slot=progress-indicator]]:bg-red-600")
                                      }
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    result.status === "completed"
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }
                                >
                                  {result.status || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    result.isSelected
                                      ? "bg-blue-100 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }
                                >
                                  {result.isSelected
                                    ? "Selected"
                                    : "Not Selected"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setIsSubmissionsDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Question Dialog */}
          <Dialog
            open={isAddQuestionDialogOpen}
            onOpenChange={setIsAddQuestionDialogOpen}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Question
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Question Type */}
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={newQuestion.type}
                    onValueChange={(
                      value: "multiple_choice" | "true_false" | "short_answer",
                    ) =>
                      setNewQuestion({
                        ...newQuestion,
                        type: value,
                        correct_answer: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label htmlFor="question-text">Question *</Label>
                  <Textarea
                    id="question-text"
                    value={newQuestion.question}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        question: e.target.value,
                      })
                    }
                    placeholder="Enter your question here..."
                    rows={3}
                  />
                </div>

                {/* Multiple Choice Options */}
                {newQuestion.type === "multiple_choice" && (
                  <div className="space-y-3">
                    <Label>Answer Options *</Label>
                    {newQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm font-medium w-6">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <Input
                          value={option}
                          onChange={(e) =>
                            updateQuestionOption(index, e.target.value)
                          }
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        <input
                          type="radio"
                          name="correct_answer"
                          aria-label={`Select option ${String.fromCharCode(65 + index)} as correct answer`}
                          title={`Select option ${String.fromCharCode(65 + index)} as correct answer`}
                          checked={newQuestion.correct_answer === option}
                          onChange={() =>
                            setNewQuestion({
                              ...newQuestion,
                              correct_answer: option,
                            })
                          }
                          className="w-4 h-4"
                        />
                      </div>
                    ))}
                    <p className="text-sm text-slate-600">
                      Select the radio button next to the correct answer.
                    </p>
                  </div>
                )}

                {/* True/False Options */}
                {newQuestion.type === "true_false" && (
                  <div className="space-y-3">
                    <Label>Correct Answer *</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="true"
                          name="tf_answer"
                          aria-label="Select True as correct answer"
                          title="Select True as correct answer"
                          checked={newQuestion.correct_answer === "True"}
                          onChange={() =>
                            setNewQuestion({
                              ...newQuestion,
                              correct_answer: "True",
                            })
                          }
                        />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="false"
                          name="tf_answer"
                          aria-label="Select False as correct answer"
                          title="Select False as correct answer"
                          checked={newQuestion.correct_answer === "False"}
                          onChange={() =>
                            setNewQuestion({
                              ...newQuestion,
                              correct_answer: "False",
                            })
                          }
                        />
                        <Label htmlFor="false">False</Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {newQuestion.type === "short_answer" && (
                  <div className="space-y-2">
                    <Label htmlFor="correct-answer">Expected Answer *</Label>
                    <Input
                      id="correct-answer"
                      value={newQuestion.correct_answer}
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          correct_answer: e.target.value,
                        })
                      }
                      placeholder="Enter the expected answer or key points..."
                    />
                  </div>
                )}

                {/* Points */}
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min="1"
                    max="10"
                    value={newQuestion.points}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        points: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <Label htmlFor="explanation">Explanation (Optional)</Label>
                  <Textarea
                    id="explanation"
                    value={newQuestion.explanation}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        explanation: e.target.value,
                      })
                    }
                    placeholder="Provide an explanation for the correct answer..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddQuestionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNewQuestion}
                  disabled={loading.updateAssessment}
                >
                  {loading.updateAssessment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Question"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Question Dialog */}
          <Dialog
            open={isEditQuestionDialogOpen}
            onOpenChange={setIsEditQuestionDialogOpen}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Question{" "}
                  {editingQuestionIndex !== null
                    ? editingQuestionIndex + 1
                    : ""}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Question Type */}
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={editingQuestion.type}
                    onValueChange={(
                      value: "multiple_choice" | "true_false" | "short_answer",
                    ) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        type: value,
                        correct_answer: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label htmlFor="edit-question-text">Question *</Label>
                  <Textarea
                    id="edit-question-text"
                    value={editingQuestion.question}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        question: e.target.value,
                      })
                    }
                    placeholder="Enter your question here..."
                    rows={3}
                  />
                </div>

                {/* Multiple Choice Options */}
                {editingQuestion.type === "multiple_choice" && (
                  <div className="space-y-3">
                    <Label>Answer Options *</Label>
                    {editingQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm font-medium w-6">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <Input
                          value={option}
                          onChange={(e) =>
                            updateEditingQuestionOption(index, e.target.value)
                          }
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        <input
                          type="radio"
                          name="edit_correct_answer"
                          aria-label={`Select option ${String.fromCharCode(65 + index)} as correct answer`}
                          title={`Select option ${String.fromCharCode(65 + index)} as correct answer`}
                          checked={editingQuestion.correct_answer === option}
                          onChange={() =>
                            setEditingQuestion({
                              ...editingQuestion,
                              correct_answer: option,
                            })
                          }
                          className="w-4 h-4"
                        />
                      </div>
                    ))}
                    <p className="text-sm text-slate-600">
                      Select the radio button next to the correct answer.
                    </p>
                  </div>
                )}

                {/* True/False Options */}
                {editingQuestion.type === "true_false" && (
                  <div className="space-y-3">
                    <Label>Correct Answer *</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="edit_true"
                          name="edit_tf_answer"
                          aria-label="Select True as correct answer"
                          title="Select True as correct answer"
                          checked={editingQuestion.correct_answer === "True"}
                          onChange={() =>
                            setEditingQuestion({
                              ...editingQuestion,
                              correct_answer: "True",
                            })
                          }
                        />
                        <Label htmlFor="edit_true">True</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="edit_false"
                          name="edit_tf_answer"
                          aria-label="Select False as correct answer"
                          title="Select False as correct answer"
                          checked={editingQuestion.correct_answer === "False"}
                          onChange={() =>
                            setEditingQuestion({
                              ...editingQuestion,
                              correct_answer: "False",
                            })
                          }
                        />
                        <Label htmlFor="edit_false">False</Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {editingQuestion.type === "short_answer" && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-correct-answer">
                      Expected Answer *
                    </Label>
                    <Input
                      id="edit-correct-answer"
                      value={editingQuestion.correct_answer}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          correct_answer: e.target.value,
                        })
                      }
                      placeholder="Enter the expected answer or key points..."
                    />
                  </div>
                )}

                {/* Points */}
                <div className="space-y-2">
                  <Label htmlFor="edit-points">Points</Label>
                  <Input
                    id="edit-points"
                    type="number"
                    min="1"
                    max="10"
                    value={editingQuestion.points}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        points: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <Label htmlFor="edit-explanation">
                    Explanation (Optional)
                  </Label>
                  <Textarea
                    id="edit-explanation"
                    value={editingQuestion.explanation}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        explanation: e.target.value,
                      })
                    }
                    placeholder="Provide an explanation for the correct answer..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditQuestionDialogOpen(false);
                    setEditingQuestionIndex(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditedQuestion}
                  disabled={loading.updateAssessment}
                >
                  {loading.updateAssessment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Question"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
