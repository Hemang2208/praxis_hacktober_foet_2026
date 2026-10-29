"use client";

import useUserProfile from "@/hooks/useUserProfile";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function LogoutButton() {
  const { mongoUser } = useUserProfile();
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Determine if user is on dashboard side or user side
  const isDashboardSide =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin/dashboard");
  const isUserSide = pathname?.startsWith("/user");

  useEffect(() => {
    if (mongoUser) {
      if (mongoUser.profile_picture) {
        setAvatarUrl(mongoUser.profile_picture);
      } else if (mongoUser.image_url) {
        setAvatarUrl(mongoUser.image_url);
      } else {
        setAvatarUrl(undefined);
      }
    }
  }, [mongoUser]);

  const handleLogout = async () => {
    const { performLogout } = await import("@/lib/api-client");
    const { mutate } = await import("swr");
    await performLogout();
    mutate("/api/auth/current-user", null, false);
  };

  const navigate_to = (href: string) => {
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  // Context-aware navigation paths
  const getDashboardLink = () => {
    return isDashboardSide ? "/dashboard" : "/user";
  };

  const getProfileLink = () => {
    return isDashboardSide
      ? "/dashboard/profile/personal"
      : "/user/profile/personal";
  };

  const getNotificationsLink = () => {
    return isDashboardSide ? "/dashboard/notifications" : "/user/notifications";
  };

  const getSettingsLink = () => {
    return isDashboardSide
      ? "/dashboard/settings/notifications"
      : "/user/settings/notifications";
  };

  // Fallback initials for avatar
  const getInitials = () => {
    if (mongoUser?.full_name) {
      return mongoUser.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase();
    }
    return "U";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 px-2 gap-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="Profile" />
            ) : (
              <AvatarFallback>{getInitials()}</AvatarFallback>
            )}
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-32 truncate">
              {mongoUser?.full_name || "User"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 max-w-32 truncate">
              {mongoUser?.email || "Account"}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Profile" />
              ) : (
                <AvatarFallback>{getInitials()}</AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {mongoUser?.full_name || "User"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {mongoUser?.email || "No email"}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => navigate_to(getDashboardLink())}
          className="cursor-pointer rounded-md"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate_to(getProfileLink())}
          className="cursor-pointer rounded-md"
        >
          <User className="mr-2 h-4 w-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate_to(getNotificationsLink())}
          className="cursor-pointer rounded-md"
        >
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate_to(getSettingsLink())}
          className="cursor-pointer rounded-md"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          variant="destructive"
          className="cursor-pointer rounded-md"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
