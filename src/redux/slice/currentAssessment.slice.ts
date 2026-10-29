import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ASSESSMENT_AGENT_URL } from "@/utils/API_URL";

// Assessment Question Interface
export interface AssessmentQuestion {
  question: string;
  type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

// Current Assessment Interface
export interface CurrentAssessment {
  id: string;
  project_id: string;
  title: string;
  description: string;
  difficulty: string;
  questions: AssessmentQuestion[];
  total_points: number;
  time_limit: number;
  created_at: string;
}

// Assessment Attempt Interface
export interface AssessmentAttempt {
  assessment_id: string;
  user_id: string;
  project_id: string;
  status: "in_progress" | "completed" | "auto_submitted";
  submitted_at?: string;
  attempts_count: number;
}

// Current Assessment State
export interface CurrentAssessmentState {
  assessment: CurrentAssessment | null;
  attempt: AssessmentAttempt | null;
  loading: {
    fetchAssessment: boolean;
    checkAttempt: boolean;
  };
  error: {
    fetchAssessment: string | null;
    checkAttempt: string | null;
  };
  ui: {
    isAttemptAllowed: boolean;
    hasExistingAttempt: boolean;
    warningCount: number; // For tab change warnings
    isSessionActive: boolean;
  };
}

// Initial state
const initialState: CurrentAssessmentState = {
  assessment: null,
  attempt: null,
  loading: {
    fetchAssessment: false,
    checkAttempt: false,
  },
  error: {
    fetchAssessment: null,
    checkAttempt: null,
  },
  ui: {
    isAttemptAllowed: true,
    hasExistingAttempt: false,
    warningCount: 0,
    isSessionActive: false,
  },
};

// Async Thunks
export const fetchAssessmentByProject = createAsyncThunk<
  { assessment: CurrentAssessment },
  string, // project_id
  { rejectValue: string }
>(
  "currentAssessment/fetchByProject",
  async (project_id, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/projects/${project_id}/assessments`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(
          errorData.message || "Failed to fetch assessment",
        );
      }

      const data = await response.json();

      // Assuming API returns array of assessments, take the first one
      if (!Array.isArray(data) || data.length === 0) {
        return rejectWithValue("No assessments found for this project");
      }

      const assessment = data[0];
      if (!assessment || !assessment.id) {
        return rejectWithValue("Invalid assessment data");
      }

      return { assessment };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch assessment",
      );
    }
  },
);

export const checkAssessmentAttempt = createAsyncThunk<
  { attempt: AssessmentAttempt | null; isAllowed: boolean },
  { assessmentId: string },
  { rejectValue: string }
>(
  "currentAssessment/checkAttempt",
  async ({ assessmentId }, { rejectWithValue }) => {
    try {
      // First check localStorage for completed assessments (only on browser)
      let completedAssessments: string[] = [];
      if (typeof window !== "undefined") {
        completedAssessments = JSON.parse(
          window.localStorage.getItem("completedAssessments") || "[]",
        );
      }

      if (completedAssessments.includes(assessmentId)) {
        return {
          attempt: {
            assessment_id: assessmentId,
            user_id: "",
            project_id: "",
            status: "completed" as const,
            submitted_at: new Date().toISOString(),
            attempts_count: 1,
          },
          isAllowed: false,
        };
      }

      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/assessments/${assessmentId}/take`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (response.status === 404) {
        // No existing attempt found, user can take the assessment
        return { attempt: null, isAllowed: true };
      }

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Failed to check attempt");
      }

      const data = await response.json();

      // If attempt exists and is completed, user cannot retake
      const isAllowed =
        data.status !== "completed" &&
        data.status !== "auto_submitted" &&
        data.status !== "submitted";

      return {
        attempt: data,
        isAllowed,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to check assessment attempt",
      );
    }
  },
);

export const createAssessmentAttempt = createAsyncThunk<
  { attempt: AssessmentAttempt },
  { user_id: string; assessmentId: string },
  { rejectValue: string }
