"use client";

import React, { useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Menu,
  X,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/sidebar-2";
import { DashboardSidebar as UserSidebar } from "@/components/user/sidebar-2";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { useSessionFetchCache } from "@/hooks/useSessionFetchCache";
import { DynamicBreadcrumbs } from "@/components/layout/DynamicBreadcrumbs";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNotifications } from "@/hooks/useNotifications";
import Image from "next/image";
import Link from "next/link";
import { useAppSelector } from "@/redux/hooks";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell — The 3-panel Developer OS layout.
 *
 * ┌────────────┬──────────────────────────┬───────────────┐
 * │  LEFT      │   CENTER                 │  RIGHT        │
 * │  SIDEBAR   │   (Agent or Page)        │  SIDEBAR      │
 * │  (Nav)     │                          │  (Agent Panel)│
 * └────────────┴──────────────────────────┴───────────────┘
 *
 * - Left sidebar = existing navigation (Overview, Projects, GitHub, etc.)
 * - Right sidebar = Agent chat history (managed by SupportAgentChat)
 * - Center = Page content (children) when on a dashboard page
 *
 * Mutual exclusion: on mobile, only one sidebar can be open at a time.
 */
// Sidebar State Shared Context
export interface SidebarContextType {
  leftSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (val: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (val: boolean) => void;
}

export const SidebarContext = React.createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export default function AppShell({ children }: AppShellProps) {
  useSessionFetchCache();

  const pathname = usePathname();
  const supportChats = useAppSelector((state) => state.supportChat?.sessions);

  // Sidebar states (Mutually exclusive coordinates)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const headerToggleRef = useRef<HTMLButtonElement | null>(null);

  // Manage mutual exclusion
  const handleSetLeftSidebarCollapsed = (collapsed: boolean) => {
    setLeftSidebarCollapsed(collapsed);
    // If we expand the navigation (not collapsed), we hide the history sidebar
    if (!collapsed) {
      setRightSidebarOpen(false);
    }
  };

  const handleSetRightSidebarOpen = (open: boolean) => {
    setRightSidebarOpen(open);
    // If we open the history sidebar, we collapse the navigation sidebar to icon-only (72px)
    if (open) {
      setLeftSidebarCollapsed(true);
    }
  };

  // Detect specific route types
  const isTaskDetailRoute =
    pathname.startsWith("/dashboard/tasks/") ||
    pathname.includes("/board/tasks/");
  const isBoardRoute = pathname.includes("/board");
  const isFullBleedRoute = isTaskDetailRoute || isBoardRoute;

  // Determine if we're on the base dashboard route (show agent as primary)
  const isDashboardRoot = pathname === "/dashboard" || pathname === "/user" || pathname === "/college";

  const isUserRoute = pathname.startsWith("/user");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return;

      const basePath = isUserRoute ? "/user" : "/dashboard";

      if (query.includes("project")) {
        router.push(`${basePath}/projects`);
      } else if (query.includes("task")) {
        router.push(`${basePath}/tasks`);
      } else if (query.includes("github")) {
        router.push(`${basePath}/github`);
      } else if (query.includes("profile")) {
        router.push(`${basePath}/profile/personal`);
      } else if (query.includes("settings") || query.includes("billing")) {
        router.push(`${basePath}/settings`);
      } else if (query.includes("overview") || query.includes("dashboard") || query.includes("home")) {
        router.push(basePath);
      } else if (query.includes("analytics") || query.includes("progress")) {
        router.push(`${basePath}/analytics`);
      } else if (query.includes("learning")) {
        router.push(`${basePath}/learning`);
      } else if (query.includes("certificate") || query.includes("certification")) {
        router.push(`${basePath}/certifications`);
      }

      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  };

  const getPageName = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return "Overview";
    
    const lastSegment = segments[segments.length - 1];
    const isRoot = segments.length === 1 && (lastSegment === "dashboard" || lastSegment === "user" || lastSegment === "college" || lastSegment === "company");
    if (isRoot) return "Overview";

    const chatIndex = segments.indexOf("chat");
    if (chatIndex !== -1) {
      if (chatIndex < segments.length - 1) {
        const session = supportChats?.find(
          (s) => String(s.id) === String(lastSegment)
        );
        return session?.title || "Chat";
      }
      return "Chat";
    }
    
