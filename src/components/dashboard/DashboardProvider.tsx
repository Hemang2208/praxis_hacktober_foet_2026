"use client";

import React, { useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import {
  initializeDashboard,
  refreshDashboardData,
  addNotification,
} from "@/redux/slice/dashboard.slice";

interface DashboardProviderProps {
  children: React.ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  children,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isInitialized, loading, error, initializationTimestamp } =
    useSelector((state: RootState) => state.dashboard);

  const hasRenderedRef = React.useRef(false);
  if (isInitialized) {
    hasRenderedRef.current = true;
  }

  // Initialize dashboard data when component mounts
  const initializeDashboardData = useCallback(async () => {
    if (!isInitialized && !loading.initialization) {
      try {
        await dispatch(initializeDashboard()).unwrap();
        dispatch(
          addNotification({
            title: "Welcome!",
            message: "Dashboard loaded successfully",
            type: "success",
          }),
        );
      } catch (error) {
        console.error("Failed to initialize dashboard:", error);
        dispatch(
          addNotification({
            title: "Error",
            message:
              "Failed to load dashboard data. Some features may not work properly.",
            type: "error",
          }),
        );
      }
    }
  }, [dispatch, isInitialized, loading.initialization]);

  // Handle page refresh - reinitialize if data is stale (older than 5 minutes)
  const handlePageRefresh = useCallback(async () => {
    const now = Date.now();
    const FIVE_MINUTES = 50 * 60 * 1000; // 5 minutes in milliseconds

    if (
      isInitialized &&
      initializationTimestamp &&
      now - initializationTimestamp > FIVE_MINUTES
    ) {
      try {
        await dispatch(refreshDashboardData()).unwrap();
        dispatch(
          addNotification({
            title: "Data Refreshed",
            message: "Dashboard data has been updated",
            type: "info",
          }),
        );
      } catch (error) {
        console.error("Failed to refresh dashboard data:", error);
      }
    }
  }, [dispatch, isInitialized, initializationTimestamp]);

  // Initialize on mount
  useEffect(() => {
    initializeDashboardData();
  }, [initializeDashboardData]);

  // Handle page visibility change (when user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isInitialized) {
        handlePageRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handlePageRefresh, isInitialized]);

  // Handle window focus (when user switches back to window)
  useEffect(() => {
    const handleFocus = () => {
      if (isInitialized) {
        handlePageRefresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [handlePageRefresh, isInitialized]);

  // Show loading state during initial load
  if (loading.initialization && !isInitialized && !hasRenderedRef.current) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#09090B] px-4 py-10">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-10 w-48 rounded-full bg-accent animate-pulse"></div>
            <div className="h-10 w-24 rounded-full bg-accent animate-pulse"></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="space-y-4 rounded-3xl bg-white p-6 shadow-sm dark:bg-[#111214]"
              >
                <div className="h-6 w-3/4 rounded-full bg-accent animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 w-full rounded-full bg-accent animate-pulse" />
                  <div className="h-4 w-5/6 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="h-40 w-full rounded-3xl bg-accent animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error.initialization && !isInitialized && !hasRenderedRef.current) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#09090B] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.872-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error.initialization}
          </p>
          <button
            onClick={initializeDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default DashboardProvider;
