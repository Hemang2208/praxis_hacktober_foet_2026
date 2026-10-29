"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Calendar, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCachedTasks } from "@/hooks/useCachedResources";
import { TaskUpdateDialog } from "@/components/tasks/TaskUpdateDialog";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "border-red-200 text-red-700 bg-red-50";
    case "medium":
      return "border-yellow-200 text-yellow-700 bg-yellow-50";
    case "low":
      return "border-green-200 text-green-700 bg-green-50";
    default:
      return "border-slate-200 text-slate-700 bg-slate-50";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Done":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "In Progress":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "submitted":
    case "Submitted":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "Review":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "Backlog":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

// Skeleton Loader
function TasksTableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-12 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"
        ></div>
      ))}
    </div>
  );
}

export default function TasksPage() {
  // Use cached tasks hook - Only fetches if not cached
  const { tasks, loading, error, isCached } = useCachedTasks();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterPriority, setFilterPriority] = React.useState<string>("all");
  const [editTaskId, setEditTaskId] = React.useState<string | null>(null);

  // Filter and compute stats
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || task.status === filterStatus;

      const matchesPriority =
        filterPriority === "all" || task.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority]);

  const taskStats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => task.status === "completed" || task.completed_at,
    ).length;
    const inProgress = tasks.filter(
      (task) => task.status === "in-progress",
    ).length;
    const overdue = tasks.filter(
      (task) =>
        !task.completed_at &&
        new Date(task.due_date || Date.now()) < new Date(),
    ).length;

    return { total, completed, inProgress, overdue };
  }, [tasks]);

  // Show loading skeleton only on first load
  if (loading && !isCached) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-9 bg-gray-300 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
        <TasksTableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          Error Loading Tasks
        </h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            All Tasks
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage and track all your tasks across projects
          </p>
        </div>
        <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          {
            title: "Total Tasks",
            value: taskStats.total.toString(),
            description: "Across all projects",
          },
          {
            title: "Completed",
            value: taskStats.completed.toString(),
            description: `${Math.round((taskStats.completed / (taskStats.total || 1)) * 100)}% done`,
          },
          {
            title: "In Progress",
            value: taskStats.inProgress.toString(),
            description: "Currently active",
          },
          {
            title: "Overdue",
            value: taskStats.overdue.toString(),
            description: "Need attention",
          },
        ].map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Status: {filterStatus === "all" ? "All" : filterStatus}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filterStatus === "all"}
              onCheckedChange={() => setFilterStatus("all")}
            >
              All Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "Backlog"}
              onCheckedChange={() => setFilterStatus("Backlog")}
            >
              Backlog
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "In Progress"}
              onCheckedChange={() => setFilterStatus("In Progress")}
            >
              In Progress
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "Review"}
              onCheckedChange={() => setFilterStatus("Review")}
            >
              Review
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "submitted"}
              onCheckedChange={() => setFilterStatus("submitted")}
            >
              Submitted
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "Done"}
              onCheckedChange={() => setFilterStatus("Done")}
            >
              Done
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Flag className="mr-2 h-4 w-4" />
              Priority: {filterPriority === "all" ? "All" : filterPriority}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filterPriority === "all"}
              onCheckedChange={() => setFilterPriority("all")}
            >
              All Priority
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterPriority === "high"}
              onCheckedChange={() => setFilterPriority("high")}
            >
              High
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterPriority === "medium"}
              onCheckedChange={() => setFilterPriority("medium")}
            >
              Medium
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterPriority === "low"}
              onCheckedChange={() => setFilterPriority("low")}
            >
              Low
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Tasks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No tasks found matching your filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow
                        key={task._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {task.title}
                            </div>
                            <div className="text-sm text-slate-500 line-clamp-1">
                              {task.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(task.status || "Backlog")}
                          >
                            {task.status || "Backlog"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(
                              task.priority || "medium",
                            )}
                          >
                            <Flag className="mr-1 h-2 w-2" />
                            {task.priority || "medium"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-slate-600">
                            <Calendar className="mr-1 h-3 w-3" />
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString()
                              : "No due date"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {editTaskId && (
        <TaskUpdateDialog
          open={true}
          onOpenChange={(open) => !open && setEditTaskId(null)}
          task={filteredTasks.find((t) => t._id === editTaskId)!}
        />
      )}
    </div>
  );
}
