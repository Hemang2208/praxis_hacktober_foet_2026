"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAppSelector } from "@/redux/hooks";

/**
 * Maps route segments to human-readable names
 */
const routeNames: Record<string, string> = {
  dashboard: "Dashboard",
  user: "User",
  college: "College",
  projects: "Projects",
  tasks: "Tasks",
  profile: "Profile",
  settings: "Settings",
  analytics: "Analytics",
  board: "Board",
  plan: "Plan",
  assessment: "Assessment",
  learning: "Learning",
  certifications: "Certifications",
  certificates: "Certificates",
  applications: "Applications",
  github: "GitHub Sync",
  chat: "Chat",
};

export function DynamicBreadcrumbs() {
  const pathname = usePathname();

  // Try to get specific names from Redux if available
  const currentProject = useAppSelector(
    (state) => state.project?.currentProject,
  );
  const currentTask = useAppSelector((state) => state.task?.currentTask);
  const projects = useAppSelector((state) => state.project?.projects);
  const tasks = useAppSelector((state) => state.task?.tasks);
  const supportChats = useAppSelector((state) => state.supportChat?.sessions);

  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  if (pathSegments.length <= 2) {
    return null;
  }

  const homeHref = (() => {
    const root = pathSegments[0];
    if (root === "dashboard") return "/dashboard";
    if (root === "user") return "/user";
    if (root === "college") return "/college";
    if (root === "company") return "/company";
    return "/";
  })();

  const skipRootSegments = new Set(["dashboard", "user"]);

  // Filter out redundant URL segments
  const filteredSegments = pathSegments.filter((segment, index) => {
    if (index === 0 && skipRootSegments.has(segment)) {
      return false;
    }

    // Skip 'tasks' if followed by a task ID
    if (segment === "tasks" && index < pathSegments.length - 1) {
      const nextSegment = pathSegments[index + 1];
      if (!routeNames[nextSegment]) {
        return false;
      }
    }
    // Skip 'board' if it's the dashboard board view (it's redundant with Project Detail context)
    // but keep it if the user wants it. The user said "same should be on dashboard side".
    return true;
  });

  // Function to get a display name for a segment
  const getSegmentName = (
    segment: string,
    index: number,
    segments: string[],
  ) => {
    // If it's a known route name, use the mapped value
    if (routeNames[segment]) {
      return routeNames[segment];
    }

    // Special handling for dynamic IDs
    const segmentIndex = pathSegments.indexOf(segment);
    const prevSegment = segmentIndex > 0 ? pathSegments[segmentIndex - 1] : "";

    // Check if it's a Project ID
    if (prevSegment === "projects") {
      return "Project Detail";
    }

    // Check if it's a Task ID (can be in /tasks/[taskId] or /board/tasks/[taskId])
    if (prevSegment === "tasks") {
      return "Tasks";
    }

    // Check if it's a Chat ID
    if (prevSegment === "chat") {
      const session = supportChats?.find((s) => String(s.id) === String(segment));
      return session?.title || "Chat Detail";
    }

    // Default: capitalize and replace hyphens/underscores
    return segment
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (pathSegments.length === 0) return null;

  return (
    <Breadcrumb className="mb-4 overflow-hidden">
      <BreadcrumbList className="flex-nowrap overflow-x-auto no-scrollbar pb-1 -mb-1">
        <BreadcrumbItem className="shrink-0 font-semibold">
          <BreadcrumbLink asChild>
            <Link
              href={homeHref}
              className="hover:text-slate-600 transition-colors"
            >
              Home
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {filteredSegments.map((segment, index) => {
          // Calculate href based on the original path segments to ensure valid routing
          const segmentIndexInOriginal = pathSegments.indexOf(segment);
          let href = `/${pathSegments.slice(0, segmentIndexInOriginal + 1).join("/")}`;
          if (href === "/user/chat") {
            href = "/user/history";
          }
          const isLast = index === filteredSegments.length - 1;
          const name = getSegmentName(segment, index, filteredSegments);

          return (
            <React.Fragment key={href}>
              <BreadcrumbSeparator className="shrink-0" />
              <BreadcrumbItem
                className={`${isLast ? "" : "shrink-0"} font-semibold`}
              >
                {isLast ? (
                  <BreadcrumbPage className="truncate max-w-[120px] sm:max-w-[200px] font-bold text-slate-800">
                    {name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={href}
                      className="hover:text-slate-600 transition-colors truncate max-w-[80px] sm:max-w-none"
                    >
                      {name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
