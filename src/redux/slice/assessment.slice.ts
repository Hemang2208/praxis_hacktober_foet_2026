import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ASSESSMENT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch } from "@/lib/queueAwareFetch";
import {
  invalidateDetailItemCache,
  invalidatePageCache,
} from "@/redux/slice/cache.slice";

// Assessment/Application Types
export interface Assessment {
  submission_id: string;
  assessment_id?: string; // ID of the assessment template
  project_id: string;
  assessment_title: string;
  score: {
    total_score: number;
    max_score: number;
    percentage: number;
    correct_answers?: number;
    total_questions?: number;
  };
  feedback: {
    overall: string;
    strengths?: string[];
    improvements?: string[];
    recommendations?: string[];
  };
  status: string;
  submitted_at: string;
  completed_at: string;
  user_id?: string; // Added for user association
}

// New Assessment Creation Types
export interface CreateAssessmentRequest {
  project_id: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  num_questions?: number;
}

export interface AssessmentQuestion {
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

// Assessment submission types
export interface AssessmentAnswer {
  question_index: number;
  answer: string;
}

export interface AssessmentSubmission {
  assessment_id: string;
  user_id: string;
  answers: AssessmentAnswer[];
  user_email?: string;
  user_name?: string;
  submitted_at?: string;
  auto_submitted?: boolean;
}

export interface AssessmentResult {
  id: string;
  submission_id: string;
  assessment_id: string;
  user_id: string;
  score: {
    total_score: number;
    max_score: number;
    percentage: number;
    correct_answers: number;
    total_questions: number;
  };
  feedback: {
    overall_feedback: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  question_feedback: Array<{
    question_index: number;
    is_correct: boolean;
    points_earned: number;
    feedback: string;
  }>;
  status: string;
  completed_at: string;
}

export interface ProjectResult {
  user_id: string;
  user_email: string;
  user_name: string;
  score: {
    total_score: number;
    max_score: number;
    percentage: number;
  };
  percentage: number;
  isSelected: boolean;
  feedback: string;
  status: string;
}

export interface CreatedAssessment {
  id: string;
  project_id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  questions: AssessmentQuestion[];
  total_points: number;
  time_limit: number;
  created_at: string;
  created_by?: string; // ObjectID of the user who created the assessment
  status?: "draft" | "published" | "archived";
  attempts?: number;
  completion_rate?: number;
}

export interface AssessmentState {
  assessments: Assessment[];
  createdAssessments: CreatedAssessment[];
  currentCreatedAssessment: CreatedAssessment | null;
  projectResults: ProjectResult[];
  assessmentResults: AssessmentResult[];
  currentAssessmentResult: AssessmentResult | null;
  loading: {
    fetchAssessments: boolean;
    createAssessment: boolean;
    checkAssessment: boolean;
    deleteAssessment: boolean;
    updateAssessment: boolean;
    submitAssessment: boolean;
    getProjectResults: boolean;
    getAssessmentResult: boolean;
  };
  error: {
    fetchAssessments: string | null;
    createAssessment: string | null;
    checkAssessment: string | null;
    deleteAssessment: string | null;
    updateAssessment: string | null;
    submitAssessment: string | null;
    getProjectResults: string | null;
    getAssessmentResult: string | null;
  };
  ui: {
    selectedAssessmentId: string | null;
    filter_status: string | null;
    search_query: string;
    sort_by: "assessment_title" | "submitted_at" | "status" | "percentage";
    sort_order: "asc" | "desc";
  };
}

// Initial state
const initialState: AssessmentState = {
  assessments: [],
  createdAssessments: [],
  currentCreatedAssessment: null,
  projectResults: [],
  assessmentResults: [],
  currentAssessmentResult: null,
  loading: {
    fetchAssessments: false,
    createAssessment: false,
    checkAssessment: false,
    deleteAssessment: false,
    updateAssessment: false,
    submitAssessment: false,
    getProjectResults: false,
    getAssessmentResult: false,
  },
  error: {
    fetchAssessments: null,
    createAssessment: null,
    checkAssessment: null,
    deleteAssessment: null,
    updateAssessment: null,
    submitAssessment: null,
    getProjectResults: null,
    getAssessmentResult: null,
  },
  ui: {
    selectedAssessmentId: null,
    filter_status: null,
    search_query: "",
    sort_by: "submitted_at",
    sort_order: "desc",
  },
};

// Async Thunks
export const fetchStudentAssessments = createAsyncThunk<
  { results: Assessment[] },
  string,
  { rejectValue: string }
>(
  "assessment/fetchStudentAssessments",
  async (user_id, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/users/${user_id}/results`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(
          errorData.message || "Failed to fetch assessments",
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch assessments",
      );
    }
  },
);

// Create Assessment
export const createAssessment = createAsyncThunk<
  CreatedAssessment,
  CreateAssessmentRequest,
  { rejectValue: string }
>(
  "assessment/createAssessment",
  async (assessmentData, { rejectWithValue, getState, dispatch }) => {
    try {
      const { project_id, difficulty, num_questions = 10 } = assessmentData;

      // Get current user from Redux state
      const state = getState() as unknown as { user?: { userProfile?: { _id: string } } };
      const currentUser = state.user?.userProfile;

      // The agent expects query parameters for project_id/difficulty — include them
      const params = new URLSearchParams({
        project_id,
        difficulty,
        num_questions: String(num_questions),
      }).toString();

      // Prepare request body with created_by field
      const requestBody = {
        project_id,
        difficulty,
        num_questions,
        // Include the current user's ID as created_by (sanitized ObjectID)
        created_by: currentUser?._id || null
      };

      console.log("🔍 ASSESSMENT_QUEUE_INITIATED — createAssessment queuing request");

      const response = await queueAwareFetch(
        `${ASSESSMENT_AGENT_URL}/assessments?${params}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
        // Wait up to 180s for queue job to complete (AI assessment generation is slow)
        { maxPollAttempts: 90, pollIntervalMs: 2000 },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        return rejectWithValue(
          errorData.detail ||
            errorData.message ||
            "Failed to create assessment",
        );
      }

      const data = await response.json();
      console.log("🔍 ASSESSMENT_THUNK_RESOLVED — createAssessment fulfilled, got:", data);
      dispatch(invalidatePageCache({ resource: "assessments" }));
      console.log("🔍 ASSESSMENT_REDUX_UPDATED — cache invalidated for assessments");

      // Invalidate SWR caches (belt-and-suspenders with cache.slice)
      try {
        const { mutate } = await import("swr");
        await Promise.allSettled([
          mutate((key) => typeof key === "string" && key.includes("assessment")),
          mutate((key) => typeof key === "string" && key.includes("project")),
        ]);
        console.log("[createAssessment] SWR_INVALIDATED");
      } catch {
        // SWR might not be installed or available
      }

      return data;
    } catch (error) {
      console.error("🔍 ASSESSMENT_THUNK_REJECTED — createAssessment failed:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create assessment",
      );
    }
  },
);

