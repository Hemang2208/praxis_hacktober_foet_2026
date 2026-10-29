import { useCallback } from "react";
import { useAppSelector } from "@/redux/hooks";
import { useCachedUser } from "./useCachedResources";

// GitHub cache persists indefinitely until manual refresh
// Profile tabs keep a longer duration for other data
const PROFILE_TAB_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for non-GitHub tabs

export function useProfileTabCache(tabName: "education" | "experience" | "career" | "github") {
  const { isCached: isUserCached } = useCachedUser();
  
  const cacheData = useAppSelector((state) => {
    const cache = (state as any).cache?.profileTabs || {};
    return cache[tabName];
  });

  const isValid = useCallback(() => {
    if (!cacheData) return false;
    const now = Date.now();
    return now - cacheData.lastFetched < PROFILE_TAB_CACHE_DURATION;
  }, [cacheData]);

  const loading = !isUserCached;
  const isCached = isValid() && !!cacheData?.data;

  return {
    data: cacheData?.data,
    loading: loading && !isCached,
    isCached,
    isValid: isValid(),
  };
}

export function useGitHubCache() {
  const userProfile = useAppSelector((state) => state.user.userProfile);
  const githubData = useAppSelector((state) => state.github);
  
  const isLoading = useAppSelector((state) => state.github.loading);
  const error = useAppSelector((state) => state.github.error);

  const isCached = !!githubData && Object.keys(githubData.repoCommits || {}).length > 0;

  return {
    data: githubData,
    loading: isLoading && !isCached,
    isCached,
    error,
    username: userProfile?.socialLinks?.github,
  };
}

export function useProfileCaching(tabName: "education" | "experience" | "career" | "github") {
  const githubCache = useGitHubCache();
  const profileCache = useProfileTabCache(tabName);
  
  if (tabName === "github") {
    return githubCache;
  }
  return profileCache;
}
