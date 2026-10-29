"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Clock,
  FileText,
  Shield,
  Users,
  Zap,
  CheckCircle,
  Loader2,
  XCircle,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";
import { useAppDispatch } from "@/redux/hooks";
import {
  useCurrentAssessmentData,
  useCurrentAssessmentLoading,
  useCurrentAssessmentErrors,
  useUser,
} from "@/redux/hooks";
import {
  fetchAssessmentByProject,
  checkAssessmentAttempt,
  createAssessmentAttempt,
  clearErrors,
} from "@/redux/slice/currentAssessment.slice";
import { AssessmentDetailSkeleton } from "@/components/ui/assessment-skeleton";
import useUserProfile from "@/hooks/useUserProfile";
import {
  canManageCompanyProjects,
  getViewerCompanySubrole,
} from "@/lib/company-rbac";

const AssessmentPage = () => {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const project_id = params.project_id as string;
  const { user } = useUser();
  const { assessment, attempt, ui } = useCurrentAssessmentData();
  const loading = useCurrentAssessmentLoading();
  const errors = useCurrentAssessmentErrors();
  const { mongoUser } = useUserProfile();

  const [startLoading, setStartLoading] = useState(false);

  // Fetch assessment data when component mounts
  useEffect(() => {
    if (project_id && user?._id) {
      dispatch(fetchAssessmentByProject(project_id));
    }
  }, [dispatch, project_id, user?._id]);

  // Check assessment attempt after assessment is loaded
  useEffect(() => {
    if (assessment && assessment.id && user?._id) {
      dispatch(
        checkAssessmentAttempt({
          assessmentId: assessment.id,
        }),
      );
    }
  }, [dispatch, assessment, user?._id]);

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  const handleStartTest = async () => {
    if (!assessment || !user?._id) {
      toast.error("Assessment data not loaded. Please refresh the page.");
      return;
    }

    if (!ui.isAttemptAllowed) {
      toast.error("You have already completed this assessment.");
      return;
    }

    setStartLoading(true);
    try {
      if (!attempt) {
        await dispatch(
          createAssessmentAttempt({
            assessmentId: assessment.id,
            user_id: user._id as unknown as string,
          }),
        ).unwrap();
      }

      router.push(`/user/projects/${project_id}/assessment/${assessment.id}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start assessment";
      toast.error(errorMessage);
    } finally {
      setStartLoading(false);
    }
  };

  const handleNavigateToManage = () => {
    router.push(`/user/projects/${project_id}/assessment/manage`);
  };

  // Wait for mongoUser to load before determining role
  if (!mongoUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // Check if current user is an admin (moved here after mongoUser is loaded)
  // Use subrole directly from mongoUser profile
  const userSubrole = mongoUser?.subrole
    ? String(mongoUser.subrole).toLowerCase()
    : null;
  const canManageAssessment =
    userSubrole === "admin" ||
    userSubrole === "owner" ||
    canManageCompanyProjects(mongoUser);

  // Admin view - Assessment Management
  if (canManageAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Assessment Management
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Create, manage, and view assessments for this project
                </p>
              </div>
            </div>

            {/* Admin Actions Card */}
            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800 mb-8">
              <CardHeader>
                <CardTitle className="text-purple-800 dark:text-purple-200 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleNavigateToManage}
                    className="flex items-center gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Create / Manage Assessment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNavigateToManage}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Assessment Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Info (if exists) */}
            {assessment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="mb-8"
              >
                <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm">
                  <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-zinc-950 dark:text-[#F5F5F5] flex items-center gap-2 text-base font-bold">
                      <FileText className="h-5 w-5 text-emerald-500" />
                      Current Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-zinc-400 dark:text-[#71717A] font-medium">
                          Title
                        </p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">
                          {assessment.title}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 dark:text-[#71717A] font-medium">
                          Questions
                        </p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">
                          {assessment.questions?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 dark:text-[#71717A] font-medium">
                          Total Points
                        </p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">
                          {assessment.total_points}
                        </p>
                      </div>
                    </div>
                    {assessment.description && (
                      <div className="mt-4">
                        <p className="text-xs text-zinc-400 dark:text-[#71717A] font-medium">
                          Description
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-[#A1A1AA] mt-0.5">
                          {assessment.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Student Access Info */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Student Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-amber-700 dark:text-amber-300">
                  Students taking this assessment can access it through the
                  student test portal. They will see the assessment rules and be
                  able to start the test when ready.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Student view - Original Assessment Taking Logic
  const rules = [
    {
      icon: Clock,
      title: "Time Limit",
      description:
        "You will have 60 minutes to complete the assessment. Make sure you have a stable internet connection.",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      icon: Shield,
      title: "Academic Integrity",
      description:
        "This is an individual assessment. No collaboration, external help, or use of unauthorized resources is permitted.",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      icon: FileText,
      title: "Question Format",
      description:
        "The assessment includes multiple choice, coding challenges, and scenario-based questions.",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: Users,
      title: "Proctoring",
      description:
        "This assessment may be monitored. Ensure you're in a quiet environment with proper lighting.",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      icon: Zap,
      title: "Technical Requirements",
      description:
        "Ensure your device has a working camera, microphone, and stable internet connection.",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      icon: BookOpen,
      title: "Resources",
      description:
        "Only the provided documentation and IDE are allowed. External websites and tools are prohibited.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent p-6 text-zinc-950 dark:text-[#F5F5F5]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl">
              <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-950 dark:text-[#F5F5F5] mb-2">
            Assessment Rules & Regulations
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#A1A1AA]">
            Please read all rules carefully before starting your assessment
          </p>
        </motion.div>

        {/* Loading State */}
        {loading.fetchAssessment && <AssessmentDetailSkeleton />}

        {/* Error States */}
        {(errors.fetchAssessment || errors.checkAttempt) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {errors.fetchAssessment || errors.checkAttempt}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Assessment Already Completed */}
        {!ui.isAttemptAllowed && attempt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                🎉 You have already completed this assessment successfully!
                Multiple attempts are not allowed to ensure fairness.
                {attempt.submitted_at && (
                  <span className="block mt-2 text-sm font-medium">
                    📅 Submitted on:{" "}
                    {new Date(attempt.submitted_at).toLocaleDateString()} at{" "}
                    {new Date(attempt.submitted_at).toLocaleTimeString()}
                  </span>
                )}
                <span className="block mt-2 text-sm">
                  💡 Your results will be available in the dashboard once they
                  are processed.
                </span>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Show content only when assessment is loaded and no critical errors */}
        {assessment && !loading.fetchAssessment && (
          <>
            {/* Assessment Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-8"
            >
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Assessment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Title
                      </p>
                      <p className="text-blue-900 dark:text-blue-100">
                        {assessment.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Questions
                      </p>
                      <p className="text-blue-900 dark:text-blue-100">
                        {assessment.questions?.length + 1 || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Total Points
                      </p>
                      <p className="text-blue-900 dark:text-blue-100">
                        {assessment.total_points}
                      </p>
                    </div>
                  </div>
                  {assessment.description && (
                    <div className="mt-4">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Description
                      </p>
                      <p className="text-blue-900 dark:text-blue-100">
                        {assessment.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Important Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="mb-8 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                        Important Notice
                      </h3>
                      <p className="text-amber-700 dark:text-amber-300">
                        Once you start the assessment, you cannot pause or
                        restart it. Make sure you are ready and have allocated
                        sufficient time to complete it.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Rules Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {rules.map((rule, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  <Card className="h-full rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader className="p-0 pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-zinc-100 dark:bg-[#17181C] border border-zinc-200/60 dark:border-[#26272B]">
                          <rule.icon className="h-5 w-5 text-emerald-500" />
                        </div>
                        <CardTitle className="text-base font-bold text-zinc-950 dark:text-[#F5F5F5]">{rule.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-xs text-zinc-600 dark:text-[#A1A1AA] leading-relaxed">
                        {rule.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Start Test Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="text-center"
            >
              <Button
                size="lg"
                onClick={handleStartTest}
                disabled={startLoading}
                className="cursor-pointer inline-flex items-center bg-zinc-950 hover:bg-zinc-800 dark:bg-[#16A34A] dark:hover:bg-[#22C55E] text-white px-8 py-3 text-base font-semibold rounded-xl border-none shadow-md"
              >
                {startLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Launching Assessment...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    START TEST
                  </>
                )}
              </Button>
              <p className="text-xs text-zinc-400 dark:text-[#71717A] mt-3">
                By clicking &quot;START TEST&quot;, you agree to follow all the
                rules and regulations mentioned above.
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default AssessmentPage;