// Fetch an assessment by its ID using the agent endpoint
export const fetchAssessmentById = createAsyncThunk<
  CreatedAssessment,
  string,
  { rejectValue: string }
>(
  "assessment/fetchAssessmentById",
  async (assessmentId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/assessments/${encodeURIComponent(
          assessmentId,
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.detail || errorData.message || "Failed to fetch assessment",
        );
      }

      const data = await response.json();
      return data as CreatedAssessment;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch assessment",
      );
    }
  },
);

// Fetch all assessments for a project
export const fetchAssessmentsByProject = createAsyncThunk<
  CreatedAssessment[],
  string,
  { rejectValue: string }
>(
  "assessment/fetchAssessmentsByProject",
  async (project_id, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/projects/${encodeURIComponent(
          project_id,
        )}/assessments`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (response.status === 404) {
        // No assessments for project
        return [];
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.detail ||
            errorData.message ||
            "Failed to fetch assessments",
        );
      }

      const data = await response.json();
      // API may return an array or an object with `assessments` key
      const assessments = Array.isArray(data) ? data : data.assessments || [];
      return assessments as CreatedAssessment[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch assessments",
      );
    }
  },
);

// Delete an assessment by ID
export const deleteAssessment = createAsyncThunk<
  string, // Returns deleted assessment ID
  string, // Takes assessment ID
  { rejectValue: string }
>("assessment/deleteAssessment", async (assessmentId, { rejectWithValue }) => {
  try {
    const response = await queueAwareFetch(
      `${ASSESSMENT_AGENT_URL}/assessments/${encodeURIComponent(assessmentId)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return rejectWithValue(
        errorData.detail || errorData.message || "Failed to delete assessment",
      );
    }

    return assessmentId;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete assessment",
    );
  }
});

// Update Assessment
export const updateAssessment = createAsyncThunk<
  CreatedAssessment,
  { assessmentId: string; updatedData: Partial<CreatedAssessment> },
  { rejectValue: string }
