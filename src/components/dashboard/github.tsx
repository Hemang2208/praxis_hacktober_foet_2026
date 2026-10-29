"use client";

import React from "react";
import { GitHubIntegrationPage } from "@/components/github/GitHubIntegrationPage";

export function GitHubPage() {
  return <GitHubIntegrationPage redirectPath="/dashboard/github" />;
}
