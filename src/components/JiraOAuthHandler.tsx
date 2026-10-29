"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function JiraOAuthHandlerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const jiraStatus = searchParams.get("jira");

    if (jiraStatus === "connected") {
      toast.success("Jira connected successfully!");
      router.replace("/user/connections");
    } else if (jiraStatus === "error") {
      const reason = searchParams.get("reason");
      let message = "Failed to connect Jira";
      if (reason === "state_mismatch") {
        message = "Security verification failed. Please try again.";
      } else if (reason === "token_exchange_failed") {
        message = "Failed to exchange authorization code. Please try again.";
      } else if (reason === "not_configured") {
        message = "Jira integration is not configured.";
      } else if (reason === "no_jira_access") {
        message = "No Jira projects accessible with this account.";
      } else if (reason === "not_authenticated") {
        message = "Please log in first to connect Jira.";
      } else if (reason === "access_denied") {
        message = "Authorization was denied. Please try again.";
      }
      toast.error(message);
      router.replace("/user/connections");
    }
  }, [searchParams, router]);

  return null;
}

export default function JiraOAuthHandler() {
  return (
    <Suspense fallback={null}>
      <JiraOAuthHandlerContent />
    </Suspense>
  );
}
