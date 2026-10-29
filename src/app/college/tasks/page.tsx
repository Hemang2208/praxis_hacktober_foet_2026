"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Flag,
  MoreHorizontal,
  Eye,
} from "lucide-react";

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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCachedTasks } from "@/hooks/useCachedResources";
import AssignedUser from "@/components/tasks/AssignedUser";

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
    case "Review":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "Backlog":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function TasksPage() {
  const { tasks, loading, error, isCached } = useCachedTasks();
  const [search_query, setSearchQuery] = React.useState("");
  const [filter_status, setFilterStatus] = React.useState("all");
  const [filter_priority, setFilterPriority] = React.useState("all");

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title?.toLowerCase().includes(search_query.toLowerCase()) ||
        task.description?.toLowerCase().includes(search_query.toLowerCase());

      const matchesStatus =
        filter_status === "all" || task.status === filter_status;

      const matchesPriority =
        filter_priority === "all" || task.priority === filter_priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search_query, filter_status, filter_priority]);

  const taskStats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => task.status === "completed" || task.completed_at
    ).length;
    const inProgress = tasks.filter(
      (task) => task.status === "in-progress"
    ).length;
    const overdue = tasks.filter(
      (task) => !task.completed_at && new Date(task.due_date) < new Date()
    ).length;

    return { total, completed, inProgress, overdue };
  }, [tasks]);

  if (loading && !isCached) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: "Total Tasks",
            value: taskStats.total.toString(),
            description: "Across all projects",
            color: "text-slate-600",
            bgColor: "bg-slate-100",
          },
          {
            title: "Completed",
            value: taskStats.completed.toString(),
            description: `${
              Math.round((taskStats.completed / taskStats.total) * 100) || 0
            }% completion rate`,
            color: "text-emerald-600",
            bgColor: "bg-emerald-100",
          },
          {
            title: "In Progress",
            value: taskStats.inProgress.toString(),
            description: "Currently active",
            color: "text-sky-600",
            bgColor: "bg-sky-100",
          },
          {
            title: "Overdue",
            value: taskStats.overdue.toString(),
            description: "Need attention",
            color: "text-red-600",
            bgColor: "bg-red-100",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <div className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search tasks..."
            value={search_query}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={filter_status === "all"}
              onCheckedChange={() => setFilterStatus("all")}
            >
              All Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filter_status === "Backlog"}
              onCheckedChange={() => setFilterStatus("Backlog")}
            >
              Backlog
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter_status === "In Progress"}
              onCheckedChange={() => setFilterStatus("In Progress")}
            >
              In Progress
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter_status === "Review"}
              onCheckedChange={() => setFilterStatus("Review")}
            >
              Review
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter_status === "Done"}
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
              Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={filter_priority === "all"}
              onCheckedChange={() => setFilterPriority("all")}
            >
              All Priority
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filter_priority === "high"}
              onCheckedChange={() => setFilterPriority("high")}
            >
              High
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter_priority === "medium"}
              onCheckedChange={() => setFilterPriority("medium")}
            >
              Medium
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter_priority === "low"}
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
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task, index) => (
                  <TableRow
                    key={index}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <TableCell>
                      <Link
                        href={`/college/tasks/${task.id}`}
                        className="block"
                      >
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition-colors">
                            {task.title}
                          </div>
                          <div className="text-sm text-slate-500 line-clamp-1">
                            {task.description}
                          </div>
                          {task.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {task.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {task.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{task.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {task.project_id && (
                        <Link
                          href={`/college/projects/${task.project_id}`}
                          className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                        >
                          View Project
                        </Link>
                      ) || <span className="text-slate-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(task.status)}
                      >
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getPriorityColor(task.priority)}
                      >
                        <Flag className="mr-1 h-2 w-2" />
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-1 h-3 w-3 text-slate-400" />
                        <span
                          className={
                            !task.completed_at &&
                            new Date(task.due_date) < new Date()
                              ? "text-red-600"
                              : "text-slate-600"
                          }
                        >
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AssignedUser task_id={task.id} fallback={task.assignee} size="sm" />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/college/tasks/${task.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit Task</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>

            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No tasks found
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {search_query ||
                  filter_status !== "all" ||
                  filter_priority !== "all"
                    ? "Try adjusting your search or filters."
                    : "Create your first task to get started."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
