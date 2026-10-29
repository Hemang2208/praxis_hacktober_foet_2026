import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";
import { fetchUserProfile, setUser } from "./user.slice";
import { fetchProjects, setProjects } from "./project.slice";
import { fetchTasks, setTasks } from "./task.slice";

// Dashboard Types
export interface DashboardAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  productivityScore: number;
  recentActivity: Array<{
    id: string;
    type: "project" | "task" | "achievement";
    title: string;
    description: string;
    timestamp: Date;
    icon?: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    type: "project" | "task";
    deadline: Date;
    status: string;
  }>;
}

export interface UserOverviewData {
  user: Record<string, unknown> | null;
  companies: Array<Record<string, unknown>>;
  joinedProjects: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  summaryStats?: {
    taskCompletionRate: number;
    gitHubCommits: number;
    aiFeedbackScore: number;
    certificatesEarned: number;
  };
  taskSummary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    blockedTasks: number;
  };
  projectSummary: {
    totalProjects: number;
    completedProjects: number;
    inProgressProjects: number;
  };
}

export interface DashboardState {
  // Initialization
  isInitialized: boolean;
  initializationTimestamp: number | null;

  // Analytics
  analytics: DashboardAnalytics | null;

  // Aggregated user overview
  overviewData: UserOverviewData | null;
  overviewRole: "student" | "college" | "company" | null;

  // Loading States
  loading: {
    initialization: boolean;
    analytics: boolean;
    overview: boolean;
  };

  // Error States
  error: {
    initialization: string | null;
    analytics: string | null;
    overview: string | null;
  };

  // UI States
  ui: {
    selectedTab: string;
    sidebarCollapsed: boolean;
    theme: "light" | "dark" | "system";
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: "info" | "success" | "warning" | "error";
      timestamp: string; // ISO string for Redux serializability
      read: boolean;
    }>;
  };
}

// Initial state
const initialState: DashboardState = {
  isInitialized: false,
  initializationTimestamp: null,
  analytics: null,
  loading: {
    initialization: false,
    analytics: false,
    overview: false,
  },
  error: {
    initialization: null,
    analytics: null,
    overview: null,
  },
  ui: {
    selectedTab: "overview",
    sidebarCollapsed: false,
    theme: "system",
    notifications: [],
  },
  overviewData: null,
  overviewRole: null,
};

// Async Thunks
export const initializeDashboard = createAsyncThunk<
  { success: boolean },
  void,
  { rejectValue: string; dispatch: AppDispatch; state: RootState }
>(
  "dashboard/initializeDashboard",
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();
      if (state.dashboard.isInitialized || state.dashboard.overviewData) {
        return { success: true };
      }

      // Determine user role first
      let userRole = "student"; // default
      try {
        const authRes = await fetch("/api/auth/check", {
          credentials: "include",
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          userRole = authData.role || "student";
        }
      } catch (err) {
        console.warn("Could not determine user role, defaulting to student");
      }

      // Fetch overview based on user role
      let overviewResult;
      if (userRole === "company") {
        overviewResult = await dispatch(fetchCompanyOverview());
      } else if (userRole === "college") {
        overviewResult = await dispatch(fetchCollegeOverview());
      } else {
        // Student or unknown role
        overviewResult = await dispatch(fetchUserOverview());
      }

      // Check if the overview fetch succeeded (works for any thunk)
      if (
        fetchUserOverview.fulfilled.match(overviewResult) ||
        fetchCompanyOverview.fulfilled.match(overviewResult) ||
        fetchCollegeOverview.fulfilled.match(overviewResult)
      ) {
        return { success: true };
      }

      // Fallback to standard fetch path if aggregated endpoint fails
      console.warn(
        "fetchOverview failed for role, falling back to separate calls",
        overviewResult,
      );

      const promises = [
        dispatch(fetchUserProfile()),
        dispatch(fetchProjects()),
        dispatch(fetchTasks()),
      ];

      const results = await Promise.allSettled(promises);
      const failures = results.filter((result) => result.status === "rejected");

      if (failures.length > 0) {
        console.warn("Some dashboard data failed to load:", failures);
        const userProfileResult = results[0];
        if (userProfileResult.status === "rejected") {
          return rejectWithValue("Failed to load user profile");
        }
      }

      return { success: true };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to initialize dashboard",
      );
    }
  },
);

