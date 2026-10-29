"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Flag, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useKanbanTasks } from "@/hooks/useKanbanTasks";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "border-red-200 text-red-700 bg-red-50";
    case "medium":
      return "border-yellow-200 text-yellow-700 bg-yellow-50";
    case "low":
      return "border-green-200 text-green-700 bg-green-50";
    case "critical":
      return "border-red-400 text-red-800 bg-red-100";
    default:
      return "border-slate-200 text-slate-700 bg-slate-50";
  }
};

export function TasksPage() {
  const { columns, loading, error } = useKanbanTasks();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">Error: {error}</div>
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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-600 mt-1">
            Manage your project tasks and track progress
          </p>
        </div>
        <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </motion.div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {columns.map((column, columnIndex) => (
          <motion.div
            key={column.status}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: columnIndex * 0.1 }}
          >
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    {column.title}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className={`${column.color} text-slate-700`}
                  >
                    {column.tasks.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.tasks.length === 0 ? (
                  <div className="text-center text-slate-400 p-4 text-sm">
                    No tasks yet
                  </div>
                ) : (
                  column.tasks.map((task, taskIndex) => (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: taskIndex * 0.1 }}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-slate-900 text-sm leading-tight">
                          {task.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {task.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs px-2 py-0 bg-slate-50 text-slate-600 border-slate-200"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0 ${getPriorityColor(
                              task.priority
                            )}`}
                          >
                            <Flag className="mr-1 h-2 w-2" />
                            {task.priority}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-2">
                          {task.due_date && (
                            <div className="flex items-center text-xs text-slate-500">
                              <Calendar className="mr-1 h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}

                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-500 hover:text-slate-700 border-2 border-dashed border-slate-200 hover:border-slate-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add task
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
