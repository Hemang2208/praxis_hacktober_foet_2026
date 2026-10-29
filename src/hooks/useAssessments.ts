import { useSelector, useDispatch } from "react-redux";
import { useMemo } from "react";
import { RootState, AppDispatch } from "@/redux/store";
import {
  fetchStudentAssessments,
  createAssessment,
  fetchAssessmentById,
  fetchAssessmentsByProject,
  setSelectedAssessmentId,
  setFilterStatus,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  clearAssessments,
  clearCreatedAssessments,
  setCurrentCreatedAssessment,
  clearProjectAssessment,
  clearErrors,
  Assessment,
  CreateAssessmentRequest,
  CreatedAssessment,
} from "@/redux/slice/assessment.slice";

export const useAssessments = () => {
  const dispatch = useDispatch<AppDispatch>();
  const assessmentState = useSelector((state: RootState) => state.assessment);

  // Memoized selectors for filtered and sorted assessments
  const filteredAssessments: Assessment[] = useMemo(() => {
    let filtered = [...assessmentState.assessments];

    // Apply status filter
    if (assessmentState.ui.filter_status) {
      filtered = filtered.filter(
        (assessment) => assessment.status === assessmentState.ui.filter_status
      );
    }

    // Apply search query
    if (assessmentState.ui.search_query) {
      const query = assessmentState.ui.search_query.toLowerCase();
      filtered = filtered.filter(
        (assessment) =>
          assessment.assessment_title.toLowerCase().includes(query) ||
          assessment.project_id.toLowerCase().includes(query) ||
          assessment.status.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { sort_by, sort_order } = assessmentState.ui;
      let comparison = 0;

      switch (sort_by) {
        case "assessment_title":
          comparison = a.assessment_title.localeCompare(b.assessment_title);
          break;
        case "submitted_at":
          comparison =
            new Date(a.submitted_at).getTime() -
            new Date(b.submitted_at).getTime();
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "percentage":
          comparison = a.score.percentage - b.score.percentage;
          break;
        default:
          comparison = 0;
      }

      return sort_order === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [assessmentState.assessments, assessmentState.ui]);

  // Assessment statistics
  const assessmentStats = useMemo(() => {
    const total = assessmentState.assessments.length;

    // Calculate average score - include 0% scores
    const totalScores = assessmentState.assessments
      .filter((a) => a.score && typeof a.score.percentage === "number")
      .map((a) => a.score.percentage);
    const averageScore =
      totalScores.length > 0
        ? Math.round(
            totalScores.reduce((sum, score) => sum + score, 0) /
              totalScores.length
          )
        : 0;

    return {
      total,
      averageScore,
    };
  }, [assessmentState.assessments]);

  // Action creators
  const actions = useMemo(
    () => ({
      fetchUserAssessments: (user_id: string) =>
        dispatch(fetchStudentAssessments(user_id)),
      createAssessment: (assessmentData: CreateAssessmentRequest) =>
        dispatch(createAssessment(assessmentData)),
      fetchAssessmentById: (assessmentId: string) =>
        dispatch(fetchAssessmentById(assessmentId)),
      fetchAssessmentsByProject: (project_id: string) =>
        dispatch(fetchAssessmentsByProject(project_id)),
      setSelectedAssessmentId: (id: string | null) =>
        dispatch(setSelectedAssessmentId(id)),
      setFilterStatus: (status: string | null) =>
        dispatch(setFilterStatus(status)),
      setSearchQuery: (query: string) => dispatch(setSearchQuery(query)),
      setSortBy: (
        sort_by: "assessment_title" | "submitted_at" | "status" | "percentage"
      ) => dispatch(setSortBy(sort_by)),
      setSortOrder: (order: "asc" | "desc") => dispatch(setSortOrder(order)),
      clearAssessments: () => dispatch(clearAssessments()),
      clearCreatedAssessments: () => dispatch(clearCreatedAssessments()),
      clearProjectAssessment: (project_id: string) => dispatch(clearProjectAssessment(project_id)),
      setCurrentCreatedAssessment: (assessment: CreatedAssessment | null) =>
        dispatch(setCurrentCreatedAssessment(assessment)),
      clearErrors: () => dispatch(clearErrors()),
    }),
    [dispatch]
  );

  // Helper functions
  const helpers = useMemo(() => ({
    getAssessmentByproject_id: (project_id: string) => {
      return assessmentState.createdAssessments?.find(
        assessment => assessment.project_id === project_id
      );
    },
    isAssessmentExistsForProject: (project_id: string) => {
      return !!assessmentState.createdAssessments?.find(
        assessment => assessment.project_id === project_id
      );
    },
  }), [assessmentState.createdAssessments]);

  return {
    // Data
    assessments: assessmentState.assessments as Assessment[],
    createdAssessments: assessmentState.createdAssessments as CreatedAssessment[],
    currentCreatedAssessment: assessmentState.currentCreatedAssessment as CreatedAssessment | null,
    filteredAssessments,
    assessmentStats,

    // Loading states
    loading: assessmentState.loading,

    // Error states
    error: assessmentState.error,

    // UI state
    ui: assessmentState.ui,

    // Actions
    actions,

    // Helpers
    helpers,

    // Raw dispatch for advanced usage
    dispatch,
  };
};

export default useAssessments;
