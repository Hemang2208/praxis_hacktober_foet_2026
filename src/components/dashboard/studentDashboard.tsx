"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { IProject } from "@/models/Project";
import { ITask } from "@/models/Task";
import { PLANNER_AGENT_URL } from "@/utils/API_URL";

export default function UserDashboard() {
  // Define interfaces for the localStorage data which might have a different structure than the mongoose models
  interface ProjectData extends Omit<IProject, "deadline"> {
    deadline: { $date: string } | string;
  }

  interface TaskData extends Omit<ITask, "due_date" | "status"> {
    due_date: string;
    status: string;
  }

  const [project, setProject] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      setError(null);
      try {
        // Get project_id from URL or props (update as needed)
        const urlParts = window.location.pathname.split("/");
        const project_id = urlParts[urlParts.length - 1];
        const res = await fetch(
          `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}`,
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to fetch project");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const projectData = data?.project || data;
        setProject(projectData);
        setTasks(projectData?.tasks || []);
      } catch {
        setError("Server error");
      }
      setLoading(false);
    }
    fetchProject();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-600">
        Loading project data...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600">
        {error}
      </div>
    );
  }
  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-600">
        No project data found.
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 p-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Project: {project.title}
            </h1>
            <p className="text-slate-600 mt-1">{project.description}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/dashboard/projects")}
          >
            View Details
          </Button>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>
              {completedTasks} of {totalTasks} tasks completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={completionRate} />
            <p className="mt-2 text-sm text-slate-500">{completionRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deadline</CardTitle>
            <CardDescription>Final due date</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center space-x-2 text-slate-600">
            <Clock className="h-4 w-4" />
            <span>
              {new Date(
                typeof project.deadline === "string"
                  ? project.deadline
                  : project.deadline.$date,
              ).toDateString()}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>
              {project.resources?.length || 0} team member(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center space-x-2 text-slate-600">
            <Users className="h-4 w-4" />
            <span>{project.resources?.map((r) => r.profile).join(", ")}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Tasks
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl flex justify-between items-center hover:bg-slate-100 transition"
              >
                <div>
                  <h4 className="font-medium text-slate-900">{task.title}</h4>
                  <p className="text-sm text-slate-600">{task.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      task.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : task.status === "in-progress"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                    }
                  >
                    {task.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      task.priority === "high"
                        ? "border-red-200 text-red-700"
                        : task.priority === "medium"
                          ? "border-yellow-200 text-yellow-700"
                          : "border-green-200 text-green-700"
                    }
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
