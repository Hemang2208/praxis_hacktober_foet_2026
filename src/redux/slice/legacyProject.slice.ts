import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import projectsData from "@/components/mock/projects.json";

// Legacy Project type from mock data
export type LegacyProject = (typeof projectsData)[0];

export interface LegacyProjectFilters {
  status: string[];
  tags: string[];
  search: string;
}

export interface LegacyProjectState {
  projects: LegacyProject[];
  filters: LegacyProjectFilters;
  loading: boolean;
  error: string | null;
}

const initialState: LegacyProjectState = {
  projects: projectsData,
  filters: {
    status: [],
    tags: [],
    search: "",
  },
  loading: false,
  error: null,
};

const legacyProjectSlice = createSlice({
  name: "legacyProject",
  initialState,
  reducers: {
    addProject: (
      state,
      action: PayloadAction<
        Omit<LegacyProject, "id" | "created_at" | "updated_at">
      >,
    ) => {
      const id =
        typeof window !== "undefined"
          ? `project-${
              crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2)
            }`
          : "";
      const now = new Date().toISOString();
      const newProject = {
        ...action.payload,
        id,
        created_at: now,
        updated_at: now,
      } as LegacyProject;
      state.projects.push(newProject);
    },
    updateProject: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<LegacyProject> }>,
    ) => {
      const { id, updates } = action.payload;
      const index = state.projects.findIndex((p) => p.id === id);
      if (index !== -1) {
        state.projects[index] = {
          ...state.projects[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
      }
    },
    deleteProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter((p) => p.id !== action.payload);
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<LegacyProjectFilters>>,
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { status: [], tags: [], search: "" };
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
  addProject,
  updateProject,
  deleteProject,
  setFilters,
  clearFilters,
  setLoading,
  setError,
} = legacyProjectSlice.actions;

export default legacyProjectSlice.reducer;
