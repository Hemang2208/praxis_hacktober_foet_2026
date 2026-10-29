"use client";

import type * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, GraduationCap, Briefcase, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If it's the base profile page, render without layout wrapping navigation
  if (pathname === "/dashboard/profile") {
    return <>{children}</>;
  }

  // Company profile navigation tabs
  const profileNavigation = [
    {
      name: "Personal",
      href: "/dashboard/profile/personal",
      icon: User,
      description: "Company profile details",
    },
    {
      name: "Invite",
      href: "/dashboard/profile/invite",
      icon: Briefcase,
      description: "Invite team members",
    },
    {
      name: "Cohorts",
      href: "/dashboard/profile/cohorts",
      icon: GraduationCap,
      description: "Manage intern cohorts",
    },
    {
      name: "Notification Preferences",
      href: "/dashboard/profile/notification-preferences",
      icon: Bell,
      description: "Manage email settings",
    },
  ];

  const activeTab = profileNavigation.find((item) => item.href === pathname);
  const pageTitle = activeTab ? `${activeTab.name} Profile` : "Company Profile";
  const pageDescription = activeTab
    ? activeTab.description
    : "Manage your company information and settings.";

  return (
    <div className="space-y-6 w-full">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{pageTitle}</h1>
        <p className="text-zinc-500 text-sm">{pageDescription}</p>
      </div>

      {/* ── MAIN LAYOUT CARD WITH TABS ───────────────────────────────── */}
      <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Horizontal Navigation Tabs (Segmented Control style) */}
        <div className="border-b border-zinc-100 dark:border-zinc-850 px-6 py-3.5 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-x-auto hide-scrollbar select-none">
          <div className="flex p-1 bg-zinc-100/80 dark:bg-zinc-850 rounded-xl gap-1 max-w-max">
            {profileNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-1.5 text-xs font-semibold tracking-wide rounded-lg transition-colors cursor-pointer select-none text-center block outline-none min-w-max ${
                    isActive
                      ? "text-zinc-950 dark:text-zinc-50 font-bold"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="companyProfileActiveTab"
                      className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-zinc-200/40 dark:border-zinc-700"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {children}
        </div>
      </Card>
    </div>
  );
}