export const fetchDashboardAnalytics = createAsyncThunk<
  { analytics: DashboardAnalytics },
  void,
  { rejectValue: string }
>("dashboard/fetchAnalytics", async (_, { rejectWithValue }) => {
  try {
    const response = await fetch("/api/dashboard/analytics", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(errorData.message || "Failed to fetch analytics");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch analytics",
    );
  }
});

export const fetchUserOverview = createAsyncThunk<
  UserOverviewData,
  void,
  { rejectValue: string; dispatch: AppDispatch }
>("dashboard/fetchUserOverview", async (_, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetch("/api/user/student/overview", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return rejectWithValue(
        (errorData && (errorData as any).error) ||
          (errorData && (errorData as any).message) ||
          `Failed to fetch user overview (${response.status})`,
      );
    }

    const data = (await response.json()) as UserOverviewData;

    if (data.user) {
      dispatch(setUser(data.user as any));
    }

    if (data.joinedProjects && data.joinedProjects.length > 0) {
      dispatch(setProjects(data.joinedProjects as any));
    }

    if (data.tasks && data.tasks.length > 0) {
      dispatch(setTasks(data.tasks as any));
    }

    return data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch user overview",
    );
  }
});

export const fetchCollegeOverview = createAsyncThunk<
  UserOverviewData,
  void,
  { rejectValue: string; dispatch: AppDispatch }
>(
  "dashboard/fetchCollegeOverview",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch("/api/college/overview", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return rejectWithValue(
          (errorData && (errorData as any).error) ||
            (errorData && (errorData as any).message) ||
            `Failed to fetch college overview (${response.status})`,
        );
      }

      const data = (await response.json()) as UserOverviewData;

      if (data.user) {
        dispatch(setUser(data.user as any));
      }

      if (data.joinedProjects && data.joinedProjects.length > 0) {
        dispatch(setProjects(data.joinedProjects as any));
      }

      if (data.tasks && data.tasks.length > 0) {
        dispatch(setTasks(data.tasks as any));
      }

      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch college overview",
      );
    }
  },
);

export const fetchCompanyOverview = createAsyncThunk<
  UserOverviewData,
  void,
  { rejectValue: string; dispatch: AppDispatch }
>(
  "dashboard/fetchCompanyOverview",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch("/api/company/overview", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return rejectWithValue(
          (errorData && (errorData as any).error) ||
            (errorData && (errorData as any).message) ||
            `Failed to fetch company overview (${response.status})`,
        );
      }

      const data = (await response.json()) as UserOverviewData;

      if (data.user) {
        dispatch(setUser(data.user as any));
      }

      if (data.joinedProjects && data.joinedProjects.length > 0) {
        dispatch(setProjects(data.joinedProjects as any));
      }

      if (data.tasks && data.tasks.length > 0) {
        dispatch(setTasks(data.tasks as any));
      }

      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch company overview",
      );
    }
  },
);

export const refreshDashboardData = createAsyncThunk<
  { success: boolean },
  void,
  { rejectValue: string; dispatch: AppDispatch }
>("dashboard/refreshData", async (_, { rejectWithValue, dispatch }) => {
  try {
    // Re-fetch all data
    await dispatch(initializeDashboard());
    return { success: true };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to refresh dashboard data",
    );
  }
});

