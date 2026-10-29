import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import { useEffect } from "react";
import { createSelector } from "@reduxjs/toolkit";
import type { RootState, AppDispatch } from "./store";
import useSWR from "swr";
import {
  fetchUserOverview,
  fetchCollegeOverview,
  fetchCompanyOverview,
} from "@/redux/slice/dashboard.slice";

// Special fetcher for current-user endpoint that doesn't trigger logout on 401
const currentUserFetcher = async (url: string) => {
  const response = await fetch(url);

  // For current-user endpoint, 401 is expected when not logged in
  if (response.status === 401) {
    return null; // Return null instead of throwing error
  }

  if (!response.ok) {
    const error = new Error(`HTTP error ${response.status}`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  return response.json();
};
// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Memoized selectors using createSelector
const selectAssessmentState = (state: RootState) => state.assessment;
const selectCurrentAssessmentState = (state: RootState) =>
  state.currentAssessment;

const selectAssessmentData = createSelector(
  [selectAssessmentState],
  (assessmentState) => ({
    assessments: assessmentState.assessments,
    loading: assessmentState.loading,
    error: assessmentState.error,
    ui: assessmentState.ui,
  }),
);

const selectCurrentAssessmentData = createSelector(
  [selectCurrentAssessmentState],
  (currentAssessmentState) => ({
    assessment: currentAssessmentState.assessment,
    attempt: currentAssessmentState.attempt,
    loading: currentAssessmentState.loading,
    error: currentAssessmentState.error,
    ui: currentAssessmentState.ui,
  }),
);

// Custom hooks for common user operations with proper memoization
// Custom hook to read/set authentication data from Redux user slice
import { fetchUserProfile } from "@/redux/slice/user.slice";

export const useUser = () => {
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector((state) => state.user.userProfile);
  const loading = useAppSelector((state) => state.user.loading.fetchProfile);
  const error = useAppSelector((state) => state.user.error.fetchProfile);

  useEffect(() => {
    // Only fetch the profile once on first load. Do not refetch repeatedly when unauthenticated.
    if (!userProfile && !loading && !error) {
      void dispatch(fetchUserProfile());
    }
  }, [dispatch, userProfile, loading, error]);

  return {
    user: userProfile,
    loading,
    error,
  };
};

// Deprecated: useUserProfile is now provided by @/hooks/useUserProfile
// Remove or update all usages to import from @/hooks/useUserProfile
// export const useUserProfile = () => useAppSelector((state) => state.user.userProfile);

export const useUserLoading = () => {
  return useAppSelector((state) => state.user.loading);
};

export const useUserErrors = () => {
  return useAppSelector((state) => state.user.error);
};

export const useProfileCompletion = () => {
  return useAppSelector((state) => state.user.ui.profileCompleted);
};

export const useIsDirty = () => {
  return useAppSelector((state) => state.user.ui.isDirty);
};

export const useUserOverview = () => {
  const dispatch = useAppDispatch();
  const overview = useAppSelector((state) => state.dashboard.overviewData);
  const loading = useAppSelector((state) => state.dashboard.loading.overview);
  const error = useAppSelector((state) => state.dashboard.error.overview);

  useEffect(() => {
    if (!overview && !loading) {
      void dispatch(fetchUserOverview());
    }
  }, [dispatch, overview, loading]);

  return {
    overview,
    loading,
    error,
  };
};

export const useCollegeOverview = (enabled = true) => {
  const dispatch = useAppDispatch();
  const overview = useAppSelector((state) => state.dashboard.overviewData);
  const overviewRole = useAppSelector((state) => state.dashboard.overviewRole);
  const loading = useAppSelector((state) => state.dashboard.loading.overview);
  const error = useAppSelector((state) => state.dashboard.error.overview);

  useEffect(() => {
    if (!enabled) return;
    if ((overviewRole !== "college" || !overview) && !loading) {
      void dispatch(fetchCollegeOverview());
    }
  }, [dispatch, overview, loading, enabled, overviewRole]);

  return {
    overview,
    loading,
    error,
  };
};

export const useCompanyOverview = (enabled = true) => {
  const dispatch = useAppDispatch();
  const overview = useAppSelector((state) => state.dashboard.overviewData);
  const overviewRole = useAppSelector((state) => state.dashboard.overviewRole);
  const loading = useAppSelector((state) => state.dashboard.loading.overview);
  const error = useAppSelector((state) => state.dashboard.error.overview);

  useEffect(() => {
    if (!enabled) return;
    if ((overviewRole !== "company" || !overview) && !loading) {
      void dispatch(fetchCompanyOverview());
    }
  }, [dispatch, overview, loading, enabled, overviewRole]);

  return {
    overview,
    loading,
    error,
  };
};
// Custom hooks for assessment operations
export const useAssessmentData = () => {
  return useAppSelector(selectAssessmentData);
};

export const useAssessmentLoading = () => {
  return useAppSelector((state) => state.assessment.loading);
};

export const useAssessmentErrors = () => {
  return useAppSelector((state) => state.assessment.error);
};

// Custom hooks for current assessment operations
export const useCurrentAssessmentData = () => {
  return useAppSelector(selectCurrentAssessmentData);
};

export const useCurrentAssessment = () => {
  return useAppSelector((state) => state.currentAssessment.assessment);
};

export const useCurrentAssessmentLoading = () => {
  return useAppSelector((state) => state.currentAssessment.loading);
};

export const useCurrentAssessmentErrors = () => {
  return useAppSelector((state) => state.currentAssessment.error);
};

export const useCurrentAssessmentUI = () => {
  return useAppSelector((state) => state.currentAssessment.ui);
};

// Selector hook for GitHub repo commits cache
export const useRepoCommits = (owner?: string, repo?: string) => {
  const key = owner && repo ? `${owner}/${repo}` : undefined;
  const commits = useAppSelector((state) =>
    key ? (state.github.repoCommits[key] ?? null) : null,
  );
  const loading = useAppSelector((state) => state.github.loading);
  const error = useAppSelector((state) => state.github.error);
  return {
    commits,
    loading,
    error,
    cacheKey: key,
  };
};
