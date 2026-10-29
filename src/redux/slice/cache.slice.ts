/**
 * Cache Management Slice
 * Tracks which pages/resources have been fetched to prevent redundant API calls
 * Implements intelligent cache invalidation and memory management
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ResourceCache {
  // Which pages have been fetched (page number -> timestamp)
  fetchedPages: Record<number, number>;
  // Which detail items have been fetched (id -> timestamp)
  detailItems: Record<string, number>;
  // Last update timestamp for the entire resource
  lastUpdated: number | null;
  // Whether initial load is complete
  isInitialized: boolean;
  // Cache validity period in milliseconds (default: 5 minutes)
  cacheDuration: number;
}

export interface CacheState {
  // Different resource caches
  projects: ResourceCache;
  tasks: ResourceCache;
  certificates: ResourceCache;
  companies: ResourceCache;
  assessments: ResourceCache;
  user: ResourceCache;
  
  // Global settings
  globalCacheDuration: number; // in milliseconds
}

// Keep cache entries alive for the whole SPA session.
// Redux state resets on full reload, matching the required behavior.
const SESSION_CACHE_DURATION_MS = Number.MAX_SAFE_INTEGER;

const createEmptyResourceCache = (
  duration = SESSION_CACHE_DURATION_MS,
): ResourceCache => ({
  fetchedPages: {},
  detailItems: {},
  lastUpdated: null,
  isInitialized: false,
  cacheDuration: duration,
});

const initialState: CacheState = {
  projects: createEmptyResourceCache(),
  tasks: createEmptyResourceCache(),
  certificates: createEmptyResourceCache(),
  companies: createEmptyResourceCache(),
  assessments: createEmptyResourceCache(),
  user: createEmptyResourceCache(),
  globalCacheDuration: SESSION_CACHE_DURATION_MS,
};

const cacheSlice = createSlice({
  name: "cache",
  initialState,
  reducers: {
    // Mark a page as fetched
    markPageFetched: (
      state,
      action: PayloadAction<{
        resource: keyof CacheState;
        page: number;
      }>
    ) => {
      const { resource, page } = action.payload;
      if (resource !== "globalCacheDuration") {
        const cache = state[resource] as ResourceCache;
        cache.fetchedPages[page] = Date.now();
        cache.isInitialized = true;
      }
    },

    // Mark detail item as fetched
    markDetailItemFetched: (
      state,
      action: PayloadAction<{
        resource: keyof CacheState;
        id: string;
      }>
    ) => {
      const { resource, id } = action.payload;
      if (resource !== "globalCacheDuration") {
        const cache = state[resource] as ResourceCache;
        cache.detailItems[id] = Date.now();
      }
    },

    // Check if page is still valid (not expired)
    invalidatePageCache: (
      state,
      action: PayloadAction<{
        resource: keyof CacheState;
        page?: number; // If not provided, invalidate all pages
      }>
    ) => {
      const { resource, page } = action.payload;
      if (resource !== "globalCacheDuration") {
        const cache = state[resource] as ResourceCache;
        if (page !== undefined) {
          delete cache.fetchedPages[page];
        } else {
          cache.fetchedPages = {};
        }
      }
    },

    // Invalidate detail item cache
    invalidateDetailItemCache: (
      state,
      action: PayloadAction<{
        resource: keyof CacheState;
        id?: string; // If not provided, invalidate all detail items
      }>
    ) => {
      const { resource, id } = action.payload;
      if (resource !== "globalCacheDuration") {
        const cache = state[resource] as ResourceCache;
        if (id) {
          delete cache.detailItems[id];
        } else {
          cache.detailItems = {};
        }
      }
    },

    // Invalidate entire resource cache
    invalidateResourceCache: (
      state,
      action: PayloadAction<keyof CacheState>
    ) => {
      const resource = action.payload;
      if (resource !== "globalCacheDuration") {
        state[resource] = createEmptyResourceCache(
          state[resource].cacheDuration
        );
      }
    },

    // Set cache duration for a specific resource
    setCacheDuration: (
      state,
      action: PayloadAction<{
        resource: keyof CacheState;
        duration: number;
      }>
    ) => {
      const { resource, duration } = action.payload;
      if (resource !== "globalCacheDuration") {
        const cache = state[resource] as ResourceCache;
        cache.cacheDuration = duration;
      }
    },

    // Set global cache duration
    setGlobalCacheDuration: (
      state,
      action: PayloadAction<number>
    ) => {
      state.globalCacheDuration = action.payload;
    },

    // Clear all caches
    clearAllCaches: (state) => {
      state.projects = createEmptyResourceCache(state.projects.cacheDuration);
      state.tasks = createEmptyResourceCache(state.tasks.cacheDuration);
      state.certificates = createEmptyResourceCache(state.certificates.cacheDuration);
      state.companies = createEmptyResourceCache(state.companies.cacheDuration);
      state.assessments = createEmptyResourceCache(state.assessments.cacheDuration);
      state.user = createEmptyResourceCache(state.user.cacheDuration);
    },
  },
});

// Selectors
export const selectPageCache = (
  state: { cache: CacheState },
  resource: keyof CacheState,
  page: number
) => {
  if (resource === "globalCacheDuration") return null;
  const cache = (state.cache[resource] as unknown as ResourceCache);
  const timestamp = cache.fetchedPages[page];
  if (!timestamp) return null;

  const isExpired = Date.now() - timestamp > cache.cacheDuration;
  return { timestamp, isExpired };
};

export const selectDetailItemCache = (
  state: { cache: CacheState },
  resource: keyof CacheState,
  id: string
) => {
  if (resource === "globalCacheDuration") return null;
  const cache = (state.cache[resource] as unknown as ResourceCache);
  const timestamp = cache.detailItems[id];
  if (!timestamp) return null;

  const isExpired = Date.now() - timestamp > cache.cacheDuration;
  return { timestamp, isExpired };
};

export const selectResourceInitialized = (
  state: { cache: CacheState },
  resource: keyof CacheState
) => {
  if (resource === "globalCacheDuration") return false;
  return (state.cache[resource] as unknown as ResourceCache).isInitialized;
};

export const {
  markPageFetched,
  markDetailItemFetched,
  invalidatePageCache,
  invalidateDetailItemCache,
  invalidateResourceCache,
  setCacheDuration,
  setGlobalCacheDuration,
  clearAllCaches,
} = cacheSlice.actions;

export default cacheSlice.reducer;
