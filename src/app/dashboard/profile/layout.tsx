import React from "react";
import ProfileLayout from "./provider";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Kiyo - AI-Driven Internship Management",
  description:
    "Kiyo is a comprehensive AI-driven internship management platform designed to bridge the gap between students, colleges, and companies by simulating real-world internship experiences. Leveraging artificial intelligence, it manages projects, tracks progress, and provides actionable feedback, ensuring students develop practical skills aligned with industry standards.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfileLayout>{children}</ProfileLayout>;
}
