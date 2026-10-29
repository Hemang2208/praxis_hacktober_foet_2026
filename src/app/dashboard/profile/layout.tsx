import React from "react";
import ProfileLayout from "./provider";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Praxis - AI-Driven Project & Talent Management",
  description:
    "Praxis is a comprehensive AI-driven project and talent management platform designed to bridge the gap between students, colleges, and companies by simulating real-world experiences. Leveraging artificial intelligence, it manages projects, tracks progress, and provides actionable feedback, ensuring practical skills aligned with industry standards.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfileLayout>{children}</ProfileLayout>;
}
