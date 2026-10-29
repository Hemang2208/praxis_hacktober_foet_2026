import React from "react";
import ProfileLayout from "./provider";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Profile | Praxis",
  description:
    "Manage your personal information, experience, and career goals.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfileLayout>{children}</ProfileLayout>;
}
