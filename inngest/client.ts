import { Inngest } from "inngest";

// KIYO Inngest client (single source of truth)
function validateInngestConfig() {
  const env = process.env.NODE_ENV;
  const appId = process.env.INNGEST_APP_ID;
  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;

  // Dev mode: soft validation
  if (env !== "production") {
    console.log(
      `[KIYO/Inngest] Dev mode | App ID: ${appId || "kiyo"} | Signing disabled`,
    );
    return;
  }

  const missing: string[] = [];
  if (!appId) missing.push("INNGEST_APP_ID");
  if (!eventKey) missing.push("INNGEST_EVENT_KEY");
  if (!signingKey) missing.push("INNGEST_SIGNING_KEY");

  // Prod mode: hard validation
  if (missing.length > 0) {
    console.error(
      `[KIYO/Inngest] Missing config: ${missing.join(", ")} | Workers and events will not run`,
    );
    return;
  }

  // Warn if branch key is used in production
  if (signingKey?.includes("signkey-branch-")) {
    console.warn(
      "[KIYO/Inngest] Branch signing key detected in production | Use signkey-prod-*",
    );
  }

  console.log("[KIYO/Inngest] Production config verified | Ready");
}

// Run validation at startup (only at runtime, not during static build phase)
if (process.env.NEXT_PHASE !== "phase-production-build") {
  validateInngestConfig();
}

// Centralized KIYO Inngest client
export const inngest = new Inngest({
  // App identifier (must match Inngest dashboard)
  id: process.env.INNGEST_APP_ID || "kiyo",

  // Auth key for sending events
  eventKey: process.env.INNGEST_EVENT_KEY,

  // Signing key for verifying inbound worker requests
  ...(process.env.INNGEST_SIGNING_KEY && {
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }),

  // Dev vs prod mode toggle
  isDev:
    process.env.NODE_ENV !== "production" ||
    process.env.INNGEST_DEV === "true" ||
    process.env.INNGEST_DEV === "1",

  // Retry policy for failed deliveries
  retries: { attempts: 2 },

  // Lightweight structured logging in dev
  logger:
    process.env.NODE_ENV !== "production" ||
    process.env.INNGEST_DEV === "true" ||
    process.env.INNGEST_DEV === "1"
      ? {
          info: (msg: string) => console.log(`[KIYO/Inngest] ${msg}`),
          warn: (msg: string) => console.warn(`[KIYO/Inngest] ${msg}`),
          error: (msg: string) => console.error(`[KIYO/Inngest] ${msg}`),
          debug: (msg: string) => console.debug(`[KIYO/Inngest] ${msg}`),
        }
      : undefined,
});
