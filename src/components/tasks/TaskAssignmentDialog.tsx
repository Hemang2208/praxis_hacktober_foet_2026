"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { assignUserToTask } from "@/redux/slice/task.slice";
import { setSelectedProject } from "@/redux/slice/project.slice";
import {
  createSupportAgentTask,
  formatSupportAgentTask,
} from "@/lib/support-agent";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";

interface TaskAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task_id: string;
  taskTitle: string;
  project_id: string;
  currentAssignee?: string;
}

interface UnifiedMember {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  avatar?: string;
  image_url?: string;
  profile_picture?: string;
  role?: string;
  hasuser_id?: boolean;
}

export function TaskAssignmentDialog({
  open,
  onOpenChange,
  task_id,
  taskTitle,
  project_id,
  currentAssignee,
}: TaskAssignmentDialogProps) {
  const dispatch = useAppDispatch();
  const { currentProject, projects } = useAppSelector((state) => state.project);
  const { loading: taskLoading } = useAppSelector((state) => state.task);

  const [selecteduser_id, setSelecteduser_id] = useState<string>(
    currentAssignee || "",
  );
  const [notes, setNotes] = useState<string>("");
  const [agentMembers, setAgentMembers] = useState<UnifiedMember[] | null>(
    null,
  );

  const isValidObjectId = React.useCallback((value?: string) => {
    return /^[a-fA-F0-9]{24}$/.test(String(value || ""));
  }, []);

  // Get team members from current project or find project by ID as fallback
  const targetProject =
    currentProject || projects.find((p) => p._id === project_id);

  // Use team members directly from Redux store as fallback
  const team_members = targetProject?.team_members || [];

  // Normalize project team members
  const membersFromProject: UnifiedMember[] = team_members.map((member) => ({
    id: member.user || member.email || `member-${team_members.indexOf(member)}`,
    user_id: member.user || undefined,
    name: member.name || "Project Member",
    email: member.email || "",
    avatar: member.profile_picture || member.image_url || member.avatar || "",
    image_url: member.image_url || "",
    profile_picture: member.profile_picture || "",
    role: member.role || "Member",
    hasuser_id: isValidObjectId(member.user),
  }));

  // Fetch members from the task-management agent when dialog opens (best-effort)
  useEffect(() => {
    let mounted = true;
    const fetchAgentMembers = async () => {
      if (!open || !project_id) return;
      try {
        const res = await fetch(
          `/api/project/${encodeURIComponent(project_id)}/members?t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          },
        );
        if (!res.ok) {
          if (mounted) setAgentMembers([]);
          return;
        }
        const json = await res.json().catch(() => null);
        if (!json) {
          if (mounted) setAgentMembers([]);
          return;
        }

        const rawMembers = Array.isArray(json) ? json : json.members || [];

        const isAgentRaw = (v: unknown): v is Record<string, unknown> => {
          return !!v && typeof v === "object";
        };

        const normalized: UnifiedMember[] = (rawMembers || []).map(
          (m: unknown, idx: number) => {
            if (!isAgentRaw(m)) {
              return {
                id: `agent-${idx}`,
                name: "Project Member",
                email: "",
                avatar: "",
                role: "Member",
                hasuser_id: false,
              } as UnifiedMember;
            }

            const rec = m as Record<string, unknown>;
            const user_id =
              (typeof rec.user_id === "string" && rec.user_id) ||
              (typeof rec.user === "string" && rec.user) ||
              undefined;
            const id =
              user_id ||
              (typeof rec.email === "string" && rec.email) ||
              `agent-${idx}`;
            const name =
              (typeof rec.name === "string" && rec.name) ||
              (typeof rec.full_name === "string" && rec.full_name) ||
              (typeof rec.displayName === "string" && rec.displayName) ||
              (typeof rec.email === "string" && rec.email) ||
              "Project Member";
            const email = typeof rec.email === "string" ? rec.email : "";
            const avatar = (typeof rec.avatar === "string" && rec.avatar) || "";
            const image_url =
              (typeof rec.image_url === "string" && rec.image_url) ||
              (typeof rec.image_url === "string" && rec.image_url) ||
              "";
            const profile_picture =
              (typeof rec.profile_picture === "string" &&
                rec.profile_picture) ||
              (typeof rec.profile_picture === "string" &&
                rec.profile_picture) ||
              (typeof rec.avatar_url === "string" && rec.avatar_url) ||
              "";
            const role =
              (typeof rec.role === "string" && rec.role) ||
              (typeof rec.roleName === "string" && rec.roleName) ||
              "Member";
            const hasuser_id = isValidObjectId(user_id);

            // Implement priority: avatar || image_url || profile_picture
            const prioritizedAvatar = avatar || image_url || profile_picture;

            return {
              id,
              user_id,
              name,
              email,
              avatar: prioritizedAvatar,
              image_url,
              profile_picture,
              role,
              hasuser_id,
            };
          },
        );

        if (mounted) setAgentMembers(normalized);
      } catch (e) {
        console.warn("Failed to fetch agent members:", e);
        if (mounted) setAgentMembers([]);
      }
    };

    fetchAgentMembers();
    return () => {
      mounted = false;
    };
  }, [open, project_id, isValidObjectId]);

  // Prefer agent-provided members when available, otherwise fall back
  const members: UnifiedMember[] =
    agentMembers && agentMembers.length > 0 ? agentMembers : membersFromProject;
  const assignableMembers = React.useMemo(
    () => members.filter((m) => Boolean(m.user_id && m.hasuser_id)),
    [members],
  );

  useEffect(() => {
    if (!selecteduser_id) return;
    const isStillAssignable = assignableMembers.some(
      (m) => m.user_id === selecteduser_id,
    );
    if (!isStillAssignable) {
      setSelecteduser_id("");
    }
  }, [assignableMembers, selecteduser_id]);

  // Set current project if not already set
  useEffect(() => {
    if (open && project_id && !currentProject && projects.length > 0) {
      const foundProject = projects.find((p) => p._id === project_id);
      if (foundProject) {
        dispatch(setSelectedProject(project_id));
      }
    }
  }, [open, project_id, currentProject, projects, dispatch]);

  const handleAssign = async () => {
    if (!selecteduser_id) {
      toast.error("Please select a user to assign");
      return;
    }

    console.log("Assignment Debug Info:");
    console.log("Task ID:", task_id);
    console.log("Project ID:", project_id);
    console.log("Selected User ID:", selecteduser_id);
    console.log("Target Project:", targetProject);
    console.log("All Members:", members);
    console.log(
      "Selected Member Details:",
      members.find((m) => m.id === selecteduser_id),
    );

    // Check if the selected member has a valid user ID
    const selectedMember = assignableMembers.find(
      (m) => m.user_id === selecteduser_id,
    );
    if (!selectedMember?.hasuser_id) {
      toast.error(
        "Cannot assign task: Selected member does not have a valid user ID. They need to join the project properly.",
      );
      return;
    }

    try {
      // Use the selecteduser_id directly (it's already the proper user ID)
      await dispatch(
        assignUserToTask({
          task_id,
          user_id: selecteduser_id,
          notes: notes.trim() || undefined,
        }),
      ).unwrap();

      // Also call the support-agent API to create a task for the user (non-blocking)
      const supportAgentTaskData = formatSupportAgentTask(
        taskTitle,
        notes.trim(),
        "medium",
      );
      createSupportAgentTask(selecteduser_id, supportAgentTaskData).catch(
        () => {
          // Silently fail - support-agent is optional
        },
      );

      // NOTE: Skip immediate fetchProjectBoard to avoid race condition where
      // backend hasn't processed status update yet. Local Redux state is already
      // updated correctly by assignUserToTask.fulfilled reducer, which:
      // 1. Moves task to new status column in projectBoard
      // 2. Updates task status in tasks array
      // Refetching now can revert the UI if backend is still processing the update.
      // The board will show the correct state once backend catches up, or user
      // can refresh if needed. For now, defer the refetch until next scheduled fetch.

      toast.success("Task assigned successfully!");
      onOpenChange(false);
      setNotes("");
      setSelecteduser_id("");
    } catch (error) {
      console.error("Assignment error:", error);
      let errorMessage = "Failed to assign task";

      if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = (error as { message: string }).message;
      }

      if (errorMessage.toLowerCase().includes("not a member")) {
        try {
          const res = await fetch(
            `/api/project/${encodeURIComponent(project_id)}/members?t=${Date.now()}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const json = await res.json().catch(() => null);
            const refreshed = Array.isArray(json)
              ? json
              : Array.isArray(json?.members)
                ? json.members
                : [];

            const normalized: UnifiedMember[] = refreshed.map(
              (m: Record<string, unknown>, idx: number) => {
                const user_id =
                  (typeof m.user_id === "string" && m.user_id) ||
                  (typeof m.user === "string" && m.user) ||
                  undefined;
                return {
                  id:
                    user_id ||
                    (typeof m.email === "string" && m.email) ||
                    `agent-${idx}`,
                  user_id,
                  name:
                    (typeof m.name === "string" && m.name) ||
                    (typeof m.full_name === "string" && m.full_name) ||
                    "Project Member",
                  email: typeof m.email === "string" ? m.email : "",
                  avatar:
                    (typeof m.avatar === "string" && m.avatar) ||
                    (typeof m.image_url === "string" && m.image_url) ||
                    (typeof m.profile_picture === "string" &&
                      m.profile_picture) ||
                    "",
                  image_url:
                    (typeof m.image_url === "string" && m.image_url) || "",
                  profile_picture:
                    (typeof m.profile_picture === "string" &&
                      m.profile_picture) ||
                    "",
                  role: typeof m.role === "string" ? m.role : "Member",
                  hasuser_id: isValidObjectId(user_id),
                };
              },
            );
            setAgentMembers(normalized);
          }
        } catch (refreshError) {
          console.warn(
            "Failed to refresh members after assignment error",
            refreshError,
          );
        }
      }

      toast.error(errorMessage);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[min(95vw,520px)] rounded-l-xl border-l border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-sm duration-300">
        <DrawerHeader>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 pt-6 pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <DrawerTitle className="text-lg">Assign Task</DrawerTitle>
                <DrawerDescription className="text-slate-600">
                  Assign &quot;{taskTitle}&quot; to a project member. Only one
                  user can be assigned per task.
                </DrawerDescription>
              </div>
            </div>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Close drawer"
              >
                ✕
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="grid gap-4 px-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="assignee">Select Assignee</Label>
            {members.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground border rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="font-medium">No project members found</p>
                <p className="text-xs mt-1">
                  Users need to join the project first to be assignable to
                  tasks.
                </p>
              </div>
            ) : assignableMembers.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground border rounded-lg border-orange-200">
                <Users className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                <p className="font-medium text-orange-600">
                  No assignable members found
                </p>
                <p className="text-xs mt-1">
                  Project has {members.length} member(s), but none have valid
                  user IDs. Members need to properly join the project to be
                  assignable.
                </p>
              </div>
            ) : (
              <Select
                value={selecteduser_id}
                onValueChange={setSelecteduser_id}
              >
                <SelectTrigger className="min-h-[60px]">
                  <SelectValue placeholder="Choose a team member">
                    {selecteduser_id && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const selectedMember = assignableMembers.find(
                            (m) => m.user_id === selecteduser_id,
                          );
                          if (!selectedMember) return "Choose a team member";

                          const memberName =
                            selectedMember.name || "Project Member";
                          const memberEmail = selectedMember.email || "";
                          const memberRole = selectedMember.role || "Member";

                          return (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={
                                    selectedMember.avatar ||
                                    selectedMember.image_url ||
                                    selectedMember.profile_picture
                                  }
                                  alt={memberName}
                                />
                                <AvatarFallback className="text-xs">
                                  {memberName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-medium">
                                  {memberName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {memberEmail || memberRole}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((member) => {
                    const memberName = member.name || "Project Member";
                    const memberEmail = member.email || "";
                    const memberRole = member.role || "Member";
                    const memberKey = member.user_id || member.id;

                    return (
                      <SelectItem
                        key={memberKey}
                        value={memberKey}
                        className="min-h-[60px]"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={
                                member.avatar ||
                                member.image_url ||
                                member.profile_picture ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${memberName}`
                              }
                              alt={memberName}
                            />
                            <AvatarFallback className="text-xs">
                              {memberName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">
                              {memberName}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              {memberEmail && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {memberEmail}
                                </span>
                              )}
                              <span className="text-xs text-blue-600 font-medium">
                                {memberRole}
                              </span>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific instructions or context for this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {currentAssignee && (
            <div className="text-sm text-amber-600 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <strong>Reassignment Notice:</strong> This task is currently
              assigned to another user. Selecting a new assignee will replace
              the current assignment. Each task can only have one assignee at a
              time.
            </div>
          )}
        </div>

        <DrawerFooter className="border-t border-slate-100 px-6 pb-6 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={taskLoading.assignUserToTask}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !selecteduser_id ||
              taskLoading.assignUserToTask ||
              members.length === 0
            }
          >
            {taskLoading.assignUserToTask ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              "Assign Task"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
