"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Calendar, Flag, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

const columns = [
  {
    title: "To Do",
    count: 8,
    color: "bg-slate-100",
    tasks: [
      {
        id: 1,
        title: "Design user onboarding flow",
        description: "Create wireframes and user journey maps",
        priority: "high",
        assignee: "AK",
        due_date: "Jan 20",
        tags: ["UI/UX", "Research"],
        project: "E-commerce Platform",
      },
      {
        id: 2,
        title: "Set up CI/CD pipeline",
        description: "Configure GitHub Actions for automated testing",
        priority: "medium",
        assignee: "AK",
        due_date: "Jan 22",
        tags: ["DevOps", "Testing"],
        project: "Task Management App",
      },
      {
        id: 3,
        title: "Write API documentation",
        description: "Document all REST endpoints with examples",
        priority: "low",
        assignee: "AK",
        due_date: "Jan 25",
        tags: ["Documentation", "API"],
        project: "E-commerce Platform",
      },
    ],
  },
  {
    title: "In Progress",
    count: 5,
    color: "bg-blue-100",
    tasks: [
      {
        id: 4,
        title: "Implement user authentication",
        description: "JWT-based auth with refresh tokens",
        priority: "high",
        assignee: "AK",
        due_date: "Jan 18",
        tags: ["Backend", "Security"],
        project: "E-commerce Platform",
      },
      {
        id: 5,
        title: "Create product catalog UI",
        description: "Responsive grid layout with filters",
        priority: "medium",
        assignee: "AK",
        due_date: "Jan 21",
        tags: ["Frontend", "React"],
        project: "E-commerce Platform",
      },
    ],
  },
  {
    title: "Review",
    count: 3,
    color: "bg-yellow-100",
    tasks: [
      {
        id: 6,
        title: "Database schema optimization",
        description: "Improve query performance and indexing",
        priority: "medium",
        assignee: "AK",
        due_date: "Jan 16",
        tags: ["Database", "Performance"],
        project: "Task Management App",
      },
    ],
  },
  {
    title: "Done",
    count: 12,
    color: "bg-green-100",
    tasks: [
      {
        id: 7,
        title: "Project setup and configuration",
        description: "Initialize React app with TypeScript",
        priority: "high",
        assignee: "AK",
        due_date: "Jan 10",
        tags: ["Setup", "TypeScript"],
        project: "E-commerce Platform",
      },
      {
        id: 8,
        title: "Design system components",
        description: "Create reusable UI components library",
        priority: "medium",
        assignee: "AK",
        due_date: "Jan 12",
        tags: ["UI/UX", "Components"],
        project: "Task Management App",
      },
    ],
  },
];

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

export function TasksPage() {
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
            key={column.title}
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
                    {column.count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.tasks.map((task, taskIndex) => (
                  <motion.div
                    key={task.id}
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

                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                      {task.description}
                    </p>

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

                    <div className="text-xs text-slate-500 mb-3">
                      {task.project}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-0 ${getPriorityColor(
                            task.priority,
                          )}`}
                        >
                          <Flag className="mr-1 h-2 w-2" />
                          {task.priority}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-slate-500">
                          <Calendar className="mr-1 h-3 w-3" />
                          {task.due_date}
                        </div>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                            {task.assignee}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </motion.div>
                ))}

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