>(
  "assessment/updateAssessment",
  async ({ assessmentId, updatedData }, { rejectWithValue, getState }) => {
    try {
      // Get current user from Redux state
      const state = getState() as any;
      const currentUser = state.user?.userProfile;

      // Prepare update data with created_by field
      const enrichedUpdatedData = {
        ...updatedData,
        // Include the current user's ID as created_by (sanitized ObjectID)
        created_by: currentUser?._id || currentUser?.id || null
      };

      const response = await queueAwareFetch(
        `${ASSESSMENT_AGENT_URL}/assessments/${encodeURIComponent(assessmentId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(enrichedUpdatedData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.detail || errorData.message || "Failed to update assessment",
        );
      }

      const data = await response.json();
      return data as CreatedAssessment;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update assessment",
      );
    }
  },
);

// Get Assessment for Taking (without answers)
export const getAssessmentForTaking = createAsyncThunk<
  {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    questions: Array<{
      question: string;
      type: string;
      options?: string[];
      points: number;
    }>;
    total_points: number;
    time_limit: number;
  },
  string,
  { rejectValue: string }
>(
  "assessment/getAssessmentForTaking",
  async (assessmentId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/assessments/${encodeURIComponent(
          assessmentId,
        )}/take`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.detail || errorData.message || "Failed to fetch assessment",
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch assessment",
      );
    }
  },
);

// Submit Assessment
export const submitAssessment = createAsyncThunk<
  AssessmentResult,
  AssessmentSubmission,
  { rejectValue: string }
>(
  "assessment/submitAssessment",
  async (submission, { rejectWithValue, dispatch }) => {
    try {
      const response = await queueAwareFetch(
        `${ASSESSMENT_AGENT_URL}/assessments/${encodeURIComponent(
          submission.assessment_id,
        )}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submission),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.detail || errorData.message || "Failed to submit assessment",
        );
      }

      const data = await response.json();
      dispatch(invalidatePageCache({ resource: "assessments" }));
      dispatch(invalidateDetailItemCache({ resource: "assessments", id: submission.assessment_id }));
      return data as AssessmentResult;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to submit assessment",
      );
    }
  },
);

// Get Project Results
export const getProjectResults = createAsyncThunk<
  ProjectResult[],
  string,
  { rejectValue: string }
>(
  "assessment/getProjectResults",
  async (project_id, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/projects/${encodeURIComponent(
          project_id,
        )}/results`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.detail || errorData.message || "Failed to fetch project results",
        );
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch project results",
      );
    }
  },
);

// Get Assessment Result
export const getAssessmentResult = createAsyncThunk<
  AssessmentResult,
  string,
  { rejectValue: string }
>(
  "assessment/getAssessmentResult",
  async (submissionId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/results/${encodeURIComponent(submissionId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.detail || errorData.message || "Failed to fetch assessment result",
        );
      }

      const data = await response.json();
      return data as AssessmentResult;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch assessment result",
      );
    }
  },
);

