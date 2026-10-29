"use client";
import * as React from "react";
import { MoreHorizontal, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Task,
  type TaskColumn,
  useTaskStore,
  useAuthStore,
} from "@/lib/store";
import { KanbanCard } from "./kanban-card";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  createTaskInBoard,
  fetchProjectBoard,
} from "@/redux/slice/project.slice";

interface KanbanColumnProps {
  column: TaskColumn;
  tasks: Task[];
  project_id: string;
  isStudent?: boolean;
  basePath?: string; // e.g., 'student', 'dashboard', 'college'
  canManageBoardStructure?: boolean;
  canManageTaskActions?: boolean;
  canUpdateTaskStatus?: boolean;
  canDragTask?: boolean;
  traineeReviewOnly?: boolean;
  isAdminOrOwner?: boolean;
}

const getColumnColorClass = (color: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "green":
      return "bg-green-100 text-green-700 border-green-200";
    case "yellow":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "red":
      return "bg-red-100 text-red-700 border-red-200";
    case "purple":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "pink":
      return "bg-pink-100 text-pink-700 border-pink-200";
    case "indigo":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
};

export function KanbanColumn({
  column,
  tasks,
  project_id,
  isStudent,
  basePath,
  canManageBoardStructure,
  canManageTaskActions,
  canUpdateTaskStatus,
  canDragTask,
  traineeReviewOnly,
  isAdminOrOwner,
}: KanbanColumnProps) {
  const { deleteColumn } = useTaskStore();
  const { user } = useAuthStore();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.project);

  const [isAddTaskOpen, setIsAddTaskOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newTask, setNewTask] = React.useState({
    title: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    due_date: "",
    tags: "",
  });

  const allowBoardStructureChanges = canManageBoardStructure ?? !isStudent;

  const handleDeleteColumn = () => {
    deleteColumn(project_id, column.id);
  };

  const handleAddTask = () => {
    if (!allowBoardStructureChanges) return;
    if (!newTask.title.trim() || !user) return;
    if (!newTask.due_date) {
      toast.error("Please select a due date");
      return;
    }

    const tags = newTask.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    console.log("[KanbanColumn] TASK_CREATION_STARTED_OPTIMISTIC", { project_id, title: newTask.title });

    const taskToCreate = {
      project_id,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority as "high" | "medium" | "low" | "critical",
      status: column.id,
      due_date: newTask.due_date,
      tags,
    };

    // Reset inputs and close creation form immediately
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
      tags: "",
    });
    setIsAddTaskOpen(false);

    // Fire-and-forget dispatch in the background
    dispatch(createTaskInBoard(taskToCreate))
      .unwrap()
      .then((result) => {
        console.log("[KanbanColumn] TASK_CREATED_SUCCESS", { project_id, task_id: result.task.id });
        toast.success("Task created successfully");
      })
      .catch((err) => {
        console.error("Failed to create task (rollback triggered)", err);
        toast.error(err instanceof Error ? err.message : "Failed to create task");
      });
  };

  return (
    <div className="min-w-[300px] w-full kanban-column">
      <Card className="h-fit bg-zinc-50/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/60 dark:border-zinc-800/60 shadow-sm rounded-xl overflow-hidden relative">
        <CardHeader className="pb-3 border-b border-white/20 dark:border-zinc-800/30 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base md:text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
                {column.title}
              </CardTitle>
              <Badge
                variant="outline"
                className={`${getColumnColorClass(column.color)} text-sm px-2 py-0 border-white/50 dark:border-zinc-700/50 shadow-sm`}
              >
                {tasks.length}
              </Badge>
            </div>
            {allowBoardStructureChanges && (
              <div className="flex items-center gap-1">
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 md:h-8 md:w-8"
                      aria-label={`Add task to ${column.title}`}
                      title={`Add task to ${column.title}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Task</DialogTitle>
                      <DialogDescription>
                        Create a new task in the {column.title} column.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="task-title">Title</Label>
                        <Input
                          id="task-title"
                          placeholder="Enter task title"
                          value={newTask.title}
                          onChange={(e) =>
                            setNewTask({ ...newTask, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="task-description">Description</Label>
                        <Textarea
                          id="task-description"
                          placeholder="Describe the task"
                          value={newTask.description}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="task-priority">Priority</Label>
                          <Select
                            value={newTask.priority}
                            onValueChange={(value) =>
                              setNewTask({
                                ...newTask,
                                priority: value as "high" | "medium" | "low",
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="task-due-date">Due Date</Label>
                          <DatePicker
                            value={newTask.due_date}
                            onChange={(val) =>
                              setNewTask({
                                ...newTask,
                                due_date: val,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="task-tags">
                          Tags (comma separated)
                        </Label>
                        <Input
                          id="task-tags"
                          placeholder="frontend, api, bug"
                          value={newTask.tags}
                          onChange={(e) =>
                            setNewTask({ ...newTask, tags: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddTaskOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddTask} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating...
                          </span>
                        ) : (
                          "Create"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>


              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              project_id={project_id}
              isStudent={isStudent}
              basePath={basePath}
              canManageTaskActions={canManageTaskActions}
              canUpdateTaskStatus={canUpdateTaskStatus}
              canDragTask={canDragTask}
              traineeReviewOnly={traineeReviewOnly}
              isAdminOrOwner={isAdminOrOwner}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
