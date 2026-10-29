/**
 * Queue-Aware Fetch Utility
 *
 * The backend API gateway uses a Redis-backed queue system (QUEUE_ENABLED=true)
 * that intercepts POST/PUT/PATCH/DELETE requests and returns HTTP 200/202 with
 * a queue response instead of the actual data:
 *
 *   { status: "queued"|"processing"|"completed", request_id: "uuid",
 *     result_url: "/api/v1/queue/{id}/result", status_url: "/api/v1/queue/{id}", ... }
 *
 * This utility wraps fetch() to detect these queue responses and transparently
 * poll for the actual result, returning it to callers as if the request was
 * handled synchronously.
 *
 * GET requests are never queued and pass through unchanged.
 */

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const P = "[queueAwareFetch]";

function log(tag: string, msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`${P} ${tag} ${msg}`, data);
  } else {
    console.log(`${P} ${tag} ${msg}`);
  }
}

function warn(tag: string, msg: string, data?: unknown) {
  if (data !== undefined) {
    console.warn(`${P} ${tag} ${msg}`, data);
  } else {
    console.warn(`${P} ${tag} ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueueResponse {
  status: "queued" | "processing" | "completed" | "failed" | "retrying";
  request_id: string;
  priority?: string;
  message?: string;
  queue_position?: number | null;
  estimated_wait_seconds?: number;
  status_url?: string;
  result_url?: string;
}

export interface QueueAwareFetchOptions {
  /** Maximum number of poll attempts before giving up (default: 15) */
  maxPollAttempts?: number;
  /** Milliseconds between poll attempts (default: 2000) */
  pollIntervalMs?: number;
  /** If true, skip queue handling entirely — just do a normal fetch */
  skipQueueHandling?: boolean;
  /** If true, also handle queue responses on GET requests (default: false) */
  allowGetQueueHandling?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isQueueResponse(data: unknown): data is QueueResponse {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.request_id === "string" &&
    !!obj.request_id &&
    typeof obj.status === "string" &&
    ["queued", "processing", "completed", "failed", "retrying"].includes(
      obj.status as string,
    )
  );
}

/**
 * Resolve the absolute URL for the queue result/status endpoint.
 *
 * Queue endpoints live at the API gateway root (/api/v1/queue/...).
 * We return a RELATIVE URL so the browser resolves it against the
 * page origin.  This ensures:
 *
 *   - In production (nginx):  the request hits nginx on the same domain,
 *     which routes /api/ → api-gateway.
 *   - In development (Next.js): the request goes through the Next.js dev
 *     server, which we configure in next.config.ts to proxy /api/v1/queue/*
 *     to the backend gateway.
 */
function resolveQueueUrl(relativeUrl: string, requestUrl: string): string {
  if (relativeUrl.startsWith("http")) return relativeUrl;
  try {
    if (requestUrl.startsWith("http")) {
      return new URL(relativeUrl, requestUrl).toString();
    }
  } catch (err) {
    console.error(`${P} Failed to resolve queue URL:`, err);
  }
  return relativeUrl;
}

/**
 * Fetch with timeout helper.  Adds cache-busting nonce to GET requests so
 * that Cloudflare / CDN / browser never returns a stale cached response
 * (e.g. "processing" when the worker already wrote "completed").
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Append _cb={now} to force-fresh responses from every caching layer
  const separator = url.includes("?") ? "&" : "?";
  const bustedUrl = `${url}${separator}_cb=${Date.now()}`;

  try {
    const res = await fetch(bustedUrl, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Poll the queue result URL until the job completes or we time out.
 */
async function pollQueueResult(
  resultUrl: string,
  statusUrl: string,
  options: Required<Pick<QueueAwareFetchOptions, "maxPollAttempts" | "pollIntervalMs">>,
  authHeader: string | null,
): Promise<Response | null> {
  const { maxPollAttempts, pollIntervalMs } = options;

  const baseHeaders: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) baseHeaders["Authorization"] = authHeader;

  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    log("POLL_STARTED", `attempt ${attempt + 1}/${maxPollAttempts}`);

    try {
      // --- Step 1: Check job status ---
      if (statusUrl) {
        log("QUEUE_READ_STATUS", `polling ${statusUrl}`);
        const statusRes = await fetchWithTimeout(statusUrl, {
          method: "GET",
          headers: baseHeaders,
          cache: "no-store",
          timeoutMs: 10000,
        });

        log("QUEUE_RESPONSE_STATUS", `status=${statusRes.status}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          log("QUEUE_RAW_RESPONSE", "raw status body", statusData);
          log("QUEUE_STATUS_VALUE", `status=${statusData?.status}`, { requestId: statusData?.request_id });
          log("QUEUE_STATUS_RECEIVED", `status=${statusData?.status}`, { requestId: statusData?.request_id });

          if (statusData?.status === "failed") {
            warn("QUEUE_FAILED", statusData.error || "Job failed");
            return new Response(
              JSON.stringify({
                error: statusData.error || "Queue job failed",
                status: "failed",
              }),
              {
                status: 500,
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "Pragma": "no-cache",
                  "Expires": "0",
                },
              },
            );
          }

          if (statusData?.status === "completed") {
            log("QUEUE_COMPLETED_DETECTED", `job completed, fetching result`);
          } else if (
            statusData?.status === "queued" ||
            statusData?.status === "processing" ||
            statusData?.status === "retrying"
          ) {
            log("POLL_CONTINUE", `job ${statusData.status}, waiting...`);
            continue;
          }
          // status === "completed" falls through to result fetch
        } else {
          warn("QUEUE_STATUS_ERROR", `status endpoint returned ${statusRes.status}`);
          // Continue to try result endpoint directly
        }
      }

      // --- Step 2: Try to get the result ---
      log("RESULT_FETCH_STARTED", `fetching ${resultUrl}`);
      const resultRes = await fetchWithTimeout(resultUrl, {
        method: "GET",
        headers: baseHeaders,
        cache: "no-store",
        timeoutMs: 10000,
      });

      if (resultRes.ok) {
        const resultData = await resultRes.json();
        log("QUEUE_RAW_RESPONSE", "raw result body", resultData);
        log("RESULT_FETCH_SUCCESS", "result fetched successfully");

        if (resultData && typeof resultData === "object") {
          const actualData = resultData.data || resultData;
          const statusCode = resultData.status_code || 200;

          log("POLL_COMPLETE", `status_code=${statusCode}, returning response`);

          return new Response(JSON.stringify(actualData), {
            status: statusCode,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0",
            },
          });
        }
      } else {
        log("RESULT_FETCH_FAILED", `status=${resultRes.status}`);
      }

      // 202 means job is still processing (result not ready yet)
      if (resultRes.status === 202) {
        log("POLL_CONTINUE", `job still processing (result 202)`);
        continue;
      }

      // 404 means result not found
      if (resultRes.status === 404) {
        warn("QUEUE_RESULT_404", `result not found for ${resultUrl}`);
        continue;
      }

      // 429 means rate limited
      if (resultRes.status === 429) {
        warn("QUEUE_RATE_LIMITED", `rate limited, will retry`);
        continue;
      }

      // 500+ means server error
      if (resultRes.status >= 500) {
        warn("QUEUE_SERVER_ERROR", `result endpoint returned ${resultRes.status}`);
        continue;
      }

      // Any other status — unexpected
      warn("QUEUE_UNEXPECTED_STATUS", `result endpoint returned ${resultRes.status}`);
    } catch (pollError) {
      warn("POLL_ERROR", `attempt ${attempt + 1} failed:`, pollError);
    }
  }

  warn("POLL_TIMEOUT", `timed out after ${maxPollAttempts} attempts`);
  return null;
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export async function queueAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: QueueAwareFetchOptions,
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const skipQueue = options?.skipQueueHandling ?? false;
  const maxPollAttempts = options?.maxPollAttempts ?? 15;
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;

  log("REQUEST_SENT", `${method} ${typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url}`);

  // Perform the actual fetch
  const response = await fetch(input, init);

  // GET requests are never queued (unless allowGetQueueHandling is set)
  // Also skip if explicitly disabled or response indicates an error
  if ((method === "GET" && !options?.allowGetQueueHandling) || skipQueue || (!response.ok && response.status !== 202)) {
    return response;
  }

  // For 200/202 responses on write methods, check if it's a queue response
  if (response.status === 200 || response.status === 202) {
    const cloned = response.clone();

    try {
      const data = await cloned.json();

      if (isQueueResponse(data)) {
        log("QUEUE_CREATED", `request_id=${data.request_id}, status=${data.status}`);

        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

        if (data.result_url) {
          const absoluteResultUrl = resolveQueueUrl(data.result_url, requestUrl);
          const absoluteStatusUrl = data.status_url
            ? resolveQueueUrl(data.status_url, requestUrl)
            : "";

          let authHeader: string | null = null;
          if (init?.headers) {
            const headers = new Headers(init.headers);
            authHeader = headers.get("Authorization");
          }

          log("POLL_STARTED", `polling queue result`, { resultUrl: absoluteResultUrl, statusUrl: absoluteStatusUrl });

          const polledResponse = await pollQueueResult(
            absoluteResultUrl,
            absoluteStatusUrl,
            { maxPollAttempts, pollIntervalMs },
            authHeader,
          );

          if (polledResponse) {
            log("THUNK_RESOLVED", `queue result received, returning to caller`);
            return polledResponse;
          }
        }

        // If polling failed or no result_url, return a 504 Gateway Timeout.
        return new Response(
          JSON.stringify({
            error: `Queue processing timed out after ${maxPollAttempts} attempts`,
            status: "timeout",
            request_id: data.request_id,
          }),
          {
            status: 504,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0",
            },
          },
        );
      }
    } catch {
      // Not JSON or parse error — return original response
    }
  }

  return response;
}

export function isQueueTimeoutResponse(response: Response): boolean {
  return response.status === 504;
}

export async function serverQueueAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: QueueAwareFetchOptions,
): Promise<Response> {
  return queueAwareFetch(input, init, {
    maxPollAttempts: options?.maxPollAttempts ?? 10,
    pollIntervalMs: options?.pollIntervalMs ?? 1500,
    ...options,
  });
}
