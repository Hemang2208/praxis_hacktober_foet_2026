"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  // CheckSquare,
  GitBranch,
  BarChart3,
  // Award,
  Settings,
  HelpCircle,
  FolderKanban,
  // BookOpen,
  User,
  ChevronLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";

type SidebarSection = {
  title: string;
  items: {
    title: string;
    icon: React.ElementType;
    href: string;
    badge?: string;
  }[];
};

function useProjectCount() {
  const [count, setCount] = React.useState<number | null>(null);
  React.useEffect(() => {
    fetch("/api/project/project-count")
      .then((res) => res.json())
      .then((data) => setCount(data.createdCount ?? null))
      .catch(() => setCount(null));
  }, []);
  return count;
}

const sidebarSections = (projectCount: number | null): SidebarSection[] => [
  {
    title: "MAIN",
    items: [
      {
        title: "Overview",
        icon: LayoutDashboard,
        href: "/college",
      },
      {
        title: "Projects",
        icon: FolderKanban,
        href: "/college/projects",
        badge: projectCount !== null ? String(projectCount) : undefined,
      },
      {
        title: "Cohorts",
        icon: User,
        href: "/college/cohorts",
      },
      // {
      //   title: "Tasks",
      //   icon: CheckSquare,
      //   href: "/college/tasks",
      //   badge: "5",
      // },
    ],
  },
  //{
  //  title: "LEARNING",
  //  items: [
  //    {
  //      title: "Learning Paths",
  //      icon: BookOpen,
  //      href: "/college/learning",
  //    },
  //    {
  //      title: "Certificates",
  //      icon: Award,
  //      href: "/college/certificates",
  //    },
  //  ],
  //},
  {
    title: "INSIGHTS",
    items: [
      {
        title: "Analytics",
        icon: BarChart3,
        href: "/college/analytics",
      },
      {
        title: "GitHub",
        icon: GitBranch,
        href: "/college/github",
      },
    ],
  },
  {
    title: "USER",
    items: [
      {
        title: "Profile",
        icon: User,
        href: "/college/profile/personal",
      },
      {
        title: "Settings",
        icon: Settings,
        href: "/college/settings/notifications",
      },
      {
        title: "Help",
        icon: HelpCircle,
        href: "/college/help",
      },
    ],
  },
];

