import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import type { RootState, AppDispatch } from "@/redux/store";

/**
 * Generic cached data hook with Redux-first approach
 * Prevents redundant API calls by checking Redux state first
 * Only fetches if data is not already loaded
 */
export interface CachedDataOptions<T> {
  // Selector to get data from Redux state
  selector: (state: RootState) => T;
  // Selector to get loading state
  loadingSelector: (state: RootState) => boolean;
  // Selector to get error state
  errorSelector: (state: RootState) => string | null;
  // Thunk to dispatch if data is not loaded
  fetchThunk: (dispatch: AppDispatch) => Promise<any>;
  // Optional: dependency array to trigger re-fetch
  deps?: any[];
  // Optional: force refresh even if data exists
  skipCache?: boolean;
}

export function useCachedData<T>({
  selector,
  loadingSelector,
  errorSelector,
  fetchThunk,
  deps = [],
  skipCache = false,
}: CachedDataOptions<T>) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selector);
  const loading = useAppSelector(loadingSelector);
  const error = useAppSelector(errorSelector);

  useEffect(() => {
    // If data exists and we're not forcing refresh, don't fetch
    if (!skipCache && data) {
      return;
    }

    // If already loading, don't dispatch again
    if (loading) {
      return;
    }

    // Fetch the data
    void fetchThunk(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipCache, data, loading, dispatch, fetchThunk, ...deps]);

  return { data, loading, error };
}

/**
 * Hook for paginated data with caching
 */
export interface PaginatedDataOptions<T> extends CachedDataOptions<T[]> {
  // Current page (1-indexed)
  page?: number;
  // Items per page
  pageSize?: number;
  // Optional: pagination selector
  pageSelector?: (state: RootState) => {
    totalPages: number;
    currentPage: number;
  };
}

export function useCachedPaginatedData<T>({
  selector,
  loadingSelector,
  errorSelector,
  fetchThunk,
  page = 1,
  pageSize = 10,
  pageSelector,
  deps = [],
  skipCache = false,
}: PaginatedDataOptions<T>) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selector);
  const loading = useAppSelector(loadingSelector);
  const error = useAppSelector(errorSelector);
  const paginationStateRaw = useAppSelector(pageSelector || ((state) => null));
  const paginationState = pageSelector ? paginationStateRaw : null;

  useEffect(() => {
    // Check if this page is already cached
    if (!skipCache && data && data.length > 0) {
      return;
    }

    if (loading) {
      return;
    }

    // Fetch with pagination params
    void fetchThunk(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipCache, data, loading, page, pageSize, dispatch, fetchThunk, ...deps]);

  return {
    data,
    loading,
    error,
    pagination: paginationState,
  };
}

/**
 * Hook for detail page caching
 * Automatically caches detailed resource data by ID
 */
export interface DetailDataOptions<T> extends CachedDataOptions<T> {
  // Resource ID
  id: string;
  // Should validate ID format before fetching
  validateId?: (id: string) => boolean;
}

export function useCachedDetailData<T>({
  id,
  selector,
  loadingSelector,
  errorSelector,
  fetchThunk,
  validateId,
  deps = [],
  skipCache = false,
}: DetailDataOptions<T>) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selector);
  const loading = useAppSelector(loadingSelector);
  const error = useAppSelector(errorSelector);

  useEffect(() => {
    // Validate ID if validator provided
    if (validateId && !validateId(id)) {
      return;
    }

    // If data matches current ID and we're not forcing refresh, don't fetch
    if (!skipCache && data) {
      return;
    }

    if (loading) {
      return;
    }

    // Fetch the detail data
    void fetchThunk(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipCache, id, data, loading, dispatch, validateId, fetchThunk, ...deps]);

  return { data, loading, error };
}

/**
 * Hook to invalidate specific cache entries
 */
export function useCacheInvalidation() {
  const dispatch = useAppDispatch();

  const invalidate = useCallback(
    (invalidationThunk: (dispatch: AppDispatch) => void) => {
      invalidationThunk(dispatch);
    },
    [dispatch],
  );

  return { invalidate };
}
