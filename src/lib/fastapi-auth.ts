/**
 * FastAPI Authentication Service
 * Handles token exchange and management for FastAPI Support Agent
 * 
 * Flow:
 * 1. User logs in via Passport.js/email-password on Next.js
 * 2. Call /api/auth/fastapi-token to exchange session for FastAPI JWT
 * 3. Use FastAPI JWT for all Support Agent API calls
 */

interface FastAPITokens {
  access_token: string;
  refresh_token: string;
  user_id: string;
  token_type: string;
}

class FastAPIAuthService {
  private tokenCache: Map<string, { tokens: FastAPITokens; expiresAt: number }> =
    new Map();
  private readonly TOKEN_REFRESH_THRESHOLD = 60 * 1000; // 1 minute before expiry

  /**
   * Get or refresh FastAPI access token for current user
   * Calls Next.js API route which handles FastAPI authentication
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/fastapi-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `[FastAPI Auth] Token fetch failed: status=${response.status}`,
        );
        return null;
      }

      const data = (await response.json()) as FastAPITokens;
      if (!data.access_token) {
        console.error("[FastAPI Auth] Token response missing access_token field");
        return null;
      }
      return data.access_token;
    } catch (error) {
      console.error("[FastAPI Auth] Error getting access token:", error);
      return null;
    }
  }

  /**
   * Get full token pair from FastAPI (includes refresh token)
   */
  async getTokenPair(): Promise<FastAPITokens | null> {
    try {
      const response = await fetch("/api/auth/fastapi-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("[FastAPI Auth] Token pair fetch failed:", response.status);
        return null;
      }

      return (await response.json()) as FastAPITokens;
    } catch (error) {
      console.error("[FastAPI Auth] Error getting token pair:", error);
      return null;
    }
  }

  /**
   * Refresh FastAPI access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/fastapi-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.error("[FastAPI Auth] Token refresh failed:", response.status);
        return null;
      }

      const data = (await response.json()) as { access_token: string };
      return data.access_token;
    } catch (error) {
      console.error("[FastAPI Auth] Error refreshing token:", error);
      return null;
    }
  }

  /**
   * Clear cached tokens (call on logout)
   */
  clearCache(): void {
    this.tokenCache.clear();
  }
}

export const fastAPIAuthService = new FastAPIAuthService();
export type { FastAPITokens };
