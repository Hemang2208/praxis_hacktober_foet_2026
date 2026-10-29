"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  GraduationCap,
  Briefcase,
  Target,
  Bell,
  Pencil,
  CheckCircle2,
  Camera,
  ArrowRight,
  Mail,
  BookOpen,
} from "lucide-react";
import { useUser, useAppSelector } from "@/redux/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  {
    id: "personal",
    label: "Personal Information",
    description: "Name, bio, contact details & skills",
    icon: UserIcon,
    href: "/user/profile/personal",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-900/40",
  },
  {
    id: "education",
    label: "Education",
    description: "Degrees, institutions & academic achievements",
    icon: GraduationCap,
    href: "/user/profile/education",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900/40",
  },
  {
    id: "experience",
    label: "Experience",
    description: "Work history, projects & internships",
    icon: Briefcase,
    href: "/user/profile/experience",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900/40",
  },
  {
    id: "career",
    label: "Career & Preferences",
    description: "Goals, preferences & career interests",
    icon: Target,
    href: "/user/profile/career-preferences",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900/40",
  },
  {
    id: "notifications",
    label: "Notification Preferences",
    description: "Email, push & notification settings",
    icon: Bell,
    href: "/user/profile/notification-preferences",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-900/40",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

export default function ProfileOverviewPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  const avatarUrl = user?.profile_picture || user?.image_url;
  const displayName = user?.full_name || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-6xl mx-auto">
      {/* Hero profile card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-zinc-200/70 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar circle with Camera button overlay */}
          <div className="relative shrink-0">
            <Avatar className="h-24 w-24 border border-zinc-200 dark:border-[#1E1F23] shadow-sm">
              <AvatarImage src={avatarUrl || ""} alt={displayName} />
              <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => router.push("/user/profile/personal")}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-white dark:bg-[#17181C] border border-zinc-200 dark:border-[#26272B] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-md"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
            </button>
          </div>

          {/* User Details */}
          <div className="flex-1 w-full space-y-3">
            {/* Top row: Name & Edit button */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                {loading ? (
                  <span className="inline-block w-40 h-6 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                ) : (
                  displayName
                )}
              </h2>

              <Link href="/user/profile/personal">
                <Button
                  variant="outline"
                  className="h-9 px-4 rounded-full border-zinc-200 dark:border-[#26272B] dark:bg-transparent text-zinc-800 dark:text-[#F5F5F5] hover:bg-zinc-100 dark:hover:bg-[#17181C] text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              </Link>
            </div>

            {/* Email & Headline */}
            <div className="space-y-1">
              {user?.email && (
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{user.email}</span>
                </div>
              )}

              {user?.headline && (
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span>{user.headline}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {user?.bio && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
                {user.bio}
              </p>
            )}

            {/* Skill Badges */}
            {Array.isArray(user?.skills) && user.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {user.skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-[#17181C] text-zinc-700 dark:text-[#A1A1AA] border border-zinc-200 dark:border-[#26272B]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Section cards grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <motion.div key={section.id} variants={itemVariants}>
              <Link
                href={section.href}
                className="group flex flex-col gap-4 p-5 rounded-2xl border border-zinc-200/70 dark:border-[#1E1F23] bg-white dark:bg-[#111214] hover:border-zinc-300 dark:hover:border-[#26272B] hover:shadow-md transition-all duration-200 h-full justify-between"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center border", section.bg, section.border)}>
                      <Icon className={cn("h-4.5 w-4.5", section.color)} />
                    </div>
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                      {section.label}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 dark:text-[#71717A] group-hover:text-zinc-900 dark:group-hover:text-[#F5F5F5] uppercase tracking-wider transition-colors pt-2 border-t border-zinc-100 dark:border-[#1E1F23]">
                  <span>VIEW &amp; EDIT</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
