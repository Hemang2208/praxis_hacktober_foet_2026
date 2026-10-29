"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
}

export default function DashboardLayoutClient({
  children,
}: DashboardLayoutClientProps) {
  return <AppShell>{children}</AppShell>;
}
