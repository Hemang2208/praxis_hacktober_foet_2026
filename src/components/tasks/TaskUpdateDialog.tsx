"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useSupportAgent } from "@/hooks/useSupportAgent";
import { useTaskStore, type Task } from "@/lib/store";
import { useAppDispatch } from "@/redux/hooks";
import { updateTaskInBoard, fetchProjectBoard } from "@/redux/slice/project.slice";
import { fetchTaskById as fetchTaskByIdAction } from "@/redux/slice/task.slice";
import { invalidatePageCache, invalidateDetailItemCache } from "@/redux/slice/cache.slice";
import type { TaskUpdateRequest } from "@/types/support-agent";
import toast from "react-hot-toast";

interface TaskUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

export function TaskUpdateDialog({
  open,
  onOpenChange,
  task,
}: TaskUpdateDialogProps) {
  const { updateMyTask } = useSupportAgent();
  const { updateTask } = useTaskStore();
  const dispatch = useAppDispatch();

  const [isSaving, setIsSaving] = React.useState(false);

  const [status, setStatus] = React.useState<string>(task.status || "todo");
  const [priority, setPriority] = React.useState<string>(
    task.priority || "medium",
  );
  const [due_date, setDueDate] = React.useState<string>(
    typeof task.due_date === "string"
      ? task.due_date
      : task.due_date instanceof Date
        ? task.due_date.toISOString().split("T")[0]
        : "",
  );
  const [tagsText, setTagsText] = React.useState<string>(
    (task.tags || []).join(", "),
  );
  const [actual_hours, setActualHours] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setDueDate(
        typeof task.due_date === "string"
          ? task.due_date
          : task.due_date instanceof Date
            ? task.due_date.toISOString().split("T")[0]
            : "",
      );
      setTagsText((task.tags || []).join(", "));
      setActualHours("");
    }
  }, [open, task]);

  const onSubmit = async () => {
    if (!due_date) {
      toast.error("Please select a due date");
      return;
    }

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const updates: TaskUpdateRequest = {
      status,
      priority,
      due_date: due_date ? new Date(due_date).toISOString() : undefined,
      tags,
      actual_hours: actual_hours ? Number(actual_hours) : undefined,
    };

    try {
      setIsSaving(true);
      const loadingId = toast.loading("Updating task...");

      const normalizeStatusForKanban = (value: unknown): Task["status"] => {
        const v = String(value ?? "")
          .trim()
          .toLowerCase();
        if (v === "todo" || v === "pending" || v === "not-started")
          return "todo";
        if (
          v === "in-progress" ||
          v === "in_progress" ||
          v === "in progress" ||
          v === "inprogress"
        ) {
          return "in-progress";
        }
        if (v === "submitted" || v === "review" || v === "under-review")
          return "submitted";
        if (v === "completed" || v === "done" || v === "complete")
          return "completed";
        if (v === "blocked" || v === "cancelled" || v === "canceled")
          return "blocked";
        return (status as Task["status"]) || "todo";
      };

      // 1) Primary: update task-mgmt-agent via Redux board thunk (Kanban source-of-truth)
      await dispatch(
        updateTaskInBoard({
          task_id: task.id,
          status,
          priority: priority as "high" | "medium" | "low" | "critical",
          due_date,
          tags,
        }),
      ).unwrap();

      // 2) Update local Zustand store for immediate card UI refresh
      updateTask(task.id, {
        status: normalizeStatusForKanban(status),
        priority: priority as Task["priority"],
        due_date,
        tags,
      });

      // Refetch the board and task details to ensure state caches are updated/invalidated
      try {
        const projectId = task.project_id || (task as any).project;
        if (projectId) {
          void dispatch(fetchProjectBoard(projectId));
        }
      } catch (err) {
        console.warn("Failed to refetch project board", err);
      }

      try {
        void dispatch(fetchTaskByIdAction(task.id || task._id));
      } catch (err) {
        console.warn("Failed to refetch task details", err);
      }

      // Invalidate caches so lists and details refetch fresh data
      try {
        dispatch(invalidatePageCache({ resource: "tasks" }));
        dispatch(
          invalidateDetailItemCache({
            resource: "tasks",
            id: task.id || task._id,
          }),
        );
      } catch (err) {
        console.warn("Failed to invalidate cache", err);
      }

      // 3) Best-effort: sync to support-agent (may legitimately 404 for Kanban tasks)
      void (async () => {
        try {
          await updateMyTask(task._id || task.id, updates, {
            retryOn404: true,
            fallbackTitle: task.title,
          });
        } catch (e) {
          // Non-blocking by design
          console.warn("Support-agent update skipped/failed", e);
        }
      })();

      toast.success("Task updated", { id: loadingId });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Update Task</DialogTitle>
          <DialogDescription>
            Update status, priority, due date, and tags. Changes sync to your
            account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="due">Due Date</Label>
            <DatePicker
              value={due_date}
              onChange={(val) => setDueDate(val)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="urgent, backend"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hours">Actual Hours (optional)</Label>
            <Input
              id="hours"
              type="number"
              step="0.1"
              value={actual_hours}
              onChange={(e) => setActualHours(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TaskUpdateDialog;
