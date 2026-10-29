import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Analytics Types
export type ProjectAnalytics = {
  burndown: Array<{ date: string; planned: number; actual: number }>;
  velocity: Array<{ sprint: string; points: number; completed: number }>;
  commits: Array<{ date: string; count: number }>;
  taskDistribution: Array<{ status: string; count: number }>;
  project_idUsed?: string;
};

export interface AnalyticsState {
  analyticsCache: Record<string, ProjectAnalytics>;
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  analyticsCache: {},
  loading: false,
  error: null,
};

// Helper function to generate seeded random for consistent analytics
function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

// Generate mock analytics data for a project
export function generateProjectAnalytics(project_id: string): ProjectAnalytics {
  const rand = seededRandom(project_id);
  const now = new Date();
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split("T")[0];
  });

  return {
    burndown: dates.map((date, i) => ({
      date,
      planned: Math.max(0, 100 - i * 3),
      actual: Math.max(0, 100 - i * 2.5 + rand() * 10 - 5),
    })),
    velocity: [
      { sprint: `Sprint 1 (${project_id})`, points: 23, completed: 21 },
      { sprint: `Sprint 2 (${project_id})`, points: 28, completed: 25 },
      { sprint: `Sprint 3 (${project_id})`, points: 32, completed: 30 },
      { sprint: `Sprint 4 (${project_id})`, points: 25, completed: 18 },
    ],
    commits: dates.map((date) => ({
      date,
      count: Math.floor(rand() * 8),
    })),
    taskDistribution: [
      { status: "Backlog", count: 12 },
      { status: "In Progress", count: 5 },
      { status: "Review", count: 3 },
      { status: "Done", count: 18 },
    ],
    project_idUsed: project_id,
  };
}

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    setProjectAnalytics: (
      state,
      action: PayloadAction<{ project_id: string; analytics: ProjectAnalytics }>,
    ) => {
      const { project_id, analytics } = action.payload;
      state.analyticsCache[project_id] = analytics;
    },
    generateAndCacheAnalytics: (state, action: PayloadAction<string>) => {
      const project_id = action.payload;
      if (!state.analyticsCache[project_id]) {
        state.analyticsCache[project_id] = generateProjectAnalytics(project_id);
      }
    },
    clearAnalyticsCache: (state) => {
      state.analyticsCache = {};
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setProjectAnalytics,
  generateAndCacheAnalytics,
  clearAnalyticsCache,
  setLoading,
  setError,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
