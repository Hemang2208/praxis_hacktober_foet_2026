"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

export type PreviewSubtask = {
  title: string;
  description?: string;
  completed?: boolean;
};

export type PreviewTask = {
  title: string;
  description?: string;
  due_date?: string | undefined;
  status?: string;
  priority?: string;
  tags?: string[];
  sub_tasks?: PreviewSubtask[];
};

export type CreateTaskPayload = PreviewTask & { project_id: string };

export default function GeneratedTasksPreview({
  open,
  onOpenChange,
  tasks,
  onSave,
  project_id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: PreviewTask[];
  onSave: (tasks: CreateTaskPayload[]) => Promise<void> | void;
  project_id: string;
}) {
  const [localTasks, setLocalTasks] = useState<PreviewTask[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Deep copy incoming tasks into editable local state
    setLocalTasks(
      Array.isArray(tasks)
        ? tasks.map((t) => ({
            title: t.title || "Untitled Task",
            description: t.description || "",
            due_date: t.due_date ? String(t.due_date) : undefined,
            status: t.status || "todo",
            priority: t.priority || "medium",
            tags: Array.isArray(t.tags) ? [...t.tags] : [],
            sub_tasks: (() => {
              const raw =
                (Array.isArray(t.sub_tasks) && t.sub_tasks) ||
                (Array.isArray((t as any).sub_tasks) && (t as any).sub_tasks) ||
                (Array.isArray((t as any).sub_tasks) && (t as any).sub_tasks) ||
                [];

              return (raw as any[])
                .map((st) => ({
                  title: String(
                    st?.title ?? st?.name ?? st?.task_name ?? "Subtask",
                  ),
                  description: String(st?.description ?? st?.body ?? ""),
                  completed: !!(st?.completed ?? st?.status === "completed"),
                }))
                .filter((st) => st.title.trim().length > 0);
            })(),
          }))
        : [],
    );
  }, [tasks, open]);

  const updateTask = (index: number, patch: Partial<PreviewTask>) => {
    setLocalTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloads: CreateTaskPayload[] = localTasks.map((t) => ({
        title: t.title,
        description: t.description,
        due_date: t.due_date ? new Date(t.due_date).toISOString() : undefined,
        status: t.status || "todo",
        priority: t.priority || "medium",
        tags: t.tags || [],
        sub_tasks: Array.isArray(t.sub_tasks)
          ? t.sub_tasks.map((st) => ({
              title: st.title,
              description: st.description || "",
              completed: !!st.completed,
            }))
          : [],
        project_id,
      }));

      await onSave(payloads);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[95vw] sm:w-[720px] lg:w-[960px] xl:w-[1100px] sm:max-w-none"
      >
        <SheetHeader>
          <SheetTitle>Preview Generated Tasks</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {localTasks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No generated tasks to preview.
            </p>
          )}

          {localTasks.length > 0 && (
            <div className="space-y-4">
              {localTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-4 text-card-foreground"
                >
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={task.title}
                        onChange={(e) =>
                          updateTask(idx, { title: e.target.value })
                        }
                        className="font-semibold"
                      />
                    </div>
                    <div className="w-40">
                      <Label className="text-xs">Status</Label>
                      <select
                        aria-label={`Status for task ${idx + 1}`}
                        value={task.status}
                        onChange={(e) =>
                          updateTask(idx, { status: e.target.value })
                        }
                        className="w-full rounded-md border bg-background px-2 py-1"
                      >
                        <option value="todo">Todo</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={task.description}
                      onChange={(e) =>
                        updateTask(idx, { description: e.target.value })
                      }
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-xs">Due Date</Label>
                      <DatePicker
                        value={task.due_date ? task.due_date.split("T")[0] : ""}
                        onChange={(val) =>
                          updateTask(idx, {
                            due_date: val
                              ? new Date(val).toISOString()
                              : undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <select
                        aria-label={`Priority for task ${idx + 1}`}
                        value={task.priority}
                        onChange={(e) =>
                          updateTask(idx, { priority: e.target.value })
                        }
                        className="w-full rounded-md border bg-background px-2 py-1"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  {Array.isArray(task.sub_tasks) &&
                  task.sub_tasks.length > 0 ? (
                    <div className="mt-4">
                      <Label className="text-xs">Subtasks</Label>
                      <div className="mt-2 space-y-2">
                        {task.sub_tasks.map((st, stIdx) => (
                          <div
                            key={stIdx}
                            className="flex items-start justify-between gap-3 rounded-md border bg-muted px-3 py-2"
                          >
                            <div className="flex flex-1 flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    st.completed
                                      ? "bg-foreground"
                                      : "bg-foreground/40"
                                  }`}
                                />
                                <div
                                  className={`text-sm ${
                                    st.completed
                                      ? "text-muted-foreground line-through"
                                      : "text-foreground"
                                  }`}
                                >
                                  {st.title}
                                </div>
                              </div>
                              {st.description ? (
                                <div className="pl-4 whitespace-pre-wrap text-xs text-muted-foreground">
                                  {st.description}
                                </div>
                              ) : null}
                            </div>
                            {st.completed ? (
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                Completed
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
