"use client";

/**
 * Global API client with automatic 401 handling and logout
 */

// Create a logout function that handles different user roles
export const performLogout = async () => {
  try {
    // Call logout API to clear server-side token
    await fetch("/api/logout", { method: "POST" });
  } catch (error) {
    console.error("Error calling logout API:", error);
  }

  // Get user role from JWT token to determine redirect URL
  let redirectUrl = "/login"; // default

  try {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/aipm_token=([^;]+)/);
      if (match && match[1]) {
        const token = match[1];
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
        const payload = JSON.parse(jsonPayload);

        if (payload.role === "college") {
          redirectUrl = "/college/login";
        } else if (payload.role === "company") {
          redirectUrl = "/company/login";
        }
      }
    }
  } catch (error) {
    console.error("Error parsing JWT for role:", error);
  }

  // Clear any client-side state if needed
  // You can add localStorage.clear() or other cleanup here if needed

  // Redirect to appropriate login page
  if (typeof window !== "undefined") {
    window.location.href = redirectUrl;
  }
};

// Enhanced fetch function with automatic 401 handling
export const fetchWithAuth = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetch(input, init);

  // If we get a 401 Unauthorized, handle gracefully
  if (response.status === 401) {
    console.warn("401 Unauthorized detected");

    // If we are already on any login/signup route, avoid constant page reload loops.
    if (typeof window !== "undefined") {
      const authPaths = [
        "/login",
        "/signup",
        "/college/login",
        "/college/signup",
        "/company/login",
        "/company/signup",
        "/plan-login",
      ];
      const publicPaths = [
        "/",
        "/about",
        "/contact",
        "/careers",
        "/preregister",
        "/plan",
      ];
      const currentPath = window.location.pathname;

      const isPublicPath =
        publicPaths.includes(currentPath) ||
        publicPaths.some(
          (path) => path !== "/" && currentPath.startsWith(`${path}/`),
        );

      if (authPaths.includes(currentPath) || isPublicPath) {
        console.debug(
          "On public/auth route - skipping performLogout redirect to prevent unwanted navigation",
        );
        // On public/auth routes, do NOT throw the redirecting error. Just return response.
        return response;
      } else {
        console.warn("Performing automatic logout due to 401");
        await performLogout();
      }
    } else {
      await performLogout();
    }

    throw new Error("Authentication expired - redirecting to login");
  }

  return response;
};

// JSON version that automatically handles 401 and parses JSON
export const fetchJsonWithAuth = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<unknown> => {
  const response = await fetchWithAuth(input, init);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${response.status}`);
  }

  return response.json();
};

// SWR-compatible fetcher with automatic 401 handling
export const swrFetcherWithAuth = async (url: string): Promise<unknown> => {
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    const error = new Error(`HTTP error ${response.status}`) as Error & {
      status: number;
    };
    // Add status to error for SWR error handling
    error.status = response.status;
    throw error;
  }

  return response.json();
};
