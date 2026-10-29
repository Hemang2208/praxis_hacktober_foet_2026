"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { seedUserProfile, UserProfileData } from "@/redux/slice/user.slice";

/**
 * Seeds Redux profile from SSR data only when the store is empty.
 * Returns live Redux profile (preferred) or initialUser as first-paint fallback.
 */
export function useProfileBootstrap(initialUser: UserProfileData) {
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector((state) => state.user.userProfile);
  const lastUpdated = useAppSelector((state) => state.user.ui.lastUpdated);

  useEffect(() => {
    if (initialUser) {
      dispatch(seedUserProfile(initialUser));
    }
  }, [initialUser, dispatch]);

  return {
    user: userProfile ?? initialUser,
    lastUpdated,
  };
}
