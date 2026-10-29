"use client";

import { useEffect } from "react";

type CachedResponse = {
  body: string;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  cachedAt: number;
};

type InFlightStore = Map<string, Promise<Response>>;
type ResponseStore = Map<string, CachedResponse>;

declare global {
  interface Window {
    __kiyoFetchCacheInstalled?: boolean;
    __kiyoFetchResponseCache?: ResponseStore;
    __kiyoFetchInFlight?: InFlightStore;
  }
}

const toUrlString = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const getMethod = (input: RequestInfo | URL, init?: RequestInit): string => {
  const initMethod = init?.method;
  if (initMethod) return initMethod.toUpperCase();
  if (typeof input !== "string" && !(input instanceof URL) && input.method) {
    return input.method.toUpperCase();
  }
  return "GET";
};

const getCacheKey = (input: RequestInfo | URL, init?: RequestInit): string | null => {
  const method = getMethod(input, init);
  if (method !== "GET") return null;

  const rawUrl = toUrlString(input);
  try {
    const normalized = new URL(rawUrl, window.location.origin).toString();
    return `${method}:${normalized}`;
  } catch {
    return `${method}:${rawUrl}`;
  }
};

const cloneResponseFromCache = (cached: CachedResponse): Response => {
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: new Headers(cached.headers),
  });
};

const installSessionFetchCache = (): void => {
  if (typeof window === "undefined") return;
  if (window.__kiyoFetchCacheInstalled) return;

  window.__kiyoFetchCacheInstalled = true;
  window.__kiyoFetchResponseCache = window.__kiyoFetchResponseCache || new Map();
  window.__kiyoFetchInFlight = window.__kiyoFetchInFlight || new Map();

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const key = getCacheKey(input, init);
    if (!key) {
      return originalFetch(input, init);
    }

    const responseCache = window.__kiyoFetchResponseCache!;
    const inFlight = window.__kiyoFetchInFlight!;

    const cached = responseCache.get(key);
    if (cached) {
      return cloneResponseFromCache(cached);
    }

    const ongoing = inFlight.get(key);
    if (ongoing) {
      const resp = await ongoing;
      return resp.clone();
    }

    const fetchPromise = (async () => {
      const networkResponse = await originalFetch(input, init);
      const cloned = networkResponse.clone();
      const body = await cloned.text();
      const headers: Array<[string, string]> = [];
      cloned.headers.forEach((value, name) => {
        headers.push([name, value]);
      });

      responseCache.set(key, {
        body,
        status: cloned.status,
        statusText: cloned.statusText,
        headers,
        cachedAt: Date.now(),
      });

      return networkResponse;
    })();

    inFlight.set(key, fetchPromise);

    try {
      const response = await fetchPromise;
      return response.clone();
    } finally {
      inFlight.delete(key);
    }
  };
};

export function useSessionFetchCache(): void {
  useEffect(() => {
    installSessionFetchCache();
  }, []);
}
