"use client";

import React, { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface AssignedMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  image_url?: string;
  profile_picture?: string;
}

interface AssignedMembersAvatarsProps {
  assignedMembers: AssignedMember[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showNames?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const textSizeClasses = {
  sm: "text-[8px]",
  md: "text-xs",
  lg: "text-sm",
};

const safeName = (name: unknown): string => {
  if (typeof name === "string") return name;
  return "";
};

export function AssignedMembersAvatars({
  assignedMembers,
  maxVisible = 3,
  size = "md",
  showNames = false,
  className = "",
}: AssignedMembersAvatarsProps) {
  const { visibleMembers, hiddenCount } = useMemo(() => {
    if (assignedMembers.length <= maxVisible) {
      return { visibleMembers: assignedMembers, hiddenCount: 0 };
    }
    return {
      visibleMembers: assignedMembers.slice(0, maxVisible),
      hiddenCount: assignedMembers.length - maxVisible,
    };
  }, [assignedMembers, maxVisible]);

  if (assignedMembers.length === 0) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Users className={`${sizeClasses[size]} text-slate-400`} />
        <span className={`${textSizeClasses[size]} text-slate-400`}>
          Unassigned
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center ${className}`}>
        {/* Avatar Group */}
        <div className="flex -space-x-1 items-center">
          {visibleMembers.map((member, index) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <Avatar
                  className={`${sizeClasses[size]} border-2 border-white dark:border-slate-800 hover:z-10 cursor-pointer transition-transform hover:scale-110`}
                  style={{ zIndex: visibleMembers.length - index }}
                >
                  <AvatarImage
                    src={
                      member.profile_picture ||
                      member.image_url ||
                      member.avatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        safeName(member.name) || member.id || "",
                      )}`
                    }
                    alt={safeName(member.name) || member.id}
                  />
                  <AvatarFallback
                    className={`${textSizeClasses[size]} bg-indigo-100 text-indigo-700 font-medium`}
                  >
                    {(safeName(member.name) || member.id || "")
                      .toString()
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-center">
                  <p className="font-medium">{safeName(member.name)}</p>
                  {member.email && (
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Show overflow indicator */}
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={`${sizeClasses[size]} min-w-fit px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer`}
                >
                  <span className={textSizeClasses[size]}>+{hiddenCount}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">Additional members:</p>
                  {assignedMembers.slice(maxVisible).map((member) => (
                    <p key={member.id} className="text-sm">
                      {safeName(member.name)}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Optional names display */}
        {showNames && assignedMembers.length > 0 && (
          <div className="ml-2 flex flex-col">
            {assignedMembers.length === 1 ? (
              <span
                className={`${textSizeClasses[size]} text-slate-700 dark:text-slate-300 font-medium`}
              >
                {safeName(assignedMembers[0].name)}
              </span>
            ) : (
              <span
                className={`${textSizeClasses[size]} text-slate-700 dark:text-slate-300 font-medium`}
              >
                {assignedMembers.length} members
              </span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface ProjectMember {
  _id?: string;
  user?: string;
  name?: string;
  email?: string;
  avatar?: string;
  image_url?: string;
  profile_picture?: string;
  role?: string;
}

// Utility function to parse assigned_to string and convert to member objects
export function parseAssignedMembers(
  assigned_toString: string | null | undefined,
  projectMembers: ProjectMember[] = [],
): AssignedMember[] {
  if (!assigned_toString) return [];

  // Split by common separators (comma, semicolon, pipe)
  const memberIds = assigned_toString
    .split(/[,;|]/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return memberIds.map((memberId) => {
    // Try to find the member in project members
    const projectMember = projectMembers.find(
      (member) => member.user === memberId || member._id === memberId,
    );

    if (projectMember) {
      return {
        id: String(projectMember.user || projectMember._id || ""),
        name: typeof projectMember.name === "string" ? projectMember.name : "Unknown User",
        email: typeof projectMember.email === "string" ? projectMember.email : undefined,
        avatar:
          typeof projectMember.avatar === "string" ? projectMember.avatar :
          typeof projectMember.image_url === "string" ? projectMember.image_url :
          typeof projectMember.profile_picture === "string" ? projectMember.profile_picture :
          undefined,
        image_url: typeof projectMember.image_url === "string" ? projectMember.image_url : undefined,
        profile_picture: typeof projectMember.profile_picture === "string" ? projectMember.profile_picture : undefined,
      };
    }

    // Fallback if member not found in project
    return {
      id: memberId,
      name: `User ${memberId.slice(-4)}`,
      email: undefined,
      avatar: undefined,
    };
  });
}
