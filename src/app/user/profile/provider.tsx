"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  GraduationCap,
  Target,
  Briefcase,
  Bell,
  CheckCircle2,
  Circle,
  Sparkles,
  Camera,
  FileText,
  Plus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

import { useUser, useAppSelector } from "@/redux/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const profileNavigation = [
  {
    name: "Personal Information",
    href: "/user/profile/personal",
    icon: UserIcon,
    description: "Manage your personal details",
  },
  {
    name: "Education",
    href: "/user/profile/education",
    icon: GraduationCap,
    description: "Academic background",
  },
  {
    name: "Experience",
    href: "/user/profile/experience",
    icon: Briefcase,
    description: "Projects and experience",
  },
  {
    name: "Career & Preferences",
    href: "/user/profile/career-preferences",
    icon: Target,
    description: "Career goals & settings",
  },
  {
    name: "Notification Preferences",
    href: "/user/profile/notification-preferences",
    icon: Bell,
    description: "Manage email settings",
  },
];

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const lastUpdated = useAppSelector((state) => state.user.ui.lastUpdated);
  
  const [completenessData, setCompletenessData] = useState<{
    percent: number;
    filledFields: string[];
    missingFields: string[];
  } | null>(null);

  useEffect(() => {
    const fetchCompleteness = async () => {
      try {
        let user_id = user?._id ?? null;
        if (!user_id) {
          const profileRes = await fetch("/api/auth/profile", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            user_id = profileData?.user?._id ?? null;
          }
        }

        if (!user_id) return;

        const res = await fetch("/api/profileCompleteness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id }),
        });
        if (res.ok) {
          const data = await res.json();
          setCompletenessData({
            percent: data.completeness ?? 0,
            filledFields: data.filledFields || [],
            missingFields: data.missingFields || [],
          });
        }
      } catch (err) {
        console.error("Failed to load completeness:", err);
      }
    };
    if (user?._id) fetchCompleteness();
  }, [user?._id, lastUpdated]);

  const percent = completenessData?.percent ?? 0;
  const filledFields = completenessData?.filledFields || [];
  const missingFields = completenessData?.missingFields || [];

  // Determine section completeness
  const sectionsStatus = {
    personal: filledFields.includes("full_name") && filledFields.includes("email") && filledFields.includes("bio"),
    education: filledFields.includes("education.degree") && filledFields.includes("education.institution"),
    experience: filledFields.includes("experience.level"),
    career: filledFields.includes("careerGoals.preferredRole") || filledFields.includes("careerGoals.careerObjective"),
    skills: filledFields.includes("skills"),
  };

  const checklistItems = [
    { name: "Personal Information", completed: sectionsStatus.personal, href: "/user/profile/personal" },
    { name: "Education", completed: sectionsStatus.education, href: "/user/profile/education" },
    { name: "Experience", completed: sectionsStatus.experience, href: "/user/profile/experience" },
    { name: "Career Preferences", completed: sectionsStatus.career, href: "/user/profile/career-preferences" },
    { name: "Skills & Interests", completed: sectionsStatus.skills, href: "/user/profile/personal" },
  ];

  // Dynamic Tips Based on Missing Fields
  const activeTips: any[] = [];
  if (missingFields.includes("bio")) {
    activeTips.push({
      title: "Add your bio",
      desc: "Tell us about yourself",
      icon: UserIcon,
    });
  }
  if (missingFields.includes("profile_picture")) {
    activeTips.push({
      title: "Upload profile photo",
      desc: "Add a professional photo",
      icon: Camera,
    });
  }
  if (missingFields.includes("skills")) {
    activeTips.push({
      title: "Add your skills",
      desc: "Highlight your expertise",
      icon: Sparkles,
    });
  }
  if (missingFields.includes("education.degree")) {
    activeTips.push({
      title: "Add education",
      desc: "Showcase your academic background",
      icon: GraduationCap,
    });
  }
  if (missingFields.includes("experience.level")) {
    activeTips.push({
      title: "Add experience",
      desc: "Showcase your work history",
      icon: Briefcase,
    });
  }

  // Completeness Circle SVG math
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const handleCompleteProfile = () => {
    // Navigate to the first incomplete tab in the checklist
    const firstIncomplete = checklistItems.find((item) => !item.completed);
    if (firstIncomplete) {
      router.push(firstIncomplete.href);
    }
  };

  if (pathname === "/user/profile") {
    return <div className="w-full">{children}</div>;
  }

  const currentTabObj = profileNavigation.find((i) => i.href === pathname);
  const activeTabName = currentTabObj ? currentTabObj.name.replace(" Information", "") : "Personal";

  return (
    <div className="space-y-4 w-full">
      {/* ── TWO-COLUMN MAIN GRID ────────────────────────────────────── */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Horizontal Tabs + Active Content Form */}
        <div className="lg:col-span-9 space-y-6 w-full min-w-0">
          <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] shadow-sm overflow-hidden">
            {/* Horizontal Tabs Header */}
            <div className="border-b border-zinc-100 dark:border-[#1E1F23] px-3 sm:px-6 pt-3 sm:pt-4 pb-0 bg-transparent overflow-x-auto hide-scrollbar select-none">
              <div className="flex gap-4 sm:gap-8 max-w-max">
                {profileNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative pb-3 text-xs sm:text-sm font-medium transition-all cursor-pointer select-none block outline-none whitespace-nowrap min-w-max ${
                        isActive
                          ? "text-zinc-950 dark:text-[#F5F5F5] font-semibold border-b-2 border-zinc-950 dark:border-emerald-500"
                          : "text-zinc-500 dark:text-[#71717A] hover:text-zinc-900 dark:hover:text-[#A1A1AA]"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sub-form Render Area */}
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </Card>
          
          {/* Action portal target (if needed by fallbacks, styled cleanly) */}
          <div id="profile-actions-portal" className="empty:hidden" />
        </div>

        {/* RIGHT COLUMN: Right Sidebar (Completeness & Tips) */}
        <div className="lg:col-span-3 space-y-6 w-full min-w-0">
          {/* Card 1: Profile Completeness */}
          <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] shadow-sm overflow-hidden">
            <CardContent className="p-5 space-y-5">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-300 tracking-wider uppercase">PROFILE COMPLETENESS</h3>
              
              {/* Completeness Dynamic Circle Graph */}
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      className="stroke-zinc-100 dark:stroke-zinc-800"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-500 ease-in-out"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-900 dark:text-zinc-50">
                    {percent}%
                  </div>
                </div>
                <div className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Complete your profile to unlock better opportunities.
                </div>
              </div>

              {/* Checklist Section */}
              <div className="space-y-3.5 pt-3 border-t border-zinc-100 dark:border-[#27272a]">
                {checklistItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-200 dark:text-zinc-700 flex-shrink-0" />
                    )}
                    <span className={cn(item.completed ? "line-through text-zinc-400 dark:text-zinc-500" : "font-medium")}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Complete Profile Button */}
              {percent < 100 && (
                <Button
                  onClick={handleCompleteProfile}
                  className="w-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-xl text-xs font-bold py-2.5 h-10 transition-colors mt-1"
                >
                  Complete Profile
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Profile Tips */}
          {activeTips.length > 0 && (
            <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-50 tracking-wide uppercase">Profile Tips</h3>
                
                <div className="space-y-4">
                  {activeTips.slice(0, 3).map((tip, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 flex-shrink-0">
                        <tip.icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{tip.title}</h4>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-snug">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  className="w-full border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-semibold rounded-xl text-[11px] h-9 px-4 mt-2 transition-all"
                  onClick={handleCompleteProfile}
                >
                  View All Tips <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
