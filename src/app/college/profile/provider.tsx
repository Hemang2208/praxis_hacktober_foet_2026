"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, GraduationCap, Target, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user role to determine layout
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/profile");
        const data = await response.json();
        if (data.user?.role) {
          setUserRole(data.user.role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  // If it's the unified profile page for company/college, render without navigation
  if (pathname === "/college/profile") {
    return <>{children}</>;
  }


  // If it's student profile pages, show the existing navigation layout
  if (userRole === "student") {
    return <StudentProfileLayout>{children}</StudentProfileLayout>;
  }

  // If it's college profile pages, show the college navigation layout
  if (userRole === "college") {
    return <CollegeProfileLayout>{children}</CollegeProfileLayout>;
  }
// College profile layout with tabs for Cohorts, Invite, Personal
function CollegeProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profileNavigation = [
    {
      name: "Cohorts",
      href: "/college/profile/cohorts",
      icon: GraduationCap,
      description: "Manage student cohorts",
    },
    {
      name: "Invite",
      href: "/college/profile/invite",
      icon: User,
      description: "Invite students to join",
    },
    {
      name: "Personal",
      href: "/college/profile/personal",
      icon: Briefcase,
      description: "College profile details",
    },
    {
      name: "Notifications",
      href: "/college/profile/notifications",
      icon: Target,
      description: "View and manage notifications",
    },
    {
      name: "Settings",
      href: "/college/profile/settings",
      icon: User,
      description: "Manage college settings",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Sidebar: Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Profile Navigation */}
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {profileNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 mt-1" />
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-3"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

  // For loading state or unknown roles, just render children
  if (loading) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

// Existing student profile layout (extracted from original code)
function StudentProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Student-specific navigation
  const profileNavigation = [
    {
      name: "Personal Information",
      href: "/college/profile/personal",
      icon: User,
      description: "Manage your personal details",
    },
    {
      name: "Education",
      href: "/college/profile/education",
      icon: GraduationCap,
      description: "Your educational background",
    },
    {
      name: "Experience",
      href: "/college/profile/experience",
      icon: Briefcase,
      description: "Work experience and skills",
    },
    {
      name: "Career Preferences",
      href: "/college/profile/career-preferences",
      icon: Target,
      description: "Career goals and preferences",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Student Profile
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your profile information to connect with internship
          opportunities.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Sidebar: Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Profile Navigation */}
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {profileNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 mt-1" />
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-3"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