export function DashboardSidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  headerToggleRef,
}: {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileOpen?: boolean;
  setIsMobileOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  headerToggleRef?: React.RefObject<HTMLButtonElement>;
}) {
  const projectCount = useProjectCount();
  const pathname = usePathname();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        if (setIsMobileOpen) setIsMobileOpen(false);
      }
    };
    if (isMobileOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileOpen, setIsMobileOpen]);

  // Focus trap for mobile drawer
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isMobileOpen) return;
    prevFocusRef.current =
      headerToggleRef && headerToggleRef.current
        ? headerToggleRef.current
        : (document.activeElement as HTMLElement | null);
    setTimeout(() => {
      if (closeButtonRef.current) closeButtonRef.current.focus();
    }, 0);

    const handleTab = (e: KeyboardEvent) => {
      if (!panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isMobileOpen, headerToggleRef]);

  React.useEffect(() => {
    if (isMobileOpen) return;
    setTimeout(() => {
      if (headerToggleRef && headerToggleRef.current) {
        headerToggleRef.current.focus();
      } else if (prevFocusRef.current) {
        prevFocusRef.current.focus();
      }
    }, 0);
  }, [isMobileOpen, headerToggleRef]);

  return (
    <>
      {/* Large screen static sidebar */}
      <div className="hidden lg:block h-screen fixed z-50">
        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-5 bottom-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
          onClick={() => {
            setIsCollapsed(!isCollapsed);
          }}
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft className="text-[2rem]" />
          </motion.div>
        </Button>

        {/* Sidebar will now take full height of its parent and scroll with the page */}
        <TooltipProvider delayDuration={100}>
          <motion.div
            initial={{ width: 260 }}
            animate={{
              width: isCollapsed ? 72 : 260,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="relative border-r bg-background/80 backdrop-blur-sm h-full"
          >
            {/* Logo */}
            <div className="flex h-17 items-center border-b px-4">
              <Link href="/college" className="flex items-center gap-2">
                {/* <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 p-2"> */}
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                {/* </div> */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="text-lg font-semibold text-foreground"
                    >
                      Kiyo
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </div>

            {/* Navigation */}
            <div className="flex flex-col gap-4 p-4">
              {sidebarSections(projectCount).map((section) => (
                <div key={section.title} className="flex flex-col gap-1">
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <h3 className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {section.title}
                        </h3>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <Tooltip key={item.href} delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "group relative flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                            // onClick={() => setCurrPage(item.title)}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeNavIndicator"
                                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary"
                              />
                            )}
                            <item.icon
                              className={cn(
                                "h-[18px] w-[18px] transition-all",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground",
                              )}
                            />
                            <AnimatePresence>
                              {!isCollapsed && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.15 }}
                                  className="ml-3 flex flex-1 items-center justify-between"
                                >
                                  <span>{item.title}</span>
                                  {item.badge && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                      {item.badge}
                                    </span>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className={cn(!isCollapsed && "hidden")}
                        >
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </TooltipProvider>
      </div>

      {/* Mobile overlay drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
          />

          {/* Slide-in panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            ref={panelRef}
            id="main-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0D0D0F] h-full border-r border-zinc-200 dark:border-[#26272B] flex flex-col justify-between shadow-2xl z-10"
          >
            <div className="flex flex-col flex-1 overflow-y-auto hide-scrollbar">
              <div className="flex h-14 items-center border-b border-zinc-100 dark:border-[#26272B] px-4 shrink-0 justify-between">
                <Link href="/college" className="flex items-center gap-2">
                  <Image
                    src="/KiyoLogoBnoBG.png"
                    alt="Logo"
                    width={28}
                    height={28}
                    className="object-fit dark:hidden"
                  />
                  <Image
                    src="/KiyoLogoWnoBG.png"
                    alt="Logo"
                    width={28}
                    height={28}
                    className="object-fit hidden dark:block"
                  />
                  <span className="text-xl font-bold text-zinc-900 dark:text-[#F5F5F5]">
                    Kiyo
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-[#17181C]"
                  onClick={() => {
                    if (setIsMobileOpen) setIsMobileOpen(false);
                  }}
                  ref={closeButtonRef}
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4 text-zinc-500 dark:text-[#7A7A80]" />
                </Button>
              </div>

              <div className="space-y-6 px-3 py-4">
                {sidebarSections(projectCount).map((section) => (
                  <div key={section.title} className="space-y-1">
                    <h4 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-[#7A7A80]">
                      {section.title}
                    </h4>
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group relative flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-zinc-200 dark:bg-[#17181C] text-zinc-950 dark:text-[#F5F5F5] font-semibold"
                              : "text-zinc-600 dark:text-[#B3B3B8] hover:text-zinc-950 dark:hover:text-[#F5F5F5] hover:bg-zinc-100 dark:hover:bg-[#17181C]",
                          )}
                          onClick={() => {
                            if (setIsMobileOpen) setIsMobileOpen(false);
                          }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeNavIndicatorMobile"
                              className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-zinc-950 dark:bg-[#16A34A]"
                            />
                          )}
                          <item.icon
                            className={cn(
                              "h-[18px] w-[18px] transition-all",
                              isActive
                                ? "text-zinc-950 dark:text-[#16A34A]"
                                : "text-zinc-400 dark:text-[#7A7A80] group-hover:text-zinc-900 dark:group-hover:text-[#F5F5F5]",
                            )}
                          />
                          <div className="ml-3 flex flex-1 items-center justify-between">
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 dark:bg-[#17181C] dark:border dark:border-[#26272B] text-xs font-bold text-zinc-900 dark:text-[#F5F5F5]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
