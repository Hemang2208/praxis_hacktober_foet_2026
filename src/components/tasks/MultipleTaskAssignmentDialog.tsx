"use client";

import * as React from "react";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { assignUserToTask } from "@/redux/slice/task.slice";
import { fetchProjectMembers } from "@/redux/slice/project.slice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, X, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

interface MultipleTaskAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task_id: string;
  taskTitle: string;
  project_id: string;
  currentAssignee?: string;
}

export function MultipleTaskAssignmentDialog({
  open,
  onOpenChange,
  task_id,
  taskTitle,
  project_id,
  currentAssignee
}: MultipleTaskAssignmentDialogProps) {
  const dispatch = useAppDispatch();
  const { projectMembers, loading } = useAppSelector((state) => state.project);
  const { loading: taskLoading } = useAppSelector((state) => state.task);
  
  // Parse current assignees from string (comma-separated IDs)
  const currentAssigneeIds = React.useMemo(() => {
    if (!currentAssignee) return [];
    return currentAssignee.split(',').map(id => id.trim()).filter(id => id.length > 0);
  }, [currentAssignee]);

  const [selecteduser_ids, setSelecteduser_ids] = useState<string[]>(currentAssigneeIds);
  const [notes, setNotes] = useState<string>("");
  const [pendingSelection, setPendingSelection] = useState<string>("");

  // Fetch project members when dialog opens
  React.useEffect(() => {
    if (open && project_id) {
      dispatch(fetchProjectMembers(project_id));
    }
  }, [open, project_id, dispatch]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelecteduser_ids(currentAssigneeIds);
      setNotes("");
      setPendingSelection("");
    }
  }, [open, currentAssigneeIds]);

  const members = projectMembers || [];
  
  // Only include members who have a valid user ID
  const validMembers = members.filter(member => member.user);
  
  // Get available members (not already selected)
  const availableMembers = validMembers.filter(member => 
    !selecteduser_ids.includes(member.user)
  );

  // Get selected members info
  const selectedMembers = selecteduser_ids.map(user_id => {
    const member = validMembers.find(m => m.user === user_id);
    return member ? {
      id: user_id,
      name: member.name || 'Unknown User',
      email: member.email,
      avatar: member.avatar
    } : {
      id: user_id,
      name: `User ${user_id.slice(-4)}`,
      email: undefined,
      avatar: undefined
    };
  }).filter(Boolean);

  const handleAddMember = () => {
    if (pendingSelection && !selecteduser_ids.includes(pendingSelection)) {
      setSelecteduser_ids(prev => [...prev, pendingSelection]);
      setPendingSelection("");
    }
  };

  const handleRemoveMember = (user_id: string) => {
    setSelecteduser_ids(prev => prev.filter(id => id !== user_id));
  };

  const handleAssign = async () => {
    if (selecteduser_ids.length === 0) {
      toast.error("Please select at least one user to assign");
      return;
    }

    try {
      // For multiple assignments, we need to send them as a comma-separated string
      // Since the backend API only supports one user per call, we'll use the first selected user
      // and store the full list in the assigned_to field as comma-separated values
      
      if (selecteduser_ids.length === 1) {
        // Single user assignment - use the existing API
        await dispatch(assignUserToTask({
          task_id,
          user_id: selecteduser_ids[0],
          notes: notes.trim() || undefined
        })).unwrap();
      } else {
        // Multiple user assignment - use the first user for the API call
        // but we'll need to update the assigned_to field to contain all users
        await dispatch(assignUserToTask({
          task_id,
          user_id: selecteduser_ids[0],
          notes: notes.trim() || undefined,
          // Pass the full list for the reducer to handle
          multipleuser_ids: selecteduser_ids
        })).unwrap();
      }

      toast.success(`Task assigned to ${selecteduser_ids.length} member(s) successfully!`);
      onOpenChange(false);
      setNotes("");
      setSelecteduser_ids([]);
      setPendingSelection("");
    } catch (error) {
      console.error("Assignment error:", error);
      let errorMessage = "Failed to assign task";
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Task
          </DialogTitle>
          <DialogDescription>
            Assign &quot;{taskTitle}&quot; to project members. You can assign multiple members to collaborate on this task.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current Assignments */}
          {selectedMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Currently Assigned ({selectedMembers.length})</Label>
              <div className="space-y-2">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-xs">
                          {member.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{member.name}</span>
                        {member.email && (
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Assignment */}
          <div className="space-y-2">
            <Label htmlFor="new-assignee">Add Team Member</Label>
            {loading.fetchMembers ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading project members...</span>
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground">
                {members.length === 0 
                  ? "No project members found. Users need to join the project first."
                  : "All project members are already assigned to this task."
                }
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={pendingSelection} onValueChange={setPendingSelection}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a team member to add">
                      {pendingSelection && (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const selectedMember = availableMembers.find(m => m.user === pendingSelection);
                            return selectedMember ? (
                              <>
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={selectedMember.avatar} alt={selectedMember.name} />
                                  <AvatarFallback className="text-xs">
                                    {selectedMember.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{selectedMember.name}</span>
                              </>
                            ) : "Choose a team member";
                          })()}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member._id} value={member.user} className="min-h-[50px]">
                        <div className="flex items-center gap-2 w-full">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt={member.name} />
                            <AvatarFallback className="text-xs">
                              {member.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{member.name}</span>
                            <div className="flex items-center gap-2">
                              {member.email && (
                                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {member.role || "Member"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddMember}
                  disabled={!pendingSelection}
                  className="shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Assignment Notes */}
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

          {/* Info about reassignment */}
          {currentAssigneeIds.length > 0 && (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
              <strong>Note:</strong> This will update the task assignment. Previously assigned members not included in the current selection will be unassigned.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={taskLoading.assignUserToTask}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selecteduser_ids.length === 0 || taskLoading.assignUserToTask}
          >
            {taskLoading.assignUserToTask ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              `Assign to ${selecteduser_ids.length} member${selecteduser_ids.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}