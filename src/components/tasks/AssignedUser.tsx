"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAssignedUser } from "@/hooks/useAssignedUser";

interface FallbackAssignee {
  id?: string;
  name?: string;
  avatar?: string;
  image_url?: string;
  profile_picture?: string;
}

interface AssignedUserProps {
  task_id?: string;
  // Accept either an object or a string id fallback
  fallback?: FallbackAssignee | string | null;
  size?: "sm" | "md" | "lg";
}

export function AssignedUser({
  task_id,
  fallback = null,
  size = "sm",
}: AssignedUserProps) {
  const { user } = useAssignedUser(task_id);

  let fallbackObj: FallbackAssignee | null = null;
  if (typeof fallback === "string") {
    fallbackObj = { id: fallback, name: `User ${fallback.slice(-4)}` };
  } else if (fallback && typeof fallback === "object") {
    fallbackObj = {
      id: fallback.id,
      name: fallback.name || (fallback as any).full_name || (fallback as any).displayName || "",
      avatar: fallback.avatar || fallback.image_url || fallback.profile_picture,
      image_url: fallback.image_url,
      profile_picture: fallback.profile_picture,
    };
  }

  const display = user || fallbackObj;

  const classes =
    size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10";

  if (!display) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        Unassigned
      </div>
    );
  }

  const safeStr = (val: unknown): string => (typeof val === "string" ? val : "");

  const isObjectId = (str?: string) => {
    if (!str) return false;
    return /^[0-9a-fA-F]{24}$/.test(str);
  };

  const rawName = safeStr(display.name);
  const hasName = Boolean(rawName) && !isObjectId(rawName);
  const displayName = hasName ? rawName : "Loading assignee...";
  const displayInitials = hasName
    ? rawName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "...";

  return (
    <div className="flex items-center gap-2">
      <Avatar className={`${classes}`}>
        <AvatarImage
          src={
            display.profile_picture ||
            display.image_url ||
            display.avatar ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              displayName || "",
            )}`
          }
          alt={displayName}
        />
        <AvatarFallback className="text-xs">
          {displayInitials}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-slate-700">{displayName}</span>
    </div>
  );
}

export default AssignedUser;
