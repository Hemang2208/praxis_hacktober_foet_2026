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
  HelpCircle,
  FolderKanban,
  // BookOpen,
  User,
  ChevronLeft,
  X,
  ExternalLink,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { useUser } from "@/hooks/useUser";

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

// Dynamic sidebar sections based on user role
const getSidebarSections = (
  userRole: string | null,
  projectCount: number | null,
  companyId: string | null,
): SidebarSection[] => {
  const basePath = userRole === "college" ? "/college" : "/dashboard";

  const sections: SidebarSection[] = [
    {
      title: "MAIN",
      items: [
        {
          title: "Overview",
          icon: LayoutDashboard,
          href: basePath,
        },
        {
          title: "Projects",
          icon: FolderKanban,
          href: `${basePath}/projects`,
          badge: projectCount !== null ? String(projectCount) : undefined,
        },
      ],
    },
    {
      title: "INSIGHTS",
      items: [
        {
          title: "GitHub",
          icon: GitBranch,
          href: `${basePath}/github`,
        },
      ],
    },
    {
      title: "USER",
      items: [
        {
          title: "Profile",
          icon: User,
          href: `${basePath}/profile/personal`,
        },
      ],
    },
  ];

  // Add "Company Page" link for company users
  if (userRole === "company" && companyId) {
    sections[0].items.push({
      title: "Company Page",
      icon: ExternalLink,
      href: `/company/${companyId}`,
    });
  }

  return sections;
};

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
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const projectCount = useProjectCount();
  const pathname = usePathname();
  const isUserRoute = pathname.startsWith("/user");

  const { mongoUser } = useUser();
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "GET" });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const name = mongoUser?.full_name || mongoUser?.name || "User";
  const email = mongoUser?.email || "";
  const avatarUrl = mongoUser?.profile_picture || mongoUser?.image_url;
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  // Fetch user role and company ID for dynamic navigation
  React.useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role || null);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    const fetchCompanyId = async () => {
      try {
        const response = await fetch("/api/auth/profile", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user?.role === "company" && data.user?._id) {
            setCompanyId(data.user._id);
          }
        }
      } catch (error) {
        console.error("Error fetching company ID:", error);
      }
    };

    fetchUserRole();
    fetchCompanyId();
  }, []);

  const sidebarSections = getSidebarSections(userRole, projectCount, companyId);

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
      <div className="hidden lg:block h-screen fixed top-0 z-30">
        {/* Sidebar will now take full height of its parent and scroll with the page */}
        <TooltipProvider delayDuration={100}>
          <motion.div
            initial={{ width: 256 }}
            animate={{
              width: isCollapsed ? 72 : 256,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="relative border-r bg-background/80 backdrop-blur-sm h-full flex flex-col justify-between"
          >
            {/* Top Section: Logo & Toggle button */}
            <div className="flex flex-col flex-1 overflow-y-auto hide-scrollbar">
              <div className="flex h-14 items-center justify-between px-4 shrink-0">
                <Link href={isUserRoute ? "/user" : "/dashboard"} className={cn("flex items-center gap-2", isCollapsed && "mx-auto")}>
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
                  {!isCollapsed && (
                    <span className="text-xl font-semibold text-foreground">
                      Praxis
                    </span>
                  )}
                </Link>
                
                {!isCollapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-accent text-zinc-500 hover:text-zinc-950 shrink-0"
                    onClick={() => setIsCollapsed(true)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-4 p-4">
                {sidebarSections.map((section) => (
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
            </div>

            {/* Bottom Section: Profile Details */}
            <div className="flex flex-col border-t border-zinc-100 dark:border-zinc-800/80 pt-2 pb-2 bg-background/95 relative shrink-0">
              {isCollapsed ? (
                // Collapsed View: Just Avatar with DropdownMenu
                <div className="flex flex-col items-center py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm shrink-0 overflow-hidden hover:ring-2 hover:ring-indigo-500 dark:hover:ring-indigo-400 transition-all"
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          initials
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right" sideOffset={12} className="w-48">
                      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{name}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{email}</div>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link href={isUserRoute ? "/user/profile/personal" : "/dashboard/profile/personal"} className="flex items-center gap-2 cursor-pointer">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span>View Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5 shrink-0" />
                        <span>Log Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                // Expanded View: Full profile details + Dropdown
                <div className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {name}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        {email}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors data-[state=open]:bg-zinc-100 dark:data-[state=open]:bg-zinc-800">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={isUserRoute ? "/user/profile/personal" : "/dashboard/profile/personal"} className="flex items-center gap-2 cursor-pointer">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span>View Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5 shrink-0" />
                        <span>Log Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-3 z-40 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent cursor-pointer"
                onClick={() => {
                  setIsCollapsed(false);
                }}
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            )}
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
            {/* Top section: Logo + Navigation list */}
            <div className="flex flex-col flex-1 overflow-y-auto hide-scrollbar">
              <div className="flex h-14 items-center border-b border-zinc-100 dark:border-[#26272B] px-4 shrink-0 justify-between">
                <Link href={isUserRoute ? "/user" : "/dashboard"} className="flex items-center gap-2">
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
                    Praxis
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
                {sidebarSections.map((section) => (
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

            {/* Bottom section: Mobile profile row */}
            <div className="flex flex-col border-t border-zinc-100 dark:border-[#26272B] pt-2 pb-2 bg-white dark:bg-[#0D0D0F] relative shrink-0">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-[#17181C] transition-colors duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {name}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-[#71717A] truncate">
                      {email}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#17181C] flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-[#F5F5F5] transition-colors data-[state=open]:bg-zinc-100 dark:data-[state=open]:bg-[#17181C]">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={isUserRoute ? "/user/profile/personal" : "/dashboard/profile/personal"} onClick={() => { if (setIsMobileOpen) setIsMobileOpen(false); }} className="flex items-center gap-2 cursor-pointer">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>View Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
