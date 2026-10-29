
import React from "react";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { getCurrentUser } from "@/lib/auth";

// Force dynamic rendering for this layout
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (!user) {
    redirect("/login");
  }

  // Convert Mongoose document to plain object for Client Component
  const plainUser = JSON.parse(JSON.stringify(user));

  return (
    <DashboardLayoutClient user={plainUser}>
      {children}
    </DashboardLayoutClient>
  );
}