// Assessment slice
const assessmentSlice = createSlice({
  name: "assessment",
  initialState,
  reducers: {
    // UI Actions
    setSelectedAssessmentId: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedAssessmentId = action.payload;
    },
    setFilterStatus: (state, action: PayloadAction<string | null>) => {
      state.ui.filter_status = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.ui.search_query = action.payload;
    },
    setSortBy: (
      state,
      action: PayloadAction<AssessmentState["ui"]["sort_by"]>,
    ) => {
      state.ui.sort_by = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<"asc" | "desc">) => {
      state.ui.sort_order = action.payload;
    },
    // Clear all assessments
    clearAssessments: (state) => {
      state.assessments = [];
    },
    // Clear created assessments
    clearCreatedAssessments: (state) => {
      state.createdAssessments = [];
      state.currentCreatedAssessment = null;
    },
    // Set current created assessment
    setCurrentCreatedAssessment: (
      state,
      action: PayloadAction<CreatedAssessment | null>,
    ) => {
      state.currentCreatedAssessment = action.payload;
    },
    // Clear assessment data for specific project
    clearProjectAssessment: (state, action: PayloadAction<string>) => {
      const project_id = action.payload;
      state.createdAssessments = state.createdAssessments.filter(
        (assessment) => assessment.project_id !== project_id,
      );
      if (state.currentCreatedAssessment?.project_id === project_id) {
        state.currentCreatedAssessment = null;
      }
    },
    // Clear errors
    clearErrors: (state) => {
      state.error.fetchAssessments = null;
      state.error.createAssessment = null;
      state.error.checkAssessment = null;
      state.error.deleteAssessment = null;
      state.error.updateAssessment = null;
      state.error.submitAssessment = null;
      state.error.getProjectResults = null;
      state.error.getAssessmentResult = null;
    },
    // Reset all assessment state
    resetAssessmentState: (state) => {
      state.createdAssessments = [];
      state.currentCreatedAssessment = null;
      state.projectResults = [];
      state.assessmentResults = [];
      state.currentAssessmentResult = null;
      state.error.fetchAssessments = null;
      state.error.createAssessment = null;
      state.error.checkAssessment = null;
      state.error.deleteAssessment = null;
      state.error.updateAssessment = null;
      state.error.submitAssessment = null;
      state.error.getProjectResults = null;
      state.error.getAssessmentResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Student Assessments
      .addCase(fetchStudentAssessments.pending, (state) => {
        state.loading.fetchAssessments = true;
        state.error.fetchAssessments = null;
      })
      .addCase(fetchStudentAssessments.fulfilled, (state, action) => {
        state.loading.fetchAssessments = false;
        state.error.fetchAssessments = null;
        // Transform the API data to match our Assessment interface
        state.assessments = Array.isArray(action.payload.results)
          ? action.payload.results
          : [];
      })
      .addCase(fetchStudentAssessments.rejected, (state, action) => {
        state.loading.fetchAssessments = false;
        state.error.fetchAssessments =
          action.payload || "Failed to fetch assessments";
        state.assessments = [];
      })
      // Create Assessment
      .addCase(createAssessment.pending, (state) => {
        state.loading.createAssessment = true;
        state.error.createAssessment = null;
      })
      .addCase(createAssessment.fulfilled, (state, action) => {
        state.loading.createAssessment = false;
        state.error.createAssessment = null;
        state.currentCreatedAssessment = action.payload;
        state.createdAssessments.push(action.payload);
        console.log("🔍 ASSESSMENT_REDUX_UPDATED — createAssessment.fulfilled, createdAssessments count:", state.createdAssessments.length);
      })
      .addCase(createAssessment.rejected, (state, action) => {
        state.loading.createAssessment = false;
        state.error.createAssessment =
          action.payload || "Failed to create assessment";
      })
      // Fetch assessments for project
      .addCase(fetchAssessmentsByProject.pending, (state) => {
        state.loading.checkAssessment = true;
        state.error.checkAssessment = null;
      })
      .addCase(fetchAssessmentsByProject.fulfilled, (state, action) => {
        state.loading.checkAssessment = false;
        state.error.checkAssessment = null;
        const assessments = action.payload || [];
        // Replace createdAssessments for this project with fetched ones
        // Remove any existing assessments for this project
        if (assessments.length > 0) {
          const project_id = assessments[0].project_id;
          state.createdAssessments = state.createdAssessments.filter(
            (a) => a.project_id !== project_id,
          );
          state.createdAssessments.push(...assessments);
          state.currentCreatedAssessment = assessments[0];
        } else {
          // If empty, clear any existing for that project
          // We can't derive project_id reliably here if payload empty, so leave as-is
        }
      })
      .addCase(fetchAssessmentsByProject.rejected, (state, action) => {
        state.loading.checkAssessment = false;
        state.error.checkAssessment =
          action.payload || "Failed to fetch assessments";
      })
      // Fetch assessment by id
      .addCase(fetchAssessmentById.pending, (state) => {
        state.loading.checkAssessment = true;
        state.error.checkAssessment = null;
      })
      .addCase(fetchAssessmentById.fulfilled, (state, action) => {
        state.loading.checkAssessment = false;
        state.error.checkAssessment = null;
        const assessment = action.payload;
        state.currentCreatedAssessment = assessment;
        const existingIndex = state.createdAssessments.findIndex(
          (a) => a.id === assessment.id,
        );
        if (existingIndex === -1) {
          state.createdAssessments.push(assessment);
        } else {
          state.createdAssessments[existingIndex] = assessment;
        }
      })
      .addCase(fetchAssessmentById.rejected, (state, action) => {
        state.loading.checkAssessment = false;
        state.error.checkAssessment =
          action.payload || "Failed to fetch assessment";
      })
      // Delete assessment
      .addCase(deleteAssessment.pending, (state) => {
        state.loading.deleteAssessment = true;
        state.error.deleteAssessment = null;
      })
      .addCase(deleteAssessment.fulfilled, (state, action) => {
        state.loading.deleteAssessment = false;
        state.error.deleteAssessment = null;
        const deletedId = action.payload;
        // Remove from createdAssessments array
        state.createdAssessments = state.createdAssessments.filter(
          (a) => a.id !== deletedId,
        );
        // Clear current if it was deleted
        if (state.currentCreatedAssessment?.id === deletedId) {
          state.currentCreatedAssessment = null;
        }
      })
      .addCase(deleteAssessment.rejected, (state, action) => {
        state.loading.deleteAssessment = false;
        state.error.deleteAssessment =
          action.payload || "Failed to delete assessment";
      })
      // Update assessment
      .addCase(updateAssessment.pending, (state) => {
        state.loading.updateAssessment = true;
        state.error.updateAssessment = null;
      })
      .addCase(updateAssessment.fulfilled, (state, action) => {
        state.loading.updateAssessment = false;
        state.error.updateAssessment = null;
        const updatedAssessment = action.payload;
        state.currentCreatedAssessment = updatedAssessment;
        const existingIndex = state.createdAssessments.findIndex(
          (a) => a.id === updatedAssessment.id,
        );
        if (existingIndex !== -1) {
          state.createdAssessments[existingIndex] = updatedAssessment;
        }
      })
      .addCase(updateAssessment.rejected, (state, action) => {
        state.loading.updateAssessment = false;
        state.error.updateAssessment =
          action.payload || "Failed to update assessment";
      })
      // Submit assessment
      .addCase(submitAssessment.pending, (state) => {
        state.loading.submitAssessment = true;
        state.error.submitAssessment = null;
      })
      .addCase(submitAssessment.fulfilled, (state, action) => {
        state.loading.submitAssessment = false;
        state.error.submitAssessment = null;
        const result = action.payload;
        state.currentAssessmentResult = result;
        state.assessmentResults.push(result);
      })
      .addCase(submitAssessment.rejected, (state, action) => {
        state.loading.submitAssessment = false;
        state.error.submitAssessment =
          action.payload || "Failed to submit assessment";
      })
      // Get project results
      .addCase(getProjectResults.pending, (state) => {
        state.loading.getProjectResults = true;
        state.error.getProjectResults = null;
      })
      .addCase(getProjectResults.fulfilled, (state, action) => {
        state.loading.getProjectResults = false;
        state.error.getProjectResults = null;
        state.projectResults = action.payload;
      })
      .addCase(getProjectResults.rejected, (state, action) => {
        state.loading.getProjectResults = false;
        state.error.getProjectResults =
          action.payload || "Failed to fetch project results";
      })
      // Get assessment result
      .addCase(getAssessmentResult.pending, (state) => {
        state.loading.getAssessmentResult = true;
        state.error.getAssessmentResult = null;
      })
      .addCase(getAssessmentResult.fulfilled, (state, action) => {
        state.loading.getAssessmentResult = false;
        state.error.getAssessmentResult = null;
        state.currentAssessmentResult = action.payload;
      })
      .addCase(getAssessmentResult.rejected, (state, action) => {
        state.loading.getAssessmentResult = false;
        state.error.getAssessmentResult =
          action.payload || "Failed to fetch assessment result";
      });
  },
});

// Export actions
export const {
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
  resetAssessmentState,
} = assessmentSlice.actions;

// Export selectors
export const selectAssessments = (state: { assessment: AssessmentState }) =>
  state.assessment.assessments;
export const selectCreatedAssessments = (state: {
  assessment: AssessmentState;
}) => state.assessment.createdAssessments;
export const selectCurrentCreatedAssessment = (state: {
  assessment: AssessmentState;
}) => state.assessment.currentCreatedAssessment;
export const selectAssessmentLoading = (state: {
  assessment: AssessmentState;
}) => state.assessment.loading;
export const selectAssessmentError = (state: { assessment: AssessmentState }) =>
  state.assessment.error;
export const selectAssessmentUI = (state: { assessment: AssessmentState }) =>
  state.assessment.ui;
export const selectProjectResults = (state: { assessment: AssessmentState }) =>
  state.assessment.projectResults;
export const selectAssessmentResults = (state: { assessment: AssessmentState }) =>
  state.assessment.assessmentResults;
export const selectCurrentAssessmentResult = (state: {
  assessment: AssessmentState;
}) => state.assessment.currentAssessmentResult;

// Export reducer
export default assessmentSlice.reducer;