// Dashboard Slice
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    // UI Actions
    setSelectedTab: (state, action: PayloadAction<string>) => {
      state.ui.selectedTab = action.payload;
    },

    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.ui.sidebarCollapsed = action.payload;
    },

    setTheme: (state, action: PayloadAction<DashboardState["ui"]["theme"]>) => {
      state.ui.theme = action.payload;
    },

    // Notification Management
    addNotification: (
      state,
      action: PayloadAction<
        Omit<
          DashboardState["ui"]["notifications"][0],
          "id" | "timestamp" | "read"
        >
      >,
    ) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.ui.notifications.unshift(notification);
      // Keep only the latest 50 notifications
      if (state.ui.notifications.length > 50) {
        state.ui.notifications = state.ui.notifications.slice(0, 50);
      }
    },

    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.ui.notifications.find(
        (n) => n.id === action.payload,
      );
      if (notification) {
        notification.read = true;
      }
    },

    markAllNotificationsAsRead: (state) => {
      state.ui.notifications.forEach((notification) => {
        notification.read = true;
      });
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.ui.notifications = state.ui.notifications.filter(
        (n) => n.id !== action.payload,
      );
    },

    clearAllNotifications: (state) => {
      state.ui.notifications = [];
    },

    // Error Management
    clearDashboardError: (
      state,
      action: PayloadAction<keyof DashboardState["error"]>,
    ) => {
      state.error[action.payload] = null;
    },

    clearAllDashboardErrors: (state) => {
      Object.keys(state.error).forEach((key) => {
        state.error[key as keyof DashboardState["error"]] = null;
      });
    },

    // Reset dashboard state (for logout)
    resetDashboardState: () => {
      return initialState;
    },

    // Force re-initialization (for manual refresh)
    forceReinitialization: (state) => {
      state.isInitialized = false;
      state.initializationTimestamp = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize Dashboard
    builder
      .addCase(initializeDashboard.pending, (state) => {
        state.loading.initialization = true;
        state.error.initialization = null;
      })
      .addCase(initializeDashboard.fulfilled, (state) => {
        state.loading.initialization = false;
        state.isInitialized = true;
        state.initializationTimestamp = Date.now();
        state.error.initialization = null;
      })
      .addCase(initializeDashboard.rejected, (state, action) => {
        state.loading.initialization = false;
        state.error.initialization =
          action.payload || "Failed to initialize dashboard";
        state.isInitialized = false;
      });

    // Fetch Dashboard Analytics
    builder
      .addCase(fetchDashboardAnalytics.pending, (state) => {
        state.loading.analytics = true;
        state.error.analytics = null;
      })
      .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
        state.loading.analytics = false;
        state.analytics = action.payload.analytics;
        state.error.analytics = null;
      })
      .addCase(fetchDashboardAnalytics.rejected, (state, action) => {
        state.loading.analytics = false;
        state.error.analytics = action.payload || "Failed to fetch analytics";
      });

    // Fetch Student Overview
    builder
      .addCase(fetchUserOverview.pending, (state) => {
        state.loading.overview = true;
        state.error.overview = null;
      })
      .addCase(fetchUserOverview.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.overviewData = action.payload;
        state.overviewRole = "student";
        state.error.overview = null;
      })
      .addCase(fetchUserOverview.rejected, (state, action) => {
        state.loading.overview = false;
        state.error.overview =
          action.payload || "Failed to fetch student overview";
        state.overviewRole = null;
      });

    // Fetch College Overview
    builder
      .addCase(fetchCollegeOverview.pending, (state) => {
        state.loading.overview = true;
        state.error.overview = null;
      })
      .addCase(fetchCollegeOverview.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.overviewData = action.payload;
        state.overviewRole = "college";
        state.error.overview = null;
      })
      .addCase(fetchCollegeOverview.rejected, (state, action) => {
        state.loading.overview = false;
        state.error.overview =
          action.payload || "Failed to fetch college overview";
        state.overviewRole = null;
      });

    // Fetch Company Overview
    builder
      .addCase(fetchCompanyOverview.pending, (state) => {
        state.loading.overview = true;
        state.error.overview = null;
      })
      .addCase(fetchCompanyOverview.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.overviewData = action.payload;
        state.overviewRole = "company";
        state.error.overview = null;
      })
      .addCase(fetchCompanyOverview.rejected, (state, action) => {
        state.loading.overview = false;
        state.error.overview =
          action.payload || "Failed to fetch company overview";
        state.overviewRole = null;
      });

    // Refresh Dashboard Data
    builder
      .addCase(refreshDashboardData.pending, (state) => {
        state.loading.initialization = true;
        state.error.initialization = null;
      })
      .addCase(refreshDashboardData.fulfilled, (state) => {
        state.loading.initialization = false;
        state.initializationTimestamp = Date.now();
        state.error.initialization = null;
      })
      .addCase(refreshDashboardData.rejected, (state, action) => {
        state.loading.initialization = false;
        state.error.initialization =
          action.payload || "Failed to refresh dashboard data";
      });
  },
});

export const {
  setSelectedTab,
  setSidebarCollapsed,
  setTheme,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearAllNotifications,
  clearDashboardError,
  clearAllDashboardErrors,
  resetDashboardState,
  forceReinitialization,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
