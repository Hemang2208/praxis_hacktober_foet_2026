/**
 * Enhanced User Overview Hook
 * Uses Redux-first approach with aggregated API endpoint
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchUserOverview,
  fetchCollegeOverview,
  fetchCompanyOverview,
  type UserOverviewData,
} from "@/redux/slice/dashboard.slice";

export function useUserOverview() {
  const dispatch = useAppDispatch();
  
  // Get data from Redux
  const overviewData = useAppSelector((state) => state.dashboard.overviewData);
  const loading = useAppSelector((state) => state.dashboard.loading.overview);
  const error = useAppSelector((state) => state.dashboard.error.overview);
  const isInitialized = useAppSelector((state) => state.dashboard.isInitialized);

  useEffect(() => {
    // Only fetch if not already initialized
    if (!isInitialized && !overviewData && !loading) {
      void dispatch(fetchUserOverview());
    }
  }, [dispatch, isInitialized, overviewData, loading]);

  return {
    data: overviewData,
    loading: loading && !overviewData, // Show loading only if no data
    error,
    isInitialized,
  };
}

/**
 * Enhanced College Overview Hook
 * Follows same pattern as user
 */
export function useCollegeOverview() {
  const dispatch = useAppDispatch();
  
  const overviewData = useAppSelector((state) => state.dashboard.overviewData);
  const loading = useAppSelector((state) => state.dashboard.loading.overview);
  const error = useAppSelector((state) => state.dashboard.error.overview);
  const isInitialized = useAppSelector((state) => state.dashboard.isInitialized);

  useEffect(() => {
    if (!isInitialized && !overviewData && !loading) {
      void dispatch(fetchCollegeOverview());
    }
  }, [dispatch, isInitialized, overviewData, loading]);

  return {
    data: overviewData,
    loading: loading && !overviewData,
    error,
    isInitialized,
  };
}

/**
 * Company Overview Hook
 * Use dashboard caching for company overview data
 */
export function useCompanyOverview() {
  const dispatch = useAppDispatch();

  const overview = useAppSelector((state) => state.dashboard.overviewData);
  const loading = useAppSelector((state) => state.dashboard.loading.overview);
  const error = useAppSelector((state) => state.dashboard.error.overview);
  const isInitialized = useAppSelector((state) => state.dashboard.isInitialized);

  useEffect(() => {
    if (!isInitialized && !overview && !loading) {
      void dispatch(fetchCompanyOverview());
    }
  }, [dispatch, isInitialized, overview, loading]);

  return {
    data: overview,
    loading: loading && !overview,
    error,
    isInitialized,
  };
}