    for (const segment of segments) {
      if (segment === "projects") return "Projects";
      if (segment === "tasks") return "Tasks";
      if (segment === "profile") return "Profile";
      if (segment === "personal") return "Personal Information";
      if (segment === "education") return "Education";
      if (segment === "experience") return "Experience";
      if (segment === "career-preferences") return "Career & Preferences";
      if (segment === "notification-preferences") return "Notification Preferences";
      if (segment === "settings") return "Settings";
      if (segment === "github") return "GitHub Sync";
      if (segment === "connections") return "Connections";
      if (segment === "analytics" || segment === "progress") return "Progress";
      if (segment === "learning") return "Learning";
      if (segment === "certificates" || segment === "certifications") return "Certifications";
    }
    
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  };

  const pageName = getPageName(pathname);

  const SidebarComponent = isUserRoute ? UserSidebar : DashboardSidebar;

  // Notifications
  const {
    notifications,
    unreadCount,
    isLoading: notifLoading,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshNotifications,
  } = useNotifications();

  const contextValue = {
    leftSidebarCollapsed,
    setLeftSidebarCollapsed: handleSetLeftSidebarCollapsed,
    rightSidebarOpen,
    setRightSidebarOpen: handleSetRightSidebarOpen,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      <DashboardProvider>
        <TooltipProvider>
          <div className="h-screen bg-gray-50 dark:bg-[#09090B] flex flex-col overflow-hidden">
            {/* ── Top Bar ─────────────────────────────────────────── */}
            <header className={cn(
              "fixed top-0 right-0 z-50 h-14 bg-white/80 dark:bg-[#0C0C0E]/90 backdrop-blur-xl border-b border-transparent dark:border-[#1E1F23] flex items-center px-4 transition-all duration-300 ease-in-out left-0",
              leftSidebarCollapsed ? "lg:left-[72px]" : "lg:left-[256px]"
            )}>
              <div className="flex w-full items-center justify-between">
                {/* Left: Mobile menu + Page Name */}
                <div className="flex items-center gap-3">
                  {/* Mobile hamburger */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-9 w-9"
                    onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                    ref={headerToggleRef}
                    aria-label="Toggle menu"
                  >
                    {isMobileNavOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Dynamic Page Name */}
                  <span className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5] tracking-tight ml-2">
                    {pageName}
                  </span>
                </div>

                {/* Center: Search Bar */}
                <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-auto">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-[#52525B]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search anything..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full h-10 pl-10 pr-12 rounded-full border border-zinc-100 dark:border-[#1E1F23] bg-zinc-50/50 dark:bg-[#111214] text-sm text-zinc-900 dark:text-[#F5F5F5] placeholder-zinc-400 dark:placeholder-[#52525B] focus:outline-none focus:bg-white dark:focus:bg-[#17181C] focus:border-zinc-200 dark:focus:border-[#26272B] transition-all shadow-none"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-zinc-200/50 dark:bg-[#17181C] border dark:border-[#26272B] text-[10px] font-mono text-zinc-500 dark:text-[#71717A] select-none">
                      <span>⌘</span><span>K</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <NotificationDropdown
                    notifications={notifications}
                    unreadCount={unreadCount}
                    isLoading={notifLoading}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onDeleteNotifications={deleteNotifications}
                    onRefresh={refreshNotifications}
                  />
                </div>
              </div>
            </header>

            {/* ── Main Content Area ──────────────────────────────── */}
            <div className="flex flex-1 pt-14 overflow-hidden">
              {/* ── Left Sidebar (Navigation) ──────────────────── */}
              <SidebarComponent
                isCollapsed={leftSidebarCollapsed}
                setIsCollapsed={handleSetLeftSidebarCollapsed}
                isMobileOpen={isMobileNavOpen}
                setIsMobileOpen={setIsMobileNavOpen}
                headerToggleRef={headerToggleRef}
              />

              {/* ── Center Content ─────────────────────────────── */}
              <main
                className={cn(
                  "flex-1 transition-all duration-300 ease-in-out h-full overflow-hidden flex flex-col",
                  leftSidebarCollapsed
                    ? "lg:ml-[4.5rem]"
                    : "lg:ml-[16rem]",
                )}
              >
                <div
                  className={cn(
                    "flex-1 flex flex-col overflow-hidden min-h-0",
                    isTaskDetailRoute
                      ? "bg-white dark:bg-[#0C0C0E]"
                      : ""
                  )}
                >
                  <div className={cn(
                    "flex-1 flex flex-col min-h-0",
                    (isFullBleedRoute || isDashboardRoot) ? "p-0 overflow-hidden" : "p-4 md:p-6 overflow-y-auto"
                  )}>
                    {/* Breadcrumbs */}
                    {!isDashboardRoot && (
                      <div
                        className={
                          isFullBleedRoute ? "px-4 md:px-8 pt-4 md:pt-6" : ""
                        }
                      >
                        <DynamicBreadcrumbs />
                      </div>
                    )}
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </TooltipProvider>
      </DashboardProvider>
    </SidebarContext.Provider>
  );
}