>(
  "currentAssessment/createAttempt",
  async ({ user_id, assessmentId }, { rejectWithValue }) => {
    try {
      // Based on the API endpoints provided, there doesn't seem to be a separate
      // endpoint for creating attempts. The attempt is likely created when the user
      // starts taking the assessment. For now, we'll return a mock attempt.
      const mockAttempt: AssessmentAttempt = {
        assessment_id: assessmentId,
        user_id: user_id,
        project_id: "", // This should be filled appropriately
        status: "in_progress",
        attempts_count: 1,
      };

      return { attempt: mockAttempt };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create assessment attempt",
      );
    }
  },
);

// Fetch assessment for taking (without correct answers)
export const fetchAssessmentForTaking = createAsyncThunk<
  { assessment: CurrentAssessment },
  string, // assessmentId
  { rejectValue: string }
>(
  "currentAssessment/fetchForTaking",
  async (assessmentId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${ASSESSMENT_AGENT_URL}/assessments/${assessmentId}/take`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(
          errorData.message || "Failed to fetch assessment for taking",
        );
      }

      const data = await response.json();

      if (!data || !data.id) {
        return rejectWithValue("Invalid assessment data: Missing ID");
      }

      // Ensure questions is an array, even if empty
      if (!data.questions || !Array.isArray(data.questions)) {
        console.warn(
          "Assessment questions is not an array, setting to empty array",
        );
        data.questions = [];
      } else {
        // Ensure each question has valid options array
        data.questions = data.questions.map(
          (q: Partial<AssessmentQuestion>) => ({
            question: q.question || "",
            type: q.type || "multiple_choice",
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer: q.correct_answer || "",
            explanation: q.explanation || "",
            points: q.points || 1,
          }),
        );
      }

      return { assessment: data };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch assessment for taking",
      );
    }
  },
);

// Current Assessment Slice
const currentAssessmentSlice = createSlice({
  name: "currentAssessment",
  initialState,
  reducers: {
    // Clear assessment data
    clearAssessment: (state) => {
      state.assessment = null;
      state.attempt = null;
      state.ui.isSessionActive = false;
      state.ui.warningCount = 0;
    },

    // Start assessment session
    startSession: (state) => {
      state.ui.isSessionActive = true;
      state.ui.warningCount = 0;
    },

    // End assessment session
    endSession: (state) => {
      state.ui.isSessionActive = false;
    },

    // Increment warning count for tab changes
    incrementWarning: (state) => {
      state.ui.warningCount += 1;
    },

    // Reset warnings
    resetWarnings: (state) => {
      state.ui.warningCount = 0;
    },

    // Set attempt status
    setAttemptStatus: (
      state,
      action: PayloadAction<"in_progress" | "completed" | "auto_submitted">,
    ) => {
      if (state.attempt) {
        state.attempt.status = action.payload;
        if (
          action.payload === "completed" ||
          action.payload === "auto_submitted"
        ) {
          state.ui.isSessionActive = false;
          state.ui.isAttemptAllowed = false;
        }
      }
    },

    // Mark assessment as completed and store in localStorage
    markAssessmentCompleted: (state, action: PayloadAction<string>) => {
      const assessmentId = action.payload;

      // Update state
      state.ui.isAttemptAllowed = false;
      state.ui.isSessionActive = false;

      if (state.attempt) {
        state.attempt.status = "completed";
        state.attempt.submitted_at = new Date().toISOString();
      }

      // Store in localStorage to persist across sessions (only on browser)
      if (typeof window !== "undefined") {
        try {
          const completedAssessments = JSON.parse(
            window.localStorage.getItem("completedAssessments") || "[]",
          );

          if (!completedAssessments.includes(assessmentId)) {
            completedAssessments.push(assessmentId);
            window.localStorage.setItem(
              "completedAssessments",
              JSON.stringify(completedAssessments),
            );
          }
        } catch (error) {
          console.error("Failed to store completed assessment:", error);
        }
      }
    },

    // Clear errors
    clearErrors: (state) => {
      state.error.fetchAssessment = null;
      state.error.checkAttempt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Assessment by Project
      .addCase(fetchAssessmentByProject.pending, (state) => {
        state.loading.fetchAssessment = true;
        state.error.fetchAssessment = null;
      })
      .addCase(fetchAssessmentByProject.fulfilled, (state, action) => {
        state.loading.fetchAssessment = false;
        state.error.fetchAssessment = null;
        state.assessment = action.payload.assessment;
      })
      .addCase(fetchAssessmentByProject.rejected, (state, action) => {
        state.loading.fetchAssessment = false;
        state.error.fetchAssessment =
          action.payload || "Failed to fetch assessment";
        state.assessment = null;
      })

      // Check Assessment Attempt
      .addCase(checkAssessmentAttempt.pending, (state) => {
        state.loading.checkAttempt = true;
        state.error.checkAttempt = null;
      })
      .addCase(checkAssessmentAttempt.fulfilled, (state, action) => {
        state.loading.checkAttempt = false;
        state.error.checkAttempt = null;
        state.attempt = action.payload.attempt;
        state.ui.isAttemptAllowed = action.payload.isAllowed;
        state.ui.hasExistingAttempt = !!action.payload.attempt;
      })
      .addCase(checkAssessmentAttempt.rejected, (state, action) => {
        state.loading.checkAttempt = false;
        state.error.checkAttempt = action.payload || "Failed to check attempt";
        state.ui.isAttemptAllowed = false;
      })

      // Create Assessment Attempt
      .addCase(createAssessmentAttempt.pending, (state) => {
        state.loading.checkAttempt = true;
        state.error.checkAttempt = null;
      })
      .addCase(createAssessmentAttempt.fulfilled, (state, action) => {
        state.loading.checkAttempt = false;
        state.error.checkAttempt = null;
        state.attempt = action.payload.attempt;
        state.ui.hasExistingAttempt = true;
        state.ui.isSessionActive = true;
      })
      .addCase(createAssessmentAttempt.rejected, (state, action) => {
        state.loading.checkAttempt = false;
        state.error.checkAttempt = action.payload || "Failed to create attempt";
      })

      // Fetch Assessment For Taking
      .addCase(fetchAssessmentForTaking.pending, (state) => {
        state.loading.fetchAssessment = true;
        state.error.fetchAssessment = null;
      })
      .addCase(fetchAssessmentForTaking.fulfilled, (state, action) => {
        state.loading.fetchAssessment = false;
        state.error.fetchAssessment = null;
        state.assessment = action.payload.assessment;
      })
      .addCase(fetchAssessmentForTaking.rejected, (state, action) => {
        state.loading.fetchAssessment = false;
        state.error.fetchAssessment =
          action.payload || "Failed to fetch assessment for taking";
      });
  },
});

// Export actions
export const {
  clearAssessment,
  startSession,
  endSession,
  incrementWarning,
  resetWarnings,
  setAttemptStatus,
  markAssessmentCompleted,
  clearErrors,
} = currentAssessmentSlice.actions;

// Export selectors
export const selectCurrentAssessment = (state: {
  currentAssessment: CurrentAssessmentState;
}) => state.currentAssessment.assessment;
export const selectCurrentAttempt = (state: {
  currentAssessment: CurrentAssessmentState;
}) => state.currentAssessment.attempt;
export const selectCurrentAssessmentLoading = (state: {
  currentAssessment: CurrentAssessmentState;
}) => state.currentAssessment.loading;
export const selectCurrentAssessmentError = (state: {
  currentAssessment: CurrentAssessmentState;
}) => state.currentAssessment.error;
export const selectCurrentAssessmentUI = (state: {
  currentAssessment: CurrentAssessmentState;
}) => state.currentAssessment.ui;

// Export reducer
export default currentAssessmentSlice.reducer;
