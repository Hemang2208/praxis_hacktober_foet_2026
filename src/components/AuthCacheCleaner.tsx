"use client";

import { useEffect, useRef } from 'react';
import { useUser, useAppDispatch } from '@/redux/hooks';
import { clearGitHubCache } from '@/redux/slice/github.slice';

export default function AuthCacheCleaner() {
  const { user } = useUser();
  const isSignedIn = !!user;
  const prevSignedIn = useRef<boolean | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (prevSignedIn.current === null) {
      prevSignedIn.current = !!isSignedIn;
      return;
    }
    // If user was signed in and now is not, clear GitHub cache
    if (prevSignedIn.current && !isSignedIn) {
      dispatch(clearGitHubCache());
    }
    prevSignedIn.current = !!isSignedIn;
  }, [isSignedIn, dispatch]);

  return null;
}
