"use client";

/* eslint-disable react-hooks/exhaustive-deps, prefer-const, @next/next/no-img-element */
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import {
  X,
  Send,
  MessageCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Target,
  User,
  Brain,
  BarChart3,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Trash2,
  MoreHorizontal,
  Edit2,
  Check,
  Copy,
  Download,
  Mail,
  MessageSquare,
  Pin,
  Plus, // For New Chat
  Menu,
  List, // For Mobile Sidebar Toggle
  Folder, // For My Projects
  FolderKanban,
  ClipboardList, // For Project Plans
  GitPullRequest, // For Pull Requests
  MessageSquareCode, // For Code Feedback
  Bell, // For Notifications
  PanelRightClose,
  PanelRightOpen,
  FileText,
  FolderPlus,
  Code,
  Github,
  CheckCircle,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Paperclip,
  Mic,
  Link as LinkIcon,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { AgentSidebar } from "./AgentSidebar";
import { useSidebar } from "@/components/layout/AppShell";
import {
  filterSlashCommands,
  matchSlashCommand,
  generateHelpText,
  type SlashCommand,
} from "@/lib/slashCommands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSub,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  saveSupportChat,
  fetchSupportChats,
  deleteSupportChat,
  updateSupportChatTitle,
  addLocalSession,
} from "@/redux/slice/supportChat.slice";
import { DatePicker } from "@/components/ui/date-picker";
import { createProject, fetchProjects, fetchProjectPlanFromDB, generateProjectTasks, deleteProject, updateProject } from "@/redux/slice/project.slice";
import { createTask, deleteTask, updateTask, fetchTasksByProject } from "@/redux/slice/task.slice";
import { createAssessment } from "@/redux/slice/assessment.slice";
import { fetchGitHubData } from "@/redux/slice/github.slice";
import { useSupportAgent } from "@/hooks/useSupportAgent";
import { useSupportSocket } from "@/providers/SupportSocketProvider";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import { TASK_MGMT_AGENT_URL, SUPPORT_AGENT_URL } from "@/utils/API_URL";
import ReactMarkdown from "react-markdown";
import { SupportAgentDataDisplay } from "./SupportAgentDataDisplay";
import { CodeFeedbackDisplay } from "./CodeFeedbackDisplay";
import { NotificationDisplay } from "./NotificationDisplay";
import type { Message, MessageVersion, QuickAction, ChatSession } from "@/types/support-agent";
import useSWR from "swr";
import { useRouter } from "next/navigation";

// remark/rehype plugins: cast to `any` to avoid type conflicts between nested
// versions of `vfile`/`vfile-message` packages in some environments.
const mdRemarkPlugins = [] as any;
const mdRehypePlugins = [rehypeHighlight] as unknown as any;

// --- NEW DATA STRUCTURES ---

// Per-user chat history key — scoped by userId to prevent cross-user leakage
const CHAT_HISTORY_KEY_PREFIX = "supportAgentChatSessions";
const getChatHistoryKey = (userId?: string | null) =>
  userId ? `${CHAT_HISTORY_KEY_PREFIX}_${userId}` : CHAT_HISTORY_KEY_PREFIX;

// Generate stable unique ids for chats and messages. Prefer crypto.randomUUID when available.
let idCounter = 0;
const genId = () => {
  // Use crypto.randomUUID if available on client
  if (typeof window !== "undefined") {
    try {
      if (
        typeof crypto !== "undefined" &&
        typeof (crypto as any).randomUUID === "function"
      ) {
        return (crypto as any).randomUUID();
      }
    } catch (e) {
      // ignore and fallback
    }
  }
  // Use stable counter for server-side rendering or fallback
  idCounter += 1;
  return `id-${idCounter}-${Math.floor(Math.random() * 1000).toString(36)}`;
};

// Heuristic to detect message type from structured payload
const detectMessageType = (obj: any): Message["type"] | undefined => {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = Object.keys(obj);
  const keySet = new Set(keys.map((k) => k.toLowerCase()));

  if (
    keySet.has("overall_progress") ||
    keySet.has("tasks_summary") ||
    keySet.has("projects_summary") ||
    keySet.has("areas_for_improvement")
  )
    return "progress";
  if (
    keySet.has("recommendations") ||
    keySet.has("recommendation") ||
    keySet.has("suggestions")
  )
    return "recommendations";
  if (
    keySet.has("profile") ||
    keySet.has("activity_summary") ||
    keySet.has("recent_achievements") ||
    keySet.has("skills")
  )
    return "profile";
  if (keySet.has("steps") || keySet.has("actions") || keySet.has("next_steps"))
    return "action";

  // Some responses may be wrapped: { data: { ... } }
  if (obj.data && typeof obj.data === "object")
    return detectMessageType(obj.data);

  return undefined;
};

const formatAssistantResponse = (resp: any, type: string) => {
  if (!resp) return "";
  if (typeof resp === "string") return resp;
  if (resp.answer) return resp.answer;
  if (resp.summary) return resp.summary;
  if (resp.content) return resp.content;

  if (type === "recommendations") {
    const items =
      resp.recommendations || resp.items || resp.suggestions || resp || [];
    if (Array.isArray(items) && items.length > 0) {
      return items
        .map(
          (it: any, i: number) =>
            `${i + 1}. ${
              typeof it === "string"
                ? it
                : it.title || it.text || JSON.stringify(it)
            }`,
        )
        .join("\n");
    }
    // Return a meaningful message for empty recommendations
    return "No recommendations available at this time. Complete more tasks to get personalized recommendations!";
  }

  if (type === "progress") {
    const parts: string[] = [];
    if (resp.overall) parts.push(`Overall: ${resp.overall}`);
    if (resp.percent) parts.push(`Progress: ${resp.percent}%`);
    if (resp.highlights)
      parts.push(
        `Highlights:\n${
          Array.isArray(resp.highlights)
            ? resp.highlights.join("\n")
            : resp.highlights
        }`,
      );
    if (parts.length) return parts.join("\n\n");
    return "No progress data available yet. Start working on your tasks to track progress!";
  }

  if (type === "action") {
    if (resp.recommendation || resp.action) {
      const primaryAction = resp.recommendation || resp.action;
      const reason = resp.reasoning || "No reasoning provided.";
      const eta = resp.context?.estimated_time || resp.estimated_time;
      const impact = resp.context?.expected_impact || resp.expected_impact;

      let output = `1. ${primaryAction}`;
      output += `\n\nWhy: ${reason}`;
      if (impact) output += `\nImpact: ${impact}`;
      if (eta) output += `\nEstimated time: ${eta}`;
      return output;
    }

    const steps =
      resp.steps || resp.actions || resp.next_steps || resp.recommendations;
    if (Array.isArray(steps) && steps.length > 0) {
      return steps
        .map(
          (s: any, i: number) =>
            `${i + 1}. ${
              typeof s === "string" ? s : s.title || s.text || JSON.stringify(s)
            }`,
        )
        .join("\n");
    }
    return "No specific actions recommended at this time. Check back after completing more tasks!";
  }

  if (type === "profile") {
    const p = resp.profile || resp;
    const parts: string[] = [];
    if (p.name) parts.push(`Name: ${p.name}`);
    if (p.email) parts.push(`Email: ${p.email}`);
    if (p.skills)
      parts.push(
        `Skills: ${Array.isArray(p.skills) ? p.skills.join(", ") : p.skills}`,
      );
    if (parts.length) return parts.join("\n");
    return "Complete your profile to see detailed information here.";
  }

  // Handle "all tasks" response
  if (resp.tasks && Array.isArray(resp.tasks)) {
    const tasks = resp.tasks;
    if (tasks.length === 0) {
      return "No tasks found. Create your first task to get started!";
    }

    const summary = resp.summary;
    let output = `## 📋 All Tasks (${
      resp.total_count || tasks.length
    } total)\n\n`;

    if (summary) {
      output += `**Summary:**\n`;
      output += `✅ Completed: ${summary.completed || 0} | `;
      output += `🔄 In Progress: ${summary.in_progress || 0} | `;
      output += `📝 Pending: ${summary.pending || 0}`;
      if (summary.overdue) output += ` | ⚠️ Overdue: ${summary.overdue}`;
      output += `\n\n---\n\n`;
    }

    tasks.forEach((task: any, i: number) => {
      const statusEmoji =
        task.status === "completed"
          ? "✅"
          : task.status === "in_progress"
            ? "🔄"
            : "📝";
      const priorityEmoji =
        task.priority === "high"
          ? "🔴"
          : task.priority === "medium"
            ? ""
            : "🟢";

      output += `${i + 1}. ${statusEmoji} **${task.title}**\n`;
      if (task.description)
        output += `   ${task.description.slice(0, 100)}${
          task.description.length > 100 ? "..." : ""
        }\n`;
      output += `   ${priorityEmoji} Priority: ${
        task.priority || "N/A"
      } | Status: ${task.status || "N/A"}`;
      if (task.project_name) output += ` | Project: ${task.project_name}`;
      if (task.due_date)
        output += ` | Due: ${new Date(task.due_date).toLocaleDateString()}`;
      output += `\n\n`;
    });

    return output;
  }

  // Handle "my projects" response
  if (resp.projects && Array.isArray(resp.projects)) {
    const projects = resp.projects;
    if (projects.length === 0) {
      return "No projects found. Start your first project to begin tracking!";
    }

    const summary = resp.summary;
    let output = `## 🚀 My Projects (${
      resp.total_count || projects.length
    } total)\n\n`;

    if (summary) {
      output += `**Summary:**\n`;
      output += `✅ Completed: ${summary.completed || 0} | `;
      output += `🔄 Active: ${summary.active || 0}`;
      if (summary.on_hold) output += ` | ⏸️ On Hold: ${summary.on_hold}`;
      output += `\n\n---\n\n`;
    }

    projects.forEach((project: any, i: number) => {
      const projectStatus = String(project.status || "").toLowerCase();
      const statusEmoji =
        projectStatus === "completed"
          ? "✅"
          : projectStatus === "active" ||
              projectStatus === "in-progress" ||
              projectStatus === "in_progress"
            ? "🔄"
            : projectStatus === "on_hold" || projectStatus === "on-hold"
              ? "⏸️"
              : "📝";
      const progressPercent =
        typeof project.progress_percentage === "number"
          ? project.progress_percentage
          : typeof project.progress === "number"
            ? project.progress
            : 0;
      const progressBar = progressPercent
        ? `[${"█".repeat(
            Math.floor(progressPercent / 10),
          )}${"░".repeat(10 - Math.floor(progressPercent / 10))}] ${
            progressPercent
          }%`
        : "";

      output += `${i + 1}. ${statusEmoji} **${project.name || project.title || "Untitled Project"}**\n`;
      if (project.description)
        output += `   ${project.description.slice(0, 120)}${
          project.description.length > 120 ? "..." : ""
        }\n`;
      if (progressBar) output += `   ${progressBar}\n`;
      output += `   Status: ${project.status || "N/A"}`;
      if (project.tasks_count)
        output += ` | Tasks: ${project.completed_tasks || 0}/${
          project.tasks_count
        }`;
      if (project.technologies && project.technologies.length > 0)
        output += ` | Tech: ${project.technologies.slice(0, 3).join(", ")}`;
      if (project.end_date || project.deadline)
        output += ` | Due: ${new Date(project.end_date || project.deadline).toLocaleDateString()}`;
      output += `\n\n`;
    });

    return output;
  }

  // Handle "my project plans" response
  if (resp.project_plans && Array.isArray(resp.project_plans)) {
    const plans = resp.project_plans;
    if (plans.length === 0) {
      return "No project plans found. Create your first project plan to get started!";
    }

    const summary = resp.summary;
    let output = `## 📊 My Project Plans (${
      resp.total_count || plans.length
    } total)\n\n`;

    if (summary) {
      output += `**Summary:**\n`;
      output += `✅ Completed: ${summary.completed || 0} | `;
      output += `🔄 In Progress: ${summary.in_progress || 0} | `;
      output += `📝 Pending: ${summary.pending || 0}`;
      output += `\n\n---\n\n`;
    }

    plans.forEach((plan: any, i: number) => {
      const statusEmoji =
        plan.status === "completed"
          ? "✅"
          : plan.status === "in_progress"
            ? "🔄"
            : "📝";
      const phaseEmoji = plan.phase
        ? plan.phase === "planning"
          ? "📋"
          : plan.phase === "execution"
            ? "⚙️"
            : plan.phase === "review"
              ? "🔍"
              : "📌"
        : "";

      output += `${i + 1}. ${statusEmoji} **${plan.title}**\n`;
      if (plan.project_name) output += `   🗂️ Project: ${plan.project_name}\n`;
      if (plan.description)
        output += `   ${plan.description.slice(0, 120)}${
          plan.description.length > 120 ? "..." : ""
        }\n`;
      output += `   ${phaseEmoji} Phase: ${plan.phase || "N/A"} | Status: ${
        plan.status || "N/A"
      }`;

      if (plan.milestones && plan.milestones.length > 0) {
        const completedMilestones = plan.milestones.filter(
          (m: any) => m.status === "completed",
        ).length;
        output += ` | Milestones: ${completedMilestones}/${plan.milestones.length}`;
      }

      if (plan.timeline?.start_date && plan.timeline?.end_date) {
        output += ` | ${new Date(
          plan.timeline.start_date,
        ).toLocaleDateString()} - ${new Date(
          plan.timeline.end_date,
        ).toLocaleDateString()}`;
      }

      if (plan.deliverables && plan.deliverables.length > 0) {
        output += `\n   📦 Deliverables: ${plan.deliverables
          .slice(0, 3)
          .join(", ")}${plan.deliverables.length > 3 ? "..." : ""}`;
      }

      output += `\n\n`;
    });

    return output;
  }

  // Handle "my pull requests" response
  if (resp.pull_requests && Array.isArray(resp.pull_requests)) {
    const prs = resp.pull_requests;
    if (prs.length === 0) {
      return "No pull requests found. Create your first PR to get started!";
    }

    const summary = resp.summary;
    let output = `## 🔀 My Pull Requests (${
      resp.total_count || prs.length
    } total)\n\n`;

    if (summary) {
      output += `**Summary:**\n`;
      output += `✅ Merged: ${summary.merged || 0} | `;
      output += `🟢 Open: ${summary.open || 0} | `;
      output += `❌ Closed: ${summary.closed || 0}`;
      if (summary.draft) output += ` | 📝 Draft: ${summary.draft}`;
      output += `\n\n---\n\n`;
    }

    prs.forEach((pr: any, i: number) => {
      const statusEmoji =
        pr.status === "merged" || pr.state === "merged"
          ? "✅"
          : pr.status === "open" || pr.state === "open"
            ? "🟢"
            : pr.status === "closed" || pr.state === "closed"
              ? "❌"
              : pr.status === "draft" || pr.state === "draft"
                ? "📝"
                : "🔀";

      output += `${i + 1}. ${statusEmoji} **${pr.title}**\n`;
      if (pr.repository) output += `   📁 Repo: ${pr.repository}\n`;
      if (pr.description)
        output += `   ${pr.description.slice(0, 120)}${
          pr.description.length > 120 ? "..." : ""
        }\n`;

      output += `   Status: ${pr.status || pr.state || "N/A"}`;
      if (pr.branch_name && pr.target_branch)
        output += ` | ${pr.branch_name} → ${pr.target_branch}`;
      if (pr.commits_count) output += ` | Commits: ${pr.commits_count}`;
      if (pr.files_changed) output += ` | Files: ${pr.files_changed}`;

      if (pr.additions || pr.deletions) {
        output += `\n   📊 Changes: `;
        if (pr.additions) output += `+${pr.additions} `;
        if (pr.deletions) output += `-${pr.deletions}`;
      }

      if (pr.reviewers && pr.reviewers.length > 0) {
        output += `\n   👥 Reviewers: ${pr.reviewers.slice(0, 3).join(", ")}${
          pr.reviewers.length > 3 ? "..." : ""
        }`;
      }

      if (pr.labels && pr.labels.length > 0) {
        output += `\n   🏷️ Labels: ${pr.labels.slice(0, 3).join(", ")}${
          pr.labels.length > 3 ? "..." : ""
        }`;
      }

      if (pr.created_at)
        output += `\n   📅 Created: ${new Date(
          pr.created_at,
        ).toLocaleDateString()}`;
      if (pr.merged_at)
        output += ` | Merged: ${new Date(pr.merged_at).toLocaleDateString()}`;

      output += `\n\n`;
    });

    return output;
  }

  // Handle "my code feedback" response
  if (resp.feedback && Array.isArray(resp.feedback)) {
    const feedbacks = resp.feedback;
    if (feedbacks.length === 0) {
      return "No code feedback found. Complete tasks to receive feedback on your code!";
    }

    const summary = resp.summary;
    let output = `## 💬 My Code Feedback (${
      resp.count || resp.total_count || feedbacks.length
    } total)\n\n`;

    if (summary) {
      output += `**Summary:**\n`;
      output += `👍 Positive: ${summary.positive || 0} | `;
      output += `💡 Improvement: ${summary.improvement_needed || 0} | `;
      output += `⚠️ Critical: ${summary.critical || 0} | `;
      output += `✅ Resolved: ${summary.resolved || 0}`;
      output += `\n\n---\n\n`;
    }

    feedbacks.forEach((feedback: any, i: number) => {
      const overallScore =
        feedback.assessment?.overall ||
        feedback.assessment?.codeQuality ||
        feedback.rating ||
        0;
      const scoreColor =
        overallScore >= 90 ? "🟢" : overallScore >= 70 ? "🟡" : "🔴";

      output += `${i + 1}. ${scoreColor} **Task: ${feedback.task_id ? feedback.task_id.slice(0, 8) : "N/A"}**\n`;

      if (feedback.summary) output += `   ${feedback.summary}\n`;

      // Show assessment scores
      if (feedback.assessment) {
        const scores = feedback.assessment;
        output += `   📊 Scores: Quality ${scores.codeQuality || 0}% | Docs ${scores.documentation || 0}% | Tests ${scores.testCoverage || 0}% | Perf ${scores.performance || 0}% | Overall ${scores.overall || 0}%\n`;
      }

      // Show strengths
      if (feedback.strengths && feedback.strengths.length > 0) {
        output += `   ✅ Strengths: ${feedback.strengths.slice(0, 2).join(", ")}\n`;
      }

      // Show improvements
      if (feedback.improvements && feedback.improvements.length > 0) {
        output += `   💡 Improvements: ${feedback.improvements.slice(0, 2).join(", ")}\n`;
      }

      // Show PR link
      if (feedback.pull_request_url) {
        output += `   🔗 PR: ${feedback.pull_request_url}\n`;
      }

      // Show analysis date
      if (feedback.analysisDate) {
        output += `   📅 Analyzed: ${new Date(feedback.analysisDate).toLocaleDateString()}`;
      }

      // Show AI model used
      if (feedback.ai_model) {
        output += ` | Model: ${feedback.ai_model}`;
      }

      output += `\n\n`;
    });

    return output;
  }

  // Handle "my notifications" response
  if (resp.notifications && Array.isArray(resp.notifications)) {
    const notifications = resp.notifications;
    if (notifications.length === 0) {
      return "No notifications found. You're all caught up! 🎉";
    }

    const summary = resp.summary;
    let output = `## 🔔 My Notifications (${
      resp.total_count || notifications.length
    } total)\n\n`;

    if (summary) {
      output += `**Summary:**\n`;
      output += `📬 Total: ${summary.total || 0} | `;
      output += `🔵 Unread: ${summary.unread || resp.unread_count || 0} | `;
      output += `✅ Read: ${summary.read || 0}`;
      output += `\n\n---\n\n`;
    }

    notifications.forEach((notif: any, i: number) => {
      const readStatus = notif.is_read ? "✅" : "🔵";

      const priorityEmoji =
        notif.priority === "high" || notif.priority === "urgent"
          ? "🔴"
          : notif.priority === "medium"
            ? "🟡"
            : "🟢";

      const typeEmoji =
        notif.type === "task" || notif.category === "task"
          ? "📋"
          : notif.type === "project" || notif.category === "project"
            ? "🗂️"
            : notif.type === "comment" || notif.category === "comment"
              ? "💬"
              : notif.type === "mention" || notif.category === "mention"
                ? "👤"
                : notif.type === "deadline" || notif.category === "deadline"
                  ? "⏰"
                  : notif.type === "success" || notif.category === "success"
                    ? "✨"
                    : notif.type === "warning" || notif.category === "warning"
                      ? "⚠️"
                      : notif.type === "error" || notif.category === "error"
                        ? "❌"
                        : "🔔";

      output += `${i + 1}. ${readStatus}${priorityEmoji}${typeEmoji} **${
        notif.title
      }**\n`;

      if (notif.sender) output += `   👤 From: ${notif.sender}\n`;

      if (notif.message || notif.description) {
        const text = notif.message || notif.description;
        output += `   ${text.slice(0, 150)}${text.length > 150 ? "..." : ""}\n`;
      }

      output += `   Type: ${notif.type || notif.category || "N/A"}`;
      if (notif.priority) output += ` | Priority: ${notif.priority}`;
      if (notif.status) output += ` | Status: ${notif.status}`;

      if (notif.related_entity) {
        const entity = notif.related_entity;
        if (entity.type && entity.name) {
          output += `\n   🔗 Related: ${entity.type} - ${entity.name}`;
        }
      }

      if (notif.action_text && notif.action_url) {
        output += `\n   🔗 Action: ${notif.action_text}`;
      }

      if (notif.created_at) {
        const date = new Date(notif.created_at);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo = "";
        if (diffDays > 0) timeAgo = `${diffDays}d ago`;
        else if (diffHours > 0) timeAgo = `${diffHours}h ago`;
        else if (diffMins > 0) timeAgo = `${diffMins}m ago`;
        else timeAgo = "Just now";

        output += `\n   📅 ${timeAgo} (${date.toLocaleDateString()})`;
      }

      if (notif.read_at) {
        output += ` | Read: ${new Date(notif.read_at).toLocaleDateString()}`;
      }

      output += `\n\n`;
    });

    return output;
  }

  // Handle "my notifications" response
  if (resp.notifications && Array.isArray(resp.notifications)) {
    const notifications = resp.notifications;
    if (notifications.length === 0) {
      return "No notifications found. You're all caught up!";
    }

    const summary = resp.summary;
    let output = `## 🔔 My Notifications (${
      resp.total_count || notifications.length
    } total)\n\n`;

    if (summary) {
      output += `**Summary:**\n`;
      output += `📬 Unread: ${summary.unread || resp.unread_count || 0} | `;
      output += `🔴 High Priority: ${summary.high_priority || 0} | `;
      output += `🟡 Medium: ${summary.medium_priority || 0} | `;
      output += `🟢 Low: ${summary.low_priority || 0}`;
      output += `\n\n---\n\n`;
    }

    notifications.forEach((notif: any, i: number) => {
      const readEmoji = notif.is_read ? "✅" : "📬";
      const priorityEmoji =
        notif.priority === "high"
          ? "🔴"
          : notif.priority === "medium"
            ? "🟡"
            : notif.priority === "low"
              ? "🟢"
              : "📌";

      const typeEmoji =
        notif.type === "task"
          ? "📋"
          : notif.type === "project"
            ? "🗂️"
            : notif.type === "pr" || notif.type === "pull_request"
              ? "🔀"
              : notif.type === "feedback"
                ? "💬"
                : notif.type === "mention"
                  ? "@"
                  : notif.type === "reminder"
                    ? "⏰"
                    : "🔔";

      output += `${i + 1}. ${readEmoji}${priorityEmoji}${typeEmoji} **${
        notif.title
      }**\n`;

      if (notif.message || notif.description) {
        const msg = notif.message || notif.description;
        output += `   ${msg.slice(0, 150)}${msg.length > 150 ? "..." : ""}\n`;
      }

      output += `   Type: ${notif.type || notif.category || "N/A"}`;
      if (notif.priority) output += ` | Priority: ${notif.priority}`;
      if (notif.status) output += ` | Status: ${notif.status}`;

      if (notif.sender) output += `\n   👤 From: ${notif.sender}`;

      if (notif.action_text && notif.action_url) {
        output += `\n   🔗 Action: ${notif.action_text}`;
      }

      if (notif.related_entity_type) {
        output += `\n   🔗 Related: ${notif.related_entity_type}`;
        if (notif.related_entity_id)
          output += ` (${notif.related_entity_id.slice(0, 8)}...)`;
      }

      if (notif.created_at)
        output += `\n   📅 ${new Date(
          notif.created_at,
        ).toLocaleDateString()} ${new Date(notif.created_at).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" },
        )}`;

      if (notif.read_at)
        output += ` | Read: ${new Date(notif.read_at).toLocaleDateString()}`;

      if (notif.expires_at)
        output += `\n   ⏰ Expires: ${new Date(
          notif.expires_at,
        ).toLocaleDateString()}`;

      output += `\n\n`;
    });

    return output;
  }

  try {
    return JSON.stringify(resp, null, 2);
  } catch (e) {
    return String(resp);
  }
};

interface ErrorState {
  show: boolean;
  message: string;
  type: "network" | "api" | "auth" | "general";
  retryable: boolean;
  lastFailedAction?: string;
}

// Define a type for a single chat session
export type { ChatSession };

const safeSaveChatHistory = (sessions: ChatSession[], activeId: string | null, userId?: string | null) => {
  if (typeof window === "undefined") return;
  const key = getChatHistoryKey(userId);
  if (sessions.length === 0) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Failed to remove chats from localStorage", e);
    }
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to save chat sessions to localStorage:", error);
    // Attempt 1: Prune data fields of older chats to fit within quota
    try {
      const pruned = sessions.map((session, idx) => {
        if (session.id === activeId || idx < 2) {
          return session;
        }
        return {
          ...session,
          messages: session.messages.map((msg) => ({
            ...msg,
            data: undefined, // drop large context metadata
          })),
        };
      });
      localStorage.setItem(key, JSON.stringify(pruned));
    } catch (pruneError) {
      console.error("Failed to save pruned chats to localStorage:", pruneError);
      // Attempt 2: Save only the active chat session to save maximum space
      try {
        const activeOnly = sessions.filter((s) => s.id === activeId);
        localStorage.setItem(key, JSON.stringify(activeOnly));
      } catch (lastError) {
        console.error("Could not write any chat history to localStorage:", lastError);
      }
    }
  }
};

// --- MessageBubble Component (For Stylish UI - extracted from previous answer) ---

import { swrFetcherWithAuth } from "@/lib/api-client";

// Special fetcher for current-user endpoint that doesn't trigger logout on 401
const currentUserFetcher = async (url: string) => {
  const response = await fetch(url);

  // For current-user endpoint, 401 is expected when not logged in
  if (response.status === 401) {
    return null; // Return null instead of throwing error
  }

  if (!response.ok) {
    const error = new Error(`HTTP error ${response.status}`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  return response.json();
};

// ... existing imports ...

// ─── Inline Interactive Creation Forms ──────────────────────────────────────

interface CreateProjectFormProps {
  onSuccess: (projectTitle: string) => void;
  onCancel: () => void;
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { data } = useSWR("/api/auth/current-user", currentUserFetcher);
  const mongoUser = data?.user;
  const userId = mongoUser?.user_id || mongoUser?._id || "";

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Overview
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [tags, setTags] = useState("");

  // Step 2: Document
  const [document, setDocument] = useState("");

  // Step 3: Resources
  const [resources, setResources] = useState<Array<{
    profile: string;
    skills: string[];
    experience: string;
    description: string;
    type: string;
    user: string;
  }>>([]);
  const [resProfile, setResProfile] = useState("");
  const [resSkills, setResSkills] = useState("");
  const [resExperience, setResExperience] = useState("");
  const [resDescription, setResDescription] = useState("");
  const [resType, setResType] = useState("");

  // Step 4: Team
  const [team, setTeam] = useState<Array<{
    email: string;
    role: string;
    name: string;
    user: string;
    avatar: string;
  }>>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Contributor");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyAndAddMember = async () => {
    if (!memberEmail.trim()) return;
    setCheckingEmail(true);
    setEmailExists(null);
    try {
      const res = await fetch(`/api/user/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail.trim() }),
      });
      let name = memberEmail.split("@")[0];
      let user_id = "";
      let avatar = "";
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const user = json.user;
        name = user?.full_name || name;
        user_id = user?.user_id || user?._id || "";
        avatar = user?.profile_picture || user?.image_url || "";
        setEmailExists(true);
      } else {
        setEmailExists(false);
      }
      setTeam((prev) => [
        ...prev,
        {
          email: memberEmail.trim(),
          role: memberRole,
          name,
          user: user_id,
          avatar,
        },
      ]);
      setMemberEmail("");
      setMemberRole("Contributor");
    } catch (e) {
      console.error("Team check failed", e);
      setError("Failed to verify user email.");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (step === 1 && (!title.trim() || !description.trim() || !deadline)) {
      setError("Please fill in all required fields (Title, Description, Deadline).");
      return;
    }
    setError(null);
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !deadline) {
      setError("Please fill in all required fields (Title, Description, Deadline) in Step 1.");
      setStep(1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title,
        description,
        deadline,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        document,
        status: "planning" as const,
        progress: 0,
        resources,
        team: team.map(m => ({
          user: m.user || "",
          role: m.role || "Contributor",
          name: m.name,
          email: m.email,
          avatar: m.avatar,
        })),
        created_by: userId,
      };
      
      const resultAction = await dispatch(createProject(payload));
      if (createProject.fulfilled.match(resultAction)) {
        const resultProject = resultAction.payload.project;
        const project_id = resultProject?._id || resultProject?.project_id || null;

        // Post-creation 1: ResultReleaseCycle API
        try {
          if (project_id && userId && title) {
            await fetch("/api/result-release-cycles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "create",
                project_id,
                user_id: userId.toString(),
                projectTitle: title,
              }),
            });
          }
        } catch (rErr) {
          console.error("ResultReleaseCycle failed", rErr);
        }

        // Post-creation 2: Persist team_members via updateProject
        if (project_id && team.length > 0) {
          const teamMembersPayload = team.map(m => ({
            name: m.name || m.email.split("@")[0],
            email: m.email,
            role: m.role || "Contributor",
            avatar: m.avatar || "",
          }));
          try {
            await dispatch(
              updateProject({
                id: project_id,
                updates: { team_members: teamMembersPayload },
              })
            ).unwrap();
          } catch (uErr) {
            console.error("Failed to update project team", uErr);
          }

          // Post-creation 3: Project Invite
          for (const m of team) {
            try {
              if (m.email) {
                await fetch(`/api/project/invite`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    project_id,
                    email: m.email,
                    name: m.name,
                    role: m.role,
                  }),
                });
              }
            } catch (invErr) {
              console.error("Failed to invite member", m.email, invErr);
            }
          }
        }

        dispatch(fetchProjects());
        onSuccess(title);
      } else {
        setError(String(resultAction.payload || "Failed to create project. Make sure you have owner/admin subroles."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/40 rounded-2xl border border-border/80 text-foreground w-full">
      <div className="flex justify-between items-center border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Create New Project</h4>
        <span className="text-[10px] text-muted-foreground font-semibold font-mono">Step {step}/4</span>
      </div>
      
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

      {/* Step 1: Overview */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g., Website Redesign" className="h-9 text-xs bg-background" disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description *</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="E.g., Redevelop enterprise dashboard..." className="h-9 text-xs bg-background" disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deadline *</label>
            <DatePicker value={deadline} onChange={val => setDeadline(val)} disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags (comma-separated)</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="E.g., frontend, react, nextjs" className="h-9 text-xs bg-background" disabled={loading} />
          </div>
        </div>
      )}

      {/* Step 2: Document */}
      {step === 2 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project Document (Markdown Supported)</label>
          <textarea
            value={document}
            onChange={e => setDocument(e.target.value)}
            placeholder="Paste drive link, GitHub repo or document description..."
            className="w-full h-44 p-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none"
            disabled={loading}
          />
        </div>
      )}

      {/* Step 3: Resources */}
      {step === 3 && (
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Resources Requirement</label>
          
          <div className="space-y-2 p-3 border border-border/80 rounded-xl bg-background/50">
            <Input
              placeholder="Profile / Role (e.g. Frontend Dev)"
              value={resProfile}
              onChange={e => setResProfile(e.target.value)}
              className="h-8 text-xs bg-background"
            />
            <Input
              placeholder="Skills (e.g. React, Tailwind)"
              value={resSkills}
              onChange={e => setResSkills(e.target.value)}
              className="h-8 text-xs bg-background"
            />
            <Input
              placeholder="Experience (e.g. 1-2 years)"
              value={resExperience}
              onChange={e => setResExperience(e.target.value)}
              className="h-8 text-xs bg-background"
            />
            <textarea
              placeholder="Job Description"
              value={resDescription}
              onChange={e => setResDescription(e.target.value)}
              className="w-full h-16 p-2 rounded bg-background border text-xs text-foreground focus:outline-none"
            />
            <select
              value={resType}
              onChange={e => setResType(e.target.value)}
              className="w-full h-8 px-2 rounded bg-background border text-xs text-foreground focus:outline-none"
            >
              <option value="">Select Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
            </select>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (resProfile.trim()) {
                  setResources(prev => [
                    ...prev,
                    {
                      profile: resProfile.trim(),
                      skills: resSkills.split(",").map(s => s.trim()).filter(Boolean),
                      experience: resExperience.trim(),
                      description: resDescription.trim(),
                      type: resType,
                      user: userId,
                    }
                  ]);
                  setResProfile("");
                  setResSkills("");
                  setResExperience("");
                  setResDescription("");
                  setResType("");
                }
              }}
              className="w-full h-8 text-xs animate-none"
            >
              Add Resource
            </Button>
          </div>

          {/* List of Added Resources */}
          {resources.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Added Resources</span>
              {resources.map((res, i) => (
                <div key={i} className="flex justify-between items-center border border-border p-2 rounded-lg bg-background text-xs">
                  <div>
                    <strong>{res.profile}</strong> ({res.type || "N/A"})
                    <div className="text-[10px] text-muted-foreground">Skills: {res.skills.join(", ")}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setResources(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Team Members */}
      {step === 4 && (
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Team Members</label>
          
          <div className="space-y-2 p-3 border border-border/80 rounded-xl bg-background/50">
            <Input
              placeholder="Team Member Email"
              value={memberEmail}
              onChange={e => setMemberEmail(e.target.value)}
              className="h-8 text-xs bg-background"
            />
            <div className="flex gap-2">
              <select
                value={memberRole}
                onChange={e => setMemberRole(e.target.value)}
                className="flex-1 h-8 px-2 rounded bg-background border text-xs text-foreground focus:outline-none"
              >
                <option value="Contributor">Contributor</option>
                <option value="Manager">Manager</option>
                <option value="Viewer">Viewer</option>
              </select>
              <Button
                type="button"
                size="sm"
                onClick={handleVerifyAndAddMember}
                disabled={checkingEmail || !memberEmail.trim()}
                className="h-8 text-xs"
              >
                {checkingEmail ? "Checking..." : "Verify & Add"}
              </Button>
            </div>
          </div>

          {/* List of Added Members */}
          {team.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Added Members</span>
              {team.map((m, i) => (
                <div key={i} className="flex justify-between items-center border border-border p-2 rounded-lg bg-background text-xs">
                  <div>
                    <strong>{m.name}</strong> - <span className="text-primary">{m.role}</span>
                    <div className="text-[10px] text-muted-foreground">{m.email}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTeam(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="flex gap-2 justify-between pt-2 border-t border-border/50">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <div className="flex gap-1.5">
          {step > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={handleBack} className="h-8 text-xs" disabled={loading}>
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" size="sm" onClick={handleNext} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading}>
              Next
            </Button>
          ) : (
            <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

interface CreateTaskFormProps {
  onSuccess: (taskTitle: string) => void;
  onCancel: () => void;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) {
      setError("Please fill in all required fields (Title, Project).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedProject = projects.find(p => p._id === projectId || (p as any).id === projectId || (p as any).project_id === projectId);
      const payload = {
        title,
        description,
        priority: priority as any,
        status: status as any,
        project_id: projectId,
        project_name: selectedProject?.title || "",
        due_date: dueDate || undefined,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        sub_tasks: [],
      };
      const resultAction = await dispatch(createTask(payload as any));
      if (createTask.fulfilled.match(resultAction)) {
        onSuccess(title);
      } else {
        setError(String(resultAction.payload || "Failed to create task. Make sure you have manager/admin subroles."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/40 rounded-2xl border border-border/80 text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Create New Task</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          disabled={loading}
          className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
        >
          <option value="">-- Choose Project --</option>
          {projects.map(p => (
            <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
              {p.title || "Unnamed Project"}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task Title *</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g., Implement login form" className="h-9 text-xs bg-background" disabled={loading} />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="E.g., Use JSON Web Tokens..." className="h-9 text-xs bg-background" disabled={loading} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
          <DatePicker value={dueDate} onChange={val => setDueDate(val)} disabled={loading} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</label>
          <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="frontend, react" className="h-9 text-xs bg-background" disabled={loading} />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading}>
          {loading ? "Creating..." : "Create Task"}
        </Button>
      </div>
    </form>
  );
};

interface CreatePlanFormProps {
  onSuccess: (projectTitle: string) => void;
  onCancel: () => void;
}

const CreatePlanForm: React.FC<CreatePlanFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a project.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedProject = projects.find(p => p._id === projectId || (p as any).id === projectId || (p as any).project_id === projectId);
      const resultAction = await dispatch(fetchProjectPlanFromDB(projectId));
      if (fetchProjectPlanFromDB.fulfilled.match(resultAction)) {
        onSuccess(selectedProject?.title || "Project");
      } else {
        setError(String(resultAction.payload || "Failed to generate project plan. Make sure you have manager/admin subroles."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Generate Project Plan</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          disabled={loading}
          className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
        >
          <option value="">-- Choose Project --</option>
          {projects.map(p => (
            <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
              {p.title || "Unnamed Project"}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading}>
          {loading ? "Generating Plan..." : "Generate Plan"}
        </Button>
      </div>
    </form>
  );
};

interface GenerateTasksFormProps {
  onSuccess: (projectTitle: string) => void;
  onCancel: () => void;
}

const GenerateTasksForm: React.FC<GenerateTasksFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a project.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedProject = projects.find(p => p._id === projectId || (p as any).id === projectId || (p as any).project_id === projectId);
      const resultAction = await dispatch(generateProjectTasks(projectId));
      if (generateProjectTasks.fulfilled.match(resultAction)) {
        onSuccess(selectedProject?.title || "Project");
      } else {
        setError(String(resultAction.payload || "Failed to generate tasks. Make sure you have manager/admin subroles."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Generate Tasks (AI)</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          disabled={loading}
          className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
        >
          <option value="">-- Choose Project --</option>
          {projects.map(p => (
            <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
              {p.title || "Unnamed Project"}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading}>
          {loading ? "Generating..." : "Generate Tasks"}
        </Button>
      </div>
    </form>
  );
};

interface GenerateSubtasksFormProps {
  onSuccess: (taskTitle: string) => void;
  onCancel: () => void;
}

const GenerateSubtasksForm: React.FC<GenerateSubtasksFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const allTasks = useAppSelector((state) => state.task.tasks) || [];
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchTasksByProject(projectId));
      setTaskId("");
    }
  }, [projectId, dispatch]);

  const projectTasks = useMemo(() => {
    if (!projectId) return [];
    return allTasks.filter(t => {
      const pid = t.project_id || (t as any).project;
      return String(pid) === String(projectId);
    });
  }, [projectId, allTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !taskId) {
      setError("Please select both project and task.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await fastAPIAuthService.getAccessToken();
      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(taskId)}/breakdown`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        { maxPollAttempts: 45, pollIntervalMs: 2000 },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || "Failed to generate sub-tasks");
      }
      const selectedTask = projectTasks.find(t => t._id === taskId);
      onSuccess(selectedTask?.title || "Task");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Generate Subtasks (AI)</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => (
              <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
                {p.title || "Unnamed Project"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Task *</label>
          <select
            value={taskId}
            onChange={e => setTaskId(e.target.value)}
            disabled={loading || !projectId}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Task --</option>
            {projectTasks.map(t => (
              <option key={t._id} value={t._id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading}>
          {loading ? "Generating..." : "Generate Subtasks"}
        </Button>
      </div>
    </form>
  );
};

interface CreateAssessmentFormProps {
  onSuccess: (projectTitle: string) => void;
  onCancel: () => void;
}

const CreateAssessmentForm: React.FC<CreateAssessmentFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const [projectId, setProjectId] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a project.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedProject = projects.find(p => p._id === projectId || (p as any).id === projectId || (p as any).project_id === projectId);
      const resultAction = await dispatch(createAssessment({
        project_id: projectId,
        difficulty,
        num_questions: numQuestions
      }));
      if (createAssessment.fulfilled.match(resultAction)) {
        onSuccess(selectedProject?.title || "Project");
      } else {
        setError(String(resultAction.payload || "Failed to create assessment."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Generate Assessment (AI)</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => (
              <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
                {p.title || "Unnamed Project"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty *</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as any)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">No. of Questions *</label>
          <input
            type="number"
            min={5}
            max={20}
            value={numQuestions}
            onChange={e => setNumQuestions(Number(e.target.value))}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading}>
          {loading ? "Creating..." : "Create Assessment"}
        </Button>
      </div>
    </form>
  );
};

interface DeleteTaskFormProps {
  onSuccess: (taskTitle: string) => void;
  onCancel: () => void;
}

const DeleteTaskForm: React.FC<DeleteTaskFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const allTasks = useAppSelector((state) => state.task.tasks) || [];
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchTasksByProject(projectId));
      setTaskId("");
    }
  }, [projectId, dispatch]);

  const projectTasks = useMemo(() => {
    if (!projectId) return [];
    return allTasks.filter(t => {
      const pid = t.project_id || (t as any).project;
      return String(pid) === String(projectId);
    });
  }, [projectId, allTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !taskId) {
      setError("Please select both project and task.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedTask = projectTasks.find(t => t._id === taskId);
      const resultAction = await dispatch(deleteTask(taskId));
      if (deleteTask.fulfilled.match(resultAction)) {
        onSuccess(selectedTask?.title || "Task");
      } else {
        setError(String(resultAction.payload || "Failed to delete task. Make sure you have manager/admin subroles."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-red-200/50 dark:border-red-950/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">Delete Task</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => (
              <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
                {p.title || "Unnamed Project"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Task *</label>
          <select
            value={taskId}
            onChange={e => setTaskId(e.target.value)}
            disabled={loading || !projectId}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Task --</option>
            {projectTasks.map(t => (
              <option key={t._id} value={t._id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-red-600 text-white hover:bg-red-700" disabled={loading}>
          {loading ? "Deleting..." : "Delete Task"}
        </Button>
      </div>
    </form>
  );
};

interface DeleteProjectFormProps {
  onSuccess: (projectTitle: string) => void;
  onCancel: () => void;
}

const DeleteProjectForm: React.FC<DeleteProjectFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const [projectId, setProjectId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a project.");
      return;
    }
    if (!confirm) {
      setError("Please confirm that you want to delete this project.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedProject = projects.find(p => p._id === projectId || (p as any).id === projectId || (p as any).project_id === projectId);
      const resultAction = await dispatch(deleteProject(projectId));
      if (deleteProject.fulfilled.match(resultAction)) {
        onSuccess(selectedProject?.title || "Project");
      } else {
        setError(String(resultAction.payload || "Failed to delete project. Make sure you have manager/admin subroles."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-red-200/50 dark:border-red-950/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">Delete Project</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => (
              <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
                {p.title || "Unnamed Project"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="confirm-delete"
            checked={confirm}
            onChange={e => setConfirm(e.target.checked)}
            disabled={loading}
            className="rounded border-border focus:ring-0"
          />
          <label htmlFor="confirm-delete" className="text-xs text-muted-foreground select-none cursor-pointer">
            I confirm that I want to delete this project and all its tasks permanently.
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-red-600 text-white hover:bg-red-700" disabled={loading || !confirm}>
          {loading ? "Deleting..." : "Delete Project"}
        </Button>
      </div>
    </form>
  );
};
interface UpdateTaskFormProps {
  onSuccess: (taskTitle: string) => void;
  onCancel: () => void;
}

const UpdateTaskForm: React.FC<UpdateTaskFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects) || [];
  const allTasks = useAppSelector((state) => state.task.tasks) || [];
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchTasksByProject(projectId));
      setTaskId("");
      setTitle("");
      setDescription("");
      setStatus("");
      setPriority("");
      setDueDate("");
      setTags("");
    }
  }, [projectId, dispatch]);

  const projectTasks = useMemo(() => {
    if (!projectId) return [];
    return allTasks.filter(t => {
      const pid = t.project_id || (t as any).project;
      return String(pid) === String(projectId);
    });
  }, [projectId, allTasks]);

  useEffect(() => {
    if (taskId) {
      const task = projectTasks.find(t => t._id === taskId);
      if (task) {
        setTitle(task.title || "");
        setDescription(task.description || "");
        setStatus(task.status || "todo");
        setPriority(task.priority || "medium");
        if (task.due_date) {
          const d = new Date(task.due_date);
          if (!isNaN(d.getTime())) {
            setDueDate(d.toISOString().split("T")[0]);
          } else {
            setDueDate("");
          }
        } else {
          setDueDate("");
        }
        setTags(Array.isArray(task.tags) ? task.tags.join(", ") : "");
      }
    }
  }, [taskId, projectTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !taskId || !title.trim() || !status || !priority) {
      setError("Please fill in all required fields (Project, Task, Title, Status, Priority).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedTask = projectTasks.find(t => t._id === taskId);
      const resultAction = await dispatch(updateTask({
        id: taskId,
        updates: {
          title,
          description,
          status: status as any,
          priority: priority as any,
          due_date: dueDate || undefined,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        }
      }));
      if (updateTask.fulfilled.match(resultAction)) {
        onSuccess(selectedTask?.title || "Task");
      } else {
        setError(String(resultAction.payload || "Failed to update task. Make sure you have manager/admin subroles."));
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Update Task</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project *</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={loading}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => (
              <option key={p._id || (p as any).project_id} value={p._id || (p as any).project_id}>
                {p.title || "Unnamed Project"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Task *</label>
          <select
            value={taskId}
            onChange={e => setTaskId(e.target.value)}
            disabled={loading || !projectId}
            className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
          >
            <option value="">-- Choose Task --</option>
            {projectTasks.map(t => (
              <option key={t._id} value={t._id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {taskId && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-xs bg-background" disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9 text-xs bg-background" disabled={loading} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                disabled={loading}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={loading}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/45"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
              <DatePicker value={dueDate} onChange={val => setDueDate(val)} disabled={loading} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="frontend, react" className="h-9 text-xs bg-background" disabled={loading} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95" disabled={loading || !taskId}>
          {loading ? "Updating..." : "Update Task"}
        </Button>
      </div>
    </form>
  );
};

interface SyncGitHubFormProps {
  onSuccess: (username: string) => void;
  onCancel: () => void;
}

const SyncGitHubForm: React.FC<SyncGitHubFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a GitHub username.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resultAction = await dispatch(fetchGitHubData(username.trim()) as any);
      if (fetchGitHubData.fulfilled.match(resultAction)) {
        onSuccess(username.trim());
      } else {
        setError(String(resultAction.payload || "GitHub user not found or sync failed."));
      }
    } catch (err) {
      setError("An unexpected error occurred during sync.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-foreground w-full">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Sync GitHub Commits</h4>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub Username *</label>
        <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="E.g., octocat" className="h-9 text-xs bg-background" disabled={loading} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs" disabled={loading}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5" disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync Commits"
          )}
        </Button>
      </div>
    </form>
  );
};
const KiyoLogoIcon: React.FC<{ isThinking?: boolean; size?: string }> = ({
  isThinking = false,
  size = "w-5 h-5",
}) => {
  return (
    <div className="relative flex items-center justify-center flex-shrink-0 select-none">
      {isThinking && (
        <motion.div
          className="absolute inset-0 rounded-full bg-zinc-400/30 dark:bg-emerald-500/25 blur-[4px]"
          animate={{
            scale: [1, 1.45, 1],
            opacity: [0.3, 0.85, 0.3],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <motion.div
        animate={
          isThinking
            ? {
                scale: [0.88, 1.15, 0.88],
                opacity: [0.4, 1, 0.4],
                rotate: 0,
              }
            : {
                scale: 1,
                opacity: 1,
                rotate: 0,
              }
        }
        transition={
          isThinking
            ? {
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : { duration: 0.25 }
        }
        className="relative z-10 flex items-center justify-center"
      >
        <img
          src="/logo.png"
          alt="Praxis"
          className={cn(size, "object-contain dark:hidden")}
        />
        <img
          src="/logo.png"
          alt="Praxis"
          className={cn(size, "object-contain hidden dark:block")}
        />
      </motion.div>
    </div>
  );
};

const MessageBubble: React.FC<{
  message: Message;
  isStreaming?: boolean;
  onUpdateContent?: (content: string) => void;
  onEditSubmit?: (messageId: string, newContent: string) => void;
  onRetry?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string, targetIndex: number) => void;
}> = ({ message, isStreaming, onUpdateContent, onEditSubmit, onRetry, onSwitchVersion }) => {
  const isUser = message.role === "user";
  const isSpecialType = message.type && message.type !== "text";
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(
    (message as any).feedback || null
  );

  useEffect(() => {
    setEditText(message.content);
  }, [message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy text", e);
    }
  };

  const Avatar = () => {
    if (isUser) {
      return null;
    }

    return (
      <div className="flex items-center justify-center h-7 w-7 flex-shrink-0 bg-transparent border-0 shadow-none mt-0.5 select-none">
        <KiyoLogoIcon isThinking={isStreaming} size="w-5 h-5" />
      </div>
    );
  };

  if (message.type === "form-create-project") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <CreateProjectForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Project "**${title}**" created successfully!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Project creation cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-create-task") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <CreateTaskForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Task "**${title}**" created successfully!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Task creation cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-create-plan") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <CreatePlanForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Project plan for "**${title}**" generated successfully!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Project plan generation cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-generate-tasks") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <GenerateTasksForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Tasks generated successfully for project "**${title}**"!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Task generation cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-generate-subtasks") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <GenerateSubtasksForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Subtasks generated successfully for task "**${title}**"!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Subtask generation cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-create-assessment") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <CreateAssessmentForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ AI assessment for project "**${title}**" created successfully!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Assessment creation cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-delete-task") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <DeleteTaskForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Task "**${title}**" deleted successfully!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Task deletion cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-delete-project") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <DeleteProjectForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Project "**${title}**" deleted successfully!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Project deletion cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-update-task") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <UpdateTaskForm
              onSuccess={(title) => {
                if (onUpdateContent) onUpdateContent(`✅ Task "**${title}**" updated successfully!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ Task update cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-link-github") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <div className="p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-foreground w-full space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Connect GitHub Account</h4>
              <p className="text-xs text-muted-foreground">Authorize Praxis OS to access your GitHub repositories and sync your commit history.</p>
              <Button
                onClick={() => {
                  window.location.href = "/api/github/oauth/start?redirect=/user/github/authorize";
                }}
                className="w-full h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2"
              >
                <Github className="w-4 h-4" />
                Authorize GitHub
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "form-sync-github") {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-start gap-3 w-full max-w-[85%]">
          <Avatar />
          <div className="w-full flex flex-col items-start text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
            </div>
            <SyncGitHubForm
              onSuccess={(username) => {
                if (onUpdateContent) onUpdateContent(`✅ GitHub data synced successfully for user "**${username}**"!`);
              }}
              onCancel={() => {
                if (onUpdateContent) onUpdateContent("❌ GitHub sync cancelled.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // If user is editing prompt inline
  if (isUser && isEditing) {
    return (
      <div className="flex w-full justify-end my-2">
        <div className="flex flex-col gap-2.5 w-full max-w-2xl p-3.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-md">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full text-[15px] md:text-base p-2 bg-transparent text-foreground focus:outline-none resize-none leading-relaxed"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setEditText(message.content);
              }}
              className="h-8 text-xs px-3.5 rounded-full text-zinc-600 dark:text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (editText.trim() && editText.trim() !== message.content) {
                  setIsEditing(false);
                  if (onEditSubmit) onEditSubmit(message.id, editText.trim());
                } else {
                  setIsEditing(false);
                }
              }}
              className="h-8 text-xs px-3.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 font-medium"
            >
              Save & Submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex items-start gap-3 max-w-[88%]",
          isUser ? "flex-row-reverse" : "flex-row",
          !isUser && "w-full",
        )}
      >
        {/* Avatar */}
        <Avatar />

        {/* Bubble */}
        <div
          className={cn(
            "flex flex-col text-[15px] md:text-base",
            isUser ? "items-end" : "items-start",
            !isUser && "w-full",
          )}
        >
          {/* Header for assistant with name and optional type badge */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground">Praxis</span>
              {isSpecialType && (
                <span className="text-[0.65rem] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-bold border border-border/80">
                  {message.type.replace("-", " ")}
                </span>
              )}
            </div>
          )}

          <div
            className={cn(
              "transition-all duration-200 text-[15px] md:text-base leading-relaxed",
              isUser
                ? "px-4 py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200/50 rounded-tr-sm shadow-[0_12px_30px_-15px_rgba(0,0,0,0.12)]"
                : "w-full text-foreground"
            )}
          >
            {isSpecialType && message.role === "assistant" && message.data ? (
              message.type === "code-feedback" ? (
                <CodeFeedbackDisplay
                  feedbacks={(message.data as any).feedback || []}
                  totalCount={(message.data as any).count}
                />
              ) : message.type === "notifications" ? (
                <NotificationDisplay
                  notifications={(message.data as any).notifications || []}
                  totalCount={(message.data as any).total_count}
                />
              ) : (
                <SupportAgentDataDisplay
                  type={
                    message.type as
                      | "recommendations"
                      | "progress"
                      | "action"
                      | "profile"
                  }
                  data={message.data as any}
                />
              )
            ) : (
              <div
                className={cn(
                  "prose prose-sm md:prose-base dark:prose-invert max-w-none leading-relaxed prose-p:text-[15px] md:prose-p:text-base prose-p:leading-relaxed prose-li:text-[15px]",
                  isUser 
                    ? "text-white dark:text-zinc-950 prose-p:text-white dark:prose-p:text-zinc-950" 
                    : "text-zinc-800 dark:text-zinc-200 prose-p:text-zinc-800 dark:prose-p:text-zinc-200",
                )}
              >
                {/* Ensure we render a friendly string. If message.content is an object or JSON string, convert it */}
                {(() => {
                  // compute displayContent
                  let displayContent: any = message.content;
                  const messageType = message.type || "text";
                  if (typeof displayContent === "string") {
                    const trimmed = displayContent.trim();
                    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                      try {
                        const parsed = JSON.parse(trimmed);
                        displayContent = formatAssistantResponse(
                          parsed,
                          messageType,
                        );
                      } catch (e) {
                        // leave as-is
                        displayContent = message.content;
                      }
                    }
                  } else if (
                    displayContent &&
                    typeof displayContent === "object"
                  ) {
                    try {
                      displayContent = formatAssistantResponse(
                        displayContent,
                        messageType,
                      );
                    } catch (e) {
                      displayContent = JSON.stringify(displayContent);
                    }
                  }

                  // Append cursor ONLY at the very end of formatting if streaming
                  if (isStreaming && typeof displayContent === "string") {
                    if (!displayContent || !displayContent.trim()) {
                      displayContent = "Thinking...";
                    }
                    displayContent = displayContent + "▍";
                  }

                  return (
                    <ReactMarkdown
                      remarkPlugins={mdRemarkPlugins}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0 text-[15px] md:text-base leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-2 ml-4 list-disc text-[15px] md:text-base">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-2 ml-4 list-decimal text-[15px] md:text-base">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="mb-1 text-[15px] md:text-base">
                            {children}
                          </li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        h2: ({ children }) => (
                          <h2
                            className={cn(
                              "text-base font-bold mb-2",
                              isUser
                                ? "text-primary-foreground"
                                : "text-primary",
                            )}
                          >
                            {children}
                          </h2>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-background/50 p-3 rounded-xl overflow-auto text-xs md:text-sm font-mono">
                            {children}
                          </pre>
                        ),
                        code: ({
                          node,
                          className,
                          children,
                          ...props
                        }: any) => {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match;
                          return isInline ? (
                            <code className="bg-background/40 px-1.5 py-0.5 rounded text-xs font-mono text-foreground border border-zinc-200/50 dark:border-zinc-800/50">
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-background/50 p-3 rounded-xl text-xs md:text-sm overflow-auto font-mono">
                              <code>{children}</code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {displayContent}
                    </ReactMarkdown>
                  );
                })()}
              </div>
            )}

            {/* Optional small context preview for assistant text messages */}
            {message.data &&
              message.role === "assistant" &&
              message.type === "text" && (
                <div className="text-xs mt-2 p-2 rounded bg-background/50 text-muted-foreground">
                  {/* Render a minimal context summary if available */}
                  {typeof message.data === "string"
                    ? message.data
                    : message.data &&
                        typeof message.data === "object" &&
                        "summary" in message.data
                      ? String(
                          (message.data as { summary?: unknown }).summary ?? "",
                        )
                      : ""}
                </div>
              )}
          </div>

          {/* Action Row & Version Switcher for User Messages */}
          {isUser && (
            <div className="flex items-center gap-2 mt-1.5 justify-end select-none">
              {/* Version Switcher < 1 / 2 > */}
              {message.versions && message.versions.length > 1 && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-700/60 select-none">
                  <button
                    onClick={() => {
                      const currentIdx = message.currentVersionIndex || 0;
                      if (currentIdx > 0 && onSwitchVersion) {
                        onSwitchVersion(message.id, currentIdx - 1);
                      }
                    }}
                    disabled={(message.currentVersionIndex || 0) <= 0}
                    className="hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 p-0.5 transition-colors"
                    title="Previous version"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[11px] px-1 select-none">
                    {(message.currentVersionIndex || 0) + 1} / {message.versions.length}
                  </span>
                  <button
                    onClick={() => {
                      const currentIdx = message.currentVersionIndex || 0;
                      if (currentIdx < (message.versions?.length || 1) - 1 && onSwitchVersion) {
                        onSwitchVersion(message.id, currentIdx + 1);
                      }
                    }}
                    disabled={(message.currentVersionIndex || 0) >= (message.versions?.length || 1) - 1}
                    className="hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 p-0.5 transition-colors"
                    title="Next version"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Edit message"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>

              {/* Copy Prompt Button */}
              <button
                onClick={handleCopy}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Copy prompt text"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              <span className="text-[0.65rem] text-muted-foreground/70 ml-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}

          {/* Action Row for Assistant Messages (Copy, Like, Dislike, Retry) */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-1.5 mt-2 text-zinc-400 dark:text-zinc-500 select-none">
              {/* Copy Response Button */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-green-500 text-[11px] font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium">Copy</span>
                  </>
                )}
              </button>

              {/* Like Button */}
              <button
                onClick={() => setFeedback(feedback === "like" ? null : "like")}
                className={cn(
                  "p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                  feedback === "like"
                    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40"
                    : "hover:text-zinc-700 dark:hover:text-zinc-200"
                )}
                title="Good response"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>

              {/* Dislike Button */}
              <button
                onClick={() => setFeedback(feedback === "dislike" ? null : "dislike")}
                className={cn(
                  "p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                  feedback === "dislike"
                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                    : "hover:text-zinc-700 dark:hover:text-zinc-200"
                )}
                title="Poor response"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>

              {/* Retry / Regenerate Button */}
              {onRetry && (
                <button
                  onClick={() => onRetry(message.id)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors ml-1"
                  title="Regenerate response"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium">Retry</span>
                </button>
              )}

              <span className="text-[0.65rem] text-muted-foreground/70 ml-2">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

export interface SupportChatContainerProps {
  chatId?: string;
  isOverview?: boolean;
}

export function SupportChatContainer({ chatId, isOverview = false }: SupportChatContainerProps = {}) {
  const router = useRouter();
  // const { isLoaded } = useUser();
  const { data } = useSWR("/api/auth/current-user", currentUserFetcher);
  const { data: profileData } = useSWR("/api/auth/profile", currentUserFetcher);
  const isLoaded = Boolean(data);
  const mongoUser = data?.user;
  const userId = mongoUser?.user_id || mongoUser?._id || null;
  const userRole = mongoUser?.role || null;
  const userSubRole = profileData?.user?.subrole || profileData?.user?.sub_role || mongoUser?.subrole || mongoUser?.sub_role || null;

  const { rightSidebarOpen, setRightSidebarOpen } = useSidebar();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile sidebar

  // NEW STATE: Array of all chat sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  // NEW STATE: ID of the currently active session
  const [activeChatId, setActiveChatId] = useState<string | null>(chatId || null);
  // Ref to track active chat ID synchronously (avoids race condition in addMessage)
  const activeChatIdRef = useRef<string | null>(chatId || null);

  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const [input, setInput] = useState("");
  const [showAttachDropdown, setShowAttachDropdown] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [chatPlaceholder, setChatPlaceholder] = useState("How can I help you today?");
  const attachDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize dynamic prop changes (e.g. on route change / redirect) to local state
  useEffect(() => {
    if (isOverview) {
      setActiveChatId(null);
      activeChatIdRef.current = null;
    } else if (chatId) {
      setActiveChatId(chatId);
      activeChatIdRef.current = chatId;
    }
  }, [chatId, isOverview]);

  useEffect(() => {
    const placeholders = [
      "How can I help you today?",
      "Ask anything, generate, analyze, or create...",
      "What are we building today?",
      "Ask me about your active tasks or projects...",
      "Need help writing code or summarizing a project?",
      "How can I assist you with your workspace today?",
      "Ask me to analyze your weekly progress...",
      "Type a prompt or select a command below...",
      "Looking for recommendations? Try /recommend.",
      "Let's get some work done. What's on your mind?",
      "Draft an update, check tasks, or ask a question...",
      "Describe what you need, and I'll generate it...",
      "Ask me about your GitHub activity or commits...",
      "Need a quick project summary? Just ask.",
      "Ready to help you analyze, create, or plan..."
    ];
    const randomIndex = Math.floor(Math.random() * placeholders.length);
    setChatPlaceholder(placeholders[randomIndex]);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (attachDropdownRef.current && !attachDropdownRef.current.contains(e.target as Node)) {
        setShowAttachDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const payload = file.type.startsWith("image/")
          ? { image: { file: base64, fileType: file.type } }
          : { pdf: { file: base64, fileType: file.type } };

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (res.ok) {
            const url =
              data.results?.image?.secure_url ||
              data.results?.pdf?.secure_url ||
              "";
            if (url) {
              setAttachedFiles((prev) => [...prev, { name: file.name, url }]);
              setInput((prev) => prev ? `${prev} [Attached: ${file.name}]` : `[Attached: ${file.name}]`);
            }
          } else {
            console.error("Upload failed", data);
          }
        } catch (err) {
          console.error("Upload error", err);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error reading file", err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState>({
    show: false,
    message: "",
    type: "general",
    retryable: false,
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<any>(null);
  const [localIsLoading, setLocalIsLoading] = useState(false);

  const {
    askQuestion,
    getRecommendations,
    getNextAction,
    getMyProgress,
    getCompleteProfile,
    getMyAllTask,
    getMyProjects,
    getMyProjectPlans,
    getMypull_requests,
    getMyCodeFeedback,
    getMyNotifications,
    isLoading,
    isAuthenticated,
    error: hookError,
    ensureSupportAgentToken,
  } = useSupportAgent();

  const dispatch = useAppDispatch();

  // ── Stats data for empty-state cards (same as overview page) ──
  const allProjects = useAppSelector((state) => state.project.projects) || [];
  const allTasks = useAppSelector((state) => state.task.tasks) || [];
  const userProfile = useAppSelector((state) => state.user.userProfile);

  const statsRole = (userProfile as any)?.role;
  const statsUserId = String(userProfile?._id || (userProfile as any)?.id || "");
  const statsUserEmail = userProfile?.email || "";

  // Filter projects belonging to the current user
  const statsUserProjects = useMemo(() => {
    return allProjects.filter((project) => {
      if (statsRole === "company" || statsRole === "college") {
        const ownerId = String((project as any).company_id || (project as any).college_id || (project as any).user_id || "");
        return ownerId === statsUserId;
      }
      const memberFound = (project.team ?? []).some((member: any) => {
        const candidate = member.user || member._id;
        return candidate === statsUserId || member.email === statsUserEmail;
      });
      if (memberFound) return true;
      return (project.team_members ?? []).some((member: any) => {
        const candidate = member.user || member._id;
        return candidate === statsUserId || member.email === statsUserEmail;
      });
    });
  }, [allProjects, statsRole, statsUserId, statsUserEmail]);

  // Filter tasks belonging to user's projects
  const statsUserProjectIds = useMemo(() => new Set(allProjects.map((p) => p._id)), [allProjects]);
  const statsUserTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const taskProjectId = task.project_id || (task as any).project;
      return statsUserProjectIds.has(taskProjectId);
    });
  }, [allTasks, statsUserProjectIds]);

  const statsTotalTasks = statsUserTasks.length;
  const statsCompletedTasks = statsUserTasks.filter((t) => t.status === "completed").length;
  const statsBlockedTasks = statsUserTasks.filter((t) => t.status === "blocked").length;
  const statsOverdueTasks = statsUserTasks.filter(
    (t) => t.due_date && t.status !== "completed" && new Date(t.due_date).getTime() < Date.now()
  ).length;
  const statsActiveProjects = statsUserProjects.filter((p) =>
    ["planning", "in-progress", "on-hold"].includes(p.status)
  ).length;
  const statsCompletedProjects = statsUserProjects.filter((p) => p.status === "completed").length;
  const statsCompletionRate = statsTotalTasks ? Math.round((statsCompletedTasks / statsTotalTasks) * 100) : 0;

  // Team members count
  const statsIsCompany = statsRole === "company";
  const companyMembers = Array.isArray((userProfile as any)?.members) ? (userProfile as any).members : [];
  const statsActiveMembers = statsIsCompany
    ? companyMembers.filter((m: any) => m.status === "active").length
    : (() => {
        const memberSet = new Set<string>();
        statsUserProjects.forEach((project) => {
          (project.team ?? []).forEach((member: any) => {
            const id = member.user || member._id || member.email;
            if (id) memberSet.add(String(id));
          });
          (project.team_members ?? []).forEach((member: any) => {
            const id = member.user || member._id || member.email;
            if (id) memberSet.add(String(id));
          });
        });
        return memberSet.size;
      })();

  const supportSocket = useSupportSocket();

  // Helper to update specific message in state (useful for streaming)
  const updateMessage = (chatId: string, messageId: string, content: string, data?: any) => {
    setChatSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id !== chatId) return session;
        return {
          ...session,
          messages: session.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
            return {
              ...msg,
              content,
              data: data !== undefined ? data : msg.data,
            };
          }),
        };
      });
    });
  };

  // Derived State for the Active Chat
  const activeChat = useMemo(
    () => chatSessions.find((c) => c.id === activeChatId),
    [chatSessions, activeChatId],
  );
  const messages = activeChat?.messages || [];

  // Hide loader once we start streaming actual tokens inside the assistant bubble
  const isStreamingResponse =
    localIsLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content.trim() !== "";

  const chatIsLoading = (localIsLoading || isLoading) && !isStreamingResponse;

  // --- Core Chat Management Functions ---

  const createNewChat = () => {
    // If the currently active chat has no messages, don't create another empty one.
    if (activeChatId) {
      const activeSession = chatSessions.find((s) => s.id === activeChatId);
      if (activeSession && activeSession.messages.length === 0) {
        setIsMobileSidebarOpen(false);
        return;
      }
    }
    const newChat: ChatSession = {
      id: genId(),
      title: "New Chat",
      messages: [],
      timestamp: new Date(),
    };
    setChatSessions((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    activeChatIdRef.current = newChat.id;
    setIsMobileSidebarOpen(false); // Close sidebar on mobile after starting new chat
  };

  const deleteChat = async (id: string) => {
    // If this looks like a server-side chat id, request server-side soft-delete
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        // optimistic UI: remove immediately
        setChatSessions((prev) => prev.filter((c) => c.id !== id));
        if (activeChatId === id) {
          const newActiveId =
            chatSessions.length > 1
              ? chatSessions.filter((c) => c.id !== id)[0]?.id
              : null;
          setActiveChatId(newActiveId);
          activeChatIdRef.current = newActiveId;
          if (chatSessions.length === 1) createNewChat();
        }

        const action = await dispatch(deleteSupportChat({ chatId: id }));
        // if rejected, the thunk will throw when unwrapped; here we assume success
        return;
      } catch (err) {
        console.error("Failed to delete chat on server", err);
        // rollback: re-fetch server sessions to restore state
        try {
          await dispatch(fetchSupportChats());
        } catch (e) {
          /* ignore */
        }
        setErrorState((prev) => ({
          ...prev,
          show: true,
          message: "Failed to delete chat on server",
          type: "general",
          retryable: true,
        }));
        return;
      }
    }

    // Local-only chat: remove from local state
    setChatSessions((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      const newActiveId =
        chatSessions.length > 1
          ? chatSessions.filter((c) => c.id !== id)[0]?.id
          : null;
      setActiveChatId(newActiveId);
      activeChatIdRef.current = newActiveId;
      if (chatSessions.length === 1) createNewChat();
    }
  };

  const togglePinChat = (id: string) => {
    setChatSessions((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.timestamp.getTime() - a.timestamp.getTime();
        }),
    );
  };

  const beginRenameChat = (id: string) => {
    const session = chatSessions.find((s) => s.id === id);
    if (!session) return;
    setRenamingId(id);
    setRenamingValue(session.title);
  };

  const saveRename = (id: string) => {
    // Optimistic update: update local UI immediately
    setChatSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: renamingValue } : s)),
    );
    setRenamingId(null);
    setRenamingValue("");

    // If this looks like a server-side chat id, persist to server
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      (async () => {
        try {
          await dispatch(
            updateSupportChatTitle({ chatId: id, title: renamingValue }),
          );
        } catch (err) {
          console.error("Failed to persist chat title", err);
          // rollback by re-fetching server sessions
          try {
            await dispatch(fetchSupportChats());
          } catch (e) {
            /* ignore */
          }
          setErrorState((prev) => ({
            ...prev,
            show: true,
            message: "Failed to save chat title",
            type: "general",
            retryable: true,
          }));
        }
      })();
    } else {
      // local-only session: localStorage persistence handled by effect
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenamingValue("");
  };

  const updateChatMessages = (newMessages: Message[], newTitle?: string) => {
    if (!activeChatId) return;

    setChatSessions(
      (prevSessions) =>
        prevSessions
          .map((session) => {
            if (session.id === activeChatId) {
              return {
                ...session,
                messages: newMessages,
                timestamp: new Date(),
                title: newTitle || session.title, // Only update title if provided
              };
            }
            return session;
          })
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()), // Sort by last activity
    );
  };

  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      id: genId(),
      timestamp: new Date(),
      ...message,
    };
    // Use the ref for synchronous access to active chat ID (avoids race condition)
    const currentActiveChatId = activeChatIdRef.current;

    // If there's no active chat session yet, create one so the user's message is visible immediately
    if (!currentActiveChatId) {
      const newChatId = genId();
      const titlePreview =
        message.role === "user"
          ? message.content.split(/\s+/).slice(0, 5).join(" ") +
            (message.content.split(/\s+/).length > 5 ? "..." : "")
          : "New Chat";

      const newSession: ChatSession = {
        id: newChatId,
        title: titlePreview || "New Chat",
        messages: [newMessage],
        timestamp: new Date(),
      };

      setChatSessions((prev) => [newSession, ...prev]);
      setActiveChatId(newChatId);
      // Update ref immediately so subsequent calls use the new chat ID
      activeChatIdRef.current = newChatId;
      return newMessage;
    }
    // Append message to the currently active chat using the latest state to avoid stale closures
    setChatSessions((prevSessions) => {
      const updated = prevSessions.map((session) => {
        if (session.id !== currentActiveChatId) return session;
        const updatedMessages = [...session.messages, newMessage];
        let updatedTitle = session.title;
        if (
          (updatedTitle === "New Chat" ||
            updatedTitle === "Support Chat" ||
            !updatedTitle ||
            updatedMessages.length === 1) &&
          message.role === "user"
        ) {
          updatedTitle =
            message.content.split(/\s+/).slice(0, 5).join(" ") +
            (message.content.split(/\s+/).length > 5 ? "..." : "");
        }
        return {
          ...session,
          messages: updatedMessages,
          title: updatedTitle,
          timestamp: new Date(),
        };
      });

      // Keep sessions sorted by latest timestamp
      return updated.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    });

    return newMessage;
  };

  const addMessages = (newMessagesList: Omit<Message, "id" | "timestamp">[]) => {
    const formattedMessages = newMessagesList.map((msg) => ({
      id: genId(),
      timestamp: new Date(),
      ...msg,
    }));

    const currentActiveChatId = activeChatIdRef.current;

    if (!currentActiveChatId) {
      const newChatId = genId();
      const firstUserMessage = newMessagesList.find(m => m.role === "user");
      const titlePreview = firstUserMessage
        ? firstUserMessage.content.split(/\s+/).slice(0, 5).join(" ") +
          (firstUserMessage.content.split(/\s+/).length > 5 ? "..." : "")
        : "New Chat";

      const newSession: ChatSession = {
        id: newChatId,
        title: titlePreview || "New Chat",
        messages: formattedMessages,
        timestamp: new Date(),
      };

      setChatSessions((prev) => [newSession, ...prev]);
      setActiveChatId(newChatId);
      activeChatIdRef.current = newChatId;
      return formattedMessages;
    }

    setChatSessions((prevSessions) => {
      const updated = prevSessions.map((session) => {
        if (session.id !== currentActiveChatId) return session;
        const updatedMessages = [...session.messages, ...formattedMessages];
        return {
          ...session,
          messages: updatedMessages,
          timestamp: new Date(),
        };
      });

      return updated.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    });

    return formattedMessages;
  };

  // Clean up timers on unmount — socket lifecycle is managed by SupportSocketProvider
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  // --- Effects for Persistence and Initialization ---

  // 1. Load History from Local Storage (per-user)
  useEffect(() => {
    if (isLoaded && userId && typeof window !== "undefined") {
      const storedHistory = localStorage.getItem(getChatHistoryKey(userId));
      if (storedHistory) {
        try {
          const raw: any[] = JSON.parse(storedHistory);

          // Migrate and rehydrate sessions/messages, ensuring unique ids
          const seenSessionIds = new Set<string>();
          const seenMessageIds = new Set<string>();

          const parsedSessions: ChatSession[] = (raw || []).map(
            (session: any) => {
              const sessionId =
                session.id && !seenSessionIds.has(String(session.id))
                  ? String(session.id)
                  : genId();
              seenSessionIds.add(sessionId);

              const messages: Message[] = (session.messages || []).map(
                (msg: any) => {
                  const msgId =
                    msg && msg.id && !seenMessageIds.has(String(msg.id))
                      ? String(msg.id)
                      : genId();
                  seenMessageIds.add(msgId);

                  // If message.content is an object (old saved shape) or a JSON string, migrate it into `data` and generate readable content
                  let content = msg.content;
                  let data =
                    typeof msg.data !== "undefined" ? msg.data : undefined;
                  let msgType = msg.type || undefined;

                  // If content is a JSON string, try to parse it
                  if (
                    typeof content === "string" &&
                    content.trim().length > 0 &&
                    (content.trim().startsWith("{") ||
                      content.trim().startsWith("["))
                  ) {
                    try {
                      const parsed = JSON.parse(content);
                      content = parsed;
                    } catch (e) {
                      // leave as string
                    }
                  }

                  if (content && typeof content === "object") {
                    data = content;
                    // detect type from payload when possible
                    msgType = msgType || detectMessageType(data) || "text";
                    try {
                      content = formatAssistantResponse(
                        data,
                        msg.type || msgType || "text",
                      );
                    } catch (e) {
                      content = JSON.stringify(data);
                    }
                  }

                  return {
                    id: msgId,
                    role: msg.role,
                    content,
                    timestamp: new Date(msg.timestamp),
                    type: msgType,
                    data,
                  } as Message;
                },
              );

              return {
                id: sessionId,
                title: session.title || "New Chat",
                messages,
                timestamp: session.timestamp
                  ? new Date(session.timestamp)
                  : new Date(),
                pinned: !!session.pinned,
              } as ChatSession;
            },
          );
          // Sort loaded sessions so pinned chats remain at the top, then by last activity
          const sortedLocal = parsedSessions.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.timestamp.getTime() - a.timestamp.getTime();
          });
          setChatSessions(sortedLocal);
          if (isOverview) {
            setActiveChatId(null);
            activeChatIdRef.current = null;
          } else if (chatId) {
            setActiveChatId(chatId);
            activeChatIdRef.current = chatId;
          } else if (sortedLocal.length > 0) {
            // Set most recent (by timestamp) as active
            const mostRecent = sortedLocal.reduce((a, b) =>
              a.timestamp > b.timestamp ? a : b,
            );
            setActiveChatId(mostRecent.id);
            activeChatIdRef.current = mostRecent.id;
          } else {
            // Do not auto-create a new chat. Leave chatSessions empty and no active chat.
          }
        } catch (e) {
          console.error("Failed to parse chat history from local storage", e);
          if (typeof window !== "undefined") {
            localStorage.removeItem(getChatHistoryKey(userId));
          }
          // Do not auto-create a new chat.
        }
      } else {
        // Do not auto-create a new chat.
      }
      // Always try to fetch server-side persisted chats when user is loaded
      // The API will return 401 if not authenticated, which is handled gracefully
      (async () => {
        try {
          const action = await dispatch(fetchSupportChats());
          // the thunk returns payload in action.payload when fulfilled; guard its type
          const serverChats = Array.isArray(action.payload)
            ? (action.payload as any[])
            : [];
          if (serverChats.length > 0) {
            // Map server chats to local ChatSession shape
            const mapped = serverChats.map((s) => ({
              id: String(s.id),
              title: s.title || "Support Chat",
              messages: (s.messages || []).map((m: any) => {
                // Normalize server-provided message: if `content` is an object or JSON string, migrate to `data` and generate readable `content`
                const rawContent = m.content;
                let content = rawContent;
                let data = typeof m.data !== "undefined" ? m.data : undefined;
                let msgType = m.type || undefined;

                // If content is a JSON string, attempt to parse
                if (
                  typeof content === "string" &&
                  content.trim().length > 0 &&
                  (content.trim().startsWith("{") ||
                    content.trim().startsWith("["))
                ) {
                  try {
                    const parsed = JSON.parse(content);
                    content = parsed;
                  } catch (e) {
                    // leave as string
                  }
                }

                if (content && typeof content === "object") {
                  data = content;
                  // detect a better message type for server-provided payloads
                  msgType = msgType || detectMessageType(data) || "text";
                  try {
                    content = formatAssistantResponse(data, msgType);
                  } catch (e) {
                    content = JSON.stringify(data);
                  }
                }

                return {
                  id: m._id ? String(m._id) : genId(),
                  role: m.role,
                  content,
                  timestamp: new Date(m.timestamp),
                  type: msgType,
                  data: data,
                };
              }),
              timestamp: s.lastActivity ? new Date(s.lastActivity) : new Date(),
              pinned: false,
            }));

            // Merge server chats with local sessions, preferring server copies for matching titles/messages
            setChatSessions((prev) => {
              // Build simple dedupe key by title + first assistant message
              const existingKeys = new Set(
                prev.map(
                  (p) =>
                    `${p.title}::${(p.messages[0]?.content || "").slice(
                      0,
                      80,
                    )}`,
                ),
              );
              const filteredServer = mapped.filter((m) => {
                const key = `${m.title}::${(m.messages[0]?.content || "").slice(
                  0,
                  80,
                )}`;
                return !existingKeys.has(key);
              });

              // Merge server chats with local sessions, preserving any local pinned flags.
              const merged = [...filteredServer, ...prev];
              // Ensure pinned chats are kept at top then sort by timestamp
              const mergedSorted = merged.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return b.timestamp.getTime() - a.timestamp.getTime();
              });
              // Persist merged result to local storage
              if (userId) {
                safeSaveChatHistory(mergedSorted, activeChatIdRef.current, userId);
              }
              // Set active chat based on props
              if (isOverview) {
                setActiveChatId(null);
                activeChatIdRef.current = null;
              } else if (chatId) {
                setActiveChatId(chatId);
                activeChatIdRef.current = chatId;
              } else if (mergedSorted.length > 0) {
                const mostRecent = mergedSorted.reduce((a, b) =>
                  a.timestamp > b.timestamp ? a : b,
                );
                setActiveChatId(mostRecent.id);
                activeChatIdRef.current = mostRecent.id;
              }
              return mergedSorted;
            });
          }
        } catch (err) {
          console.warn("Failed to sync server-side chats", err);
        }
      })();
    }
  }, [isLoaded, dispatch, userId]); // Run when isLoaded changes, dispatch for fetching server chats

  // 2. Save History to Local Storage (per-user)
  useEffect(() => {
    if (userId) {
      safeSaveChatHistory(chatSessions, activeChatId, userId);
    }
  }, [chatSessions, activeChatId, userId]);

  // 3. Mount and Scroll
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Fetch projects/tasks so stats cards in the empty state have data
  useEffect(() => {
    if (isLoaded && userId) {
      void dispatch(fetchProjects());
    }
  }, [isLoaded, userId, dispatch]);

  // 5. Auto-trigger response for newly redirected overview chats
  useEffect(() => {
    if (isOverview || !activeChatId || !activeChat) return;

    if (activeChat.messages.length === 1) {
      const firstMsg = activeChat.messages[0];
      if (firstMsg.role === "user" && !localIsLoading && !isLoading) {
        const sessionKey = `auto_respond_triggered_${activeChatId}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "true");
          
          const content = firstMsg.content || "";
          const quickActionMatch = content.match(/^Show me my (.+)$/);
          
          if (quickActionMatch) {
            const actionType = quickActionMatch[1];
            handleQuickAction(actionType, true);
          } else {
            sendMessage(content, true);
          }
        }
      }
    }
  }, [activeChatId, activeChat, isOverview, localIsLoading, isLoading]);

  // Network monitoring & Error Handling (same as your original code)
  // ... (Keep the handleError, useEffect for hookError, and network monitoring effects)
  // ... (The retryLastAction and clearError functions need to be updated to handle the new state flow, but for brevity, we'll assume they call sendMessage/handleQuickAction which use the new addMessage/updateChatMessages)

  const handleError = useCallback(
    (error: Error, actionType: string = "general") => {
      // ... (Your existing error logic, ensure it does NOT use setMessages directly)
      console.error(`Error in ${actionType}:`, error);

      let errorType: ErrorState["type"] = "general";
      let retryable = true;
      let message = "Something went wrong. Please try again.";

      // Network errors
      if (
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        !navigator.onLine
      ) {
        errorType = "network";
        message = "Network error. Check your connection and try again.";
      }
      // ... (rest of error logic)

      setErrorState({
        show: true,
        message,
        type: errorType,
        retryable,
        lastFailedAction: actionType,
      });

      if (retryable && errorType !== "network") {
        setTimeout(() => {
          setErrorState((prev) => ({ ...prev, show: false }));
        }, 5000);
      }
    },
    [],
  ); // Re-using your existing handleError logic

  const retryLastAction = async () => {
    // ... (logic to retry last action, updated to use current active chat's messages)
    if (!errorState.lastFailedAction || retryCount >= 3) {
      setErrorState({
        show: true,
        message: "Maximum retry attempts reached. Please refresh the page.",
        type: "general",
        retryable: false,
      });
      return;
    }

    setRetryCount((prev) => prev + 1);
    setErrorState((prev) => ({ ...prev, show: false }));

    try {
      if (errorState.lastFailedAction.startsWith("quick-")) {
        const actionType = errorState.lastFailedAction.replace("quick-", "");
        await handleQuickAction(actionType);
      } else if (errorState.lastFailedAction === "sendMessage") {
        const lastUserMessage = messages.filter((m) => m.role === "user").pop();
        if (lastUserMessage) {
          await sendMessage(lastUserMessage.content);
        }
      }
      setRetryCount(0);
    } catch (error) {
      handleError(error as Error, errorState.lastFailedAction);
    }
  };

  const clearError = () => {
    setErrorState((prev) => ({ ...prev, show: false }));
    setRetryCount(0);
  };

  // --- Message Sending Logic (Updated to use new state functions) ---

  const sendMessage = async (messageText?: string, isAutoTrigger = false) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || chatIsLoading || !isOnline) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (!isAutoTrigger) {
      addMessage({
        role: "user",
        content: textToSend,
        type: "text",
      });
    }

    if (!messageText) {
      setInput("");
    }

    const currentActiveChatId = activeChatIdRef.current;

    const assistantMessageId = genId();
    const newAssistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      type: "text",
    };

    setChatSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id !== currentActiveChatId) return session;
        return {
          ...session,
          messages: [...session.messages, newAssistantMessage],
          timestamp: new Date(),
        };
      });
    });

    setLocalIsLoading(true);

    let cleanupHandler: (() => void) | null = null;

    try {
      const token = await ensureSupportAgentToken();
      if (!token) {
        throw new Error("Unable to obtain authorization token. Please login again.");
      }

      if (!supportSocket.isConnected) {
        await supportSocket.connect(currentActiveChatId || "default-session");
      }

      let accumulatedResponse = "";

      await new Promise<void>((resolve, reject) => {
        cleanupHandler = supportSocket.onMessage((data: any) => {
          if (data.type === "token") {
            accumulatedResponse += data.content || "";
            updateMessage(currentActiveChatId!, assistantMessageId, accumulatedResponse);
          } else if (data.type === "message_complete") {
            const finalAnswer = data.content?.answer || accumulatedResponse;
            updateMessage(currentActiveChatId!, assistantMessageId, finalAnswer, data.content?.context_used);

            if (finalAnswer && finalAnswer.trim()) {
              try {
                const maybeChatId =
                  currentActiveChatId && /^[0-9a-fA-F]{24}$/.test(currentActiveChatId)
                    ? currentActiveChatId
                    : undefined;
                dispatch(
                  saveSupportChat({
                    question: textToSend,
                    response: finalAnswer,
                    title: textToSend.slice(0, 80),
                    type: "text",
                    data: data.content?.context_used,
                    chatId: maybeChatId,
                  }),
                );
              } catch (e) {
                console.error("Failed to save chat to server", e);
              }
            }
            resolve();
          } else if (data.type === "error") {
            const errMsg = data.content?.message || "Error processing your request.";
            updateMessage(currentActiveChatId!, assistantMessageId, `❌ ${errMsg}`);
            resolve();
          }
        });

        if (!supportSocket.send(JSON.stringify({ query: textToSend }))) {
          reject(new Error("Failed to send message over WebSocket"));
        }
      });

      setErrorState((prev) => ({ ...prev, show: false }));
      setRetryCount(0);
      setLocalIsLoading(false);

      if (cleanupHandler) cleanupHandler();

    } catch (error) {
      if (cleanupHandler) cleanupHandler();
      console.error("[WS Setup Error]:", error);
      setLocalIsLoading(false);
      handleError(error as Error, "sendMessage");
      updateMessage(
        currentActiveChatId!,
        assistantMessageId,
        `❌ Connection issue: ${(error as Error).message}`
      );
    }
  };

  const handleQuickAction = async (actionType: string, isAutoTrigger = false) => {
    if (chatIsLoading || !isOnline) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (!isAutoTrigger) {
      addMessage({
        role: "user",
        content: `Show me my ${actionType}`,
        type: "text",
      });
    }

    try {
      let response: any;
      let messageType: Message["type"] = "text";

      // ... (Switch case for quick actions remains the same)
      switch (actionType) {
        case "recommendations":
          response = await getRecommendations();
          messageType = "recommendations";
          break;
        case "progress":
          response = await getMyProgress();
          messageType = "progress";
          break;
        case "next action":
          response = await getNextAction();
          messageType = "action";
          break;
        case "complete profile":
          response = await getCompleteProfile();
          messageType = "profile";
          break;
        case "all tasks":
          response = await getMyAllTask();
          messageType = "text";
          break;
        case "projects":
          response = await getMyProjects();
          messageType = "text";
          break;
        case "project plans":
          response = await getMyProjectPlans();
          messageType = "text";
          break;
        case "pull requests":
          response = await getMypull_requests();
          messageType = "text";
          break;
        case "code feedback":
          response = await getMyCodeFeedback();
          messageType = "code-feedback";
          break;
        case "notifications":
          response = await getMyNotifications();
          messageType = "notifications";
          break;
        default:
          throw new Error("Unknown action type");
      }

      let content = formatAssistantResponse(response, messageType);

      addMessage({
        role: "assistant",
        content,
        type: messageType,
        data: response,
      });

      // Persist quick-action question + response (only if we have meaningful content)
      if (content && content.trim()) {
        try {
          const maybeChatId =
            activeChatId && /^[0-9a-fA-F]{24}$/.test(activeChatId)
              ? activeChatId
              : undefined;
          dispatch(
            saveSupportChat({
              question: `Show me my ${actionType}`,
              response: content,
              title: `Quick: ${actionType}`,
              type: messageType,
              data: response,
              chatId: maybeChatId,
            }),
          );
        } catch (e) {
          console.error("Failed to save quick-action chat", e);
        }
      } else {
        console.warn(
          `Skipping save for quick action ${actionType} - empty response content`,
        );
      }

      setErrorState((prev) => ({ ...prev, show: false }));
      setRetryCount(0);
    } catch (error) {
      handleError(error as Error, `quick-${actionType}`);
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      addMessage({
        role: "assistant",
        content: `❌ Sorry, I couldn't fetch your ${actionType} right now. ${errMsg}`,
        type: "text",
      });
    }
  };

  const quickActions: QuickAction[] = [
    {
      label: "Notifications",
      action: () => handleQuickAction("notifications"),
      icon: <Bell className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "Code Feedback",
      action: () => handleQuickAction("code feedback"),
      icon: <MessageSquareCode className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "Pull Requests",
      action: () => handleQuickAction("pull requests"),
      icon: <GitPullRequest className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "Project Plans",
      action: () => handleQuickAction("project plans"),
      icon: <ClipboardList className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "My Projects",
      action: () => handleQuickAction("projects"),
      icon: <Folder className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "My Progress",
      action: () => handleQuickAction("progress"),
      icon: <BarChart3 className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "Recommendations",
      action: () => handleQuickAction("recommendations"),
      icon: <TrendingUp className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "Next Action",
      action: () => handleQuickAction("next action"),
      icon: <Target className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "Full Profile",
      action: () => handleQuickAction("complete profile"),
      icon: <User className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
    {
      label: "All Tasks",
      action: () => handleQuickAction("all tasks"),
      icon: <List className="h-4 w-4" />,
      disabled: !isAuthenticated || chatIsLoading || !isOnline,
    },
  ];

  // ── Input change handler with slash command detection ──
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Detect slash command trigger
    if (value.startsWith("/")) {
      setShowSlashMenu(true);
      setSlashQuery(value);
    } else {
      setShowSlashMenu(false);
      setSlashQuery("");
    }
  };

  // ── Slash command selection handler ──
  const handleSlashCommandSelect = (cmd: SlashCommand) => {
    setShowSlashMenu(false);
    setSlashQuery("");
    setInput("");

    // Handle /help specially
    if (cmd.actionKey === "__help__") {
      const helpText = generateHelpText(userRole, userSubRole);
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: helpText, type: "text" },
      ]);
      return;
    }

    // Handle /create project specially
    if (cmd.name === "/create project") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please fill out this form to set up a new project:", type: "form-create-project" },
      ]);
      return;
    }

    // Handle /create task specially
    if (cmd.name === "/create task") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please fill out this form to set up a new task:", type: "form-create-task" },
      ]);
      return;
    }

    // Handle /create plan specially
    if (cmd.name === "/create plan") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please fill out this form to generate a new project plan:", type: "form-create-plan" },
      ]);
      return;
    }

    // Handle /generate tasks specially
    if (cmd.name === "/generate tasks") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please select a project to generate tasks for:", type: "form-generate-tasks" },
      ]);
      return;
    }

    // Handle /generate subtasks specially
    if (cmd.name === "/generate subtasks") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please select a task to generate subtasks for:", type: "form-generate-subtasks" },
      ]);
      return;
    }

    // Handle /create assessment specially
    if (cmd.name === "/create assessment") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please select a project to create an AI assessment for:", type: "form-create-assessment" },
      ]);
      return;
    }

    // Handle /delete task specially
    if (cmd.name === "/delete task") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please select a task to delete:", type: "form-delete-task" },
      ]);
      return;
    }

    // Handle /delete project specially
    if (cmd.name === "/delete project") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please select a project to delete:", type: "form-delete-project" },
      ]);
      return;
    }

    // Handle /update task specially
    if (cmd.name === "/update task") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please select a task to update status or priority:", type: "form-update-task" },
      ]);
      return;
    }

    // Handle /link github specially
    if (cmd.name === "/link github") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please connect your GitHub account below:", type: "form-link-github" },
      ]);
      return;
    }

    // Handle /sync github specially
    if (cmd.name === "/sync github") {
      addMessages([
        { role: "user", content: cmd.name, type: "text" },
        { role: "assistant", content: "Please enter your GitHub username to sync recent data:", type: "form-sync-github" },
      ]);
      return;
    }

    if (cmd.isQuickAction) {
      // Trigger the existing quick action handler
      handleQuickAction(cmd.actionKey);
    } else {
      // Send as a free-text message to the agent
      sendMessage(cmd.actionKey);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Don't handle Enter when slash menu is visible (it's handled by the menu)
    if (showSlashMenu) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Check if input is a slash command
      const cmd = matchSlashCommand(input, userRole, userSubRole);
      if (cmd) {
        handleSlashCommandSelect(cmd);
      } else {
        sendMessage();
      }
    }
  };

  const handleUpdateMessageContent = (messageId: string, newContent: string) => {
    setChatSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id !== activeChatIdRef.current) return session;
        return {
          ...session,
          messages: session.messages.map((m) =>
            m.id === messageId ? { ...m, content: newContent, type: "text" } : m
          ),
        };
      });
    });
  };

  const handleEditSubmit = useCallback(
    async (messageId: string, newContent: string) => {
      const activeSession = chatSessions.find((s) => s.id === activeChatIdRef.current);
      if (!activeSession) return;

      const userMsgIdx = activeSession.messages.findIndex((m) => m.id === messageId);
      if (userMsgIdx === -1) return;

      const userMsg = activeSession.messages[userMsgIdx];
      const assistantMsg = activeSession.messages[userMsgIdx + 1];

      const existingVersions: MessageVersion[] = userMsg.versions
        ? [...userMsg.versions]
        : [
            {
              id: genId(),
              userContent: userMsg.content,
              assistantContent: assistantMsg ? assistantMsg.content : "",
              timestamp: userMsg.timestamp,
            },
          ];

      const newVersionIndex = existingVersions.length;
      const newVersionObj: MessageVersion = {
        id: genId(),
        userContent: newContent,
        assistantContent: "",
        timestamp: new Date(),
      };
      existingVersions.push(newVersionObj);

      setChatSessions((prevSessions) => {
        return prevSessions.map((session) => {
          if (session.id !== activeChatIdRef.current) return session;

          const updatedMessages = [...session.messages];
          updatedMessages[userMsgIdx] = {
            ...userMsg,
            content: newContent,
            versions: existingVersions,
            currentVersionIndex: newVersionIndex,
          };

          if (assistantMsg && assistantMsg.role === "assistant") {
            updatedMessages[userMsgIdx + 1] = {
              ...assistantMsg,
              content: "",
            };
          }

          return {
            ...session,
            messages: updatedMessages,
          };
        });
      });

      await sendMessage(newContent, true);
    },
    [chatSessions, sendMessage]
  );

  const handleSwitchVersion = useCallback(
    (messageId: string, targetIndex: number) => {
      setChatSessions((prevSessions) => {
        return prevSessions.map((session) => {
          if (session.id !== activeChatIdRef.current) return session;

          const userMsgIdx = session.messages.findIndex((m) => m.id === messageId);
          if (userMsgIdx === -1) return session;

          const userMsg = session.messages[userMsgIdx];
          if (!userMsg.versions || !userMsg.versions[targetIndex]) return session;

          const selectedVer = userMsg.versions[targetIndex];
          const updatedMessages = [...session.messages];

          updatedMessages[userMsgIdx] = {
            ...userMsg,
            content: selectedVer.userContent,
            currentVersionIndex: targetIndex,
          };

          if (updatedMessages[userMsgIdx + 1] && updatedMessages[userMsgIdx + 1].role === "assistant") {
            updatedMessages[userMsgIdx + 1] = {
              ...updatedMessages[userMsgIdx + 1],
              content: selectedVer.assistantContent || "",
            };
          }

          return {
            ...session,
            messages: updatedMessages,
          };
        });
      });
    },
    []
  );

  const handleRetry = useCallback(
    (assistantMessageId: string) => {
      const activeSession = chatSessions.find((s) => s.id === activeChatIdRef.current);
      if (!activeSession) return;

      const assistantIdx = activeSession.messages.findIndex((m) => m.id === assistantMessageId);
      if (assistantIdx === -1) return;

      const prevUserMsg = activeSession.messages[assistantIdx - 1];
      if (prevUserMsg && prevUserMsg.role === "user") {
        sendMessage(prevUserMsg.content, true);
      }
    },
    [chatSessions, sendMessage]
  );

  // Time-based greeting logic
  const currentHour = new Date().getHours();
  let timeGreeting = "Good evening";
  if (currentHour < 12) {
    timeGreeting = "Good morning";
  } else if (currentHour < 18) {
    timeGreeting = "Good afternoon";
  }
  const firstName = mongoUser?.full_name?.split(" ")[0] || mongoUser?.name?.split(" ")[0] || "Ayush";

  const handlePlusClick = () => {
    setInput((prev) => {
      const newValue = prev ? prev + " /" : "/";
      setShowSlashMenu(true);
      setSlashQuery(newValue);
      return newValue;
    });
  };

  const renderInputArea = (isCentered: boolean) => {
    return (
      <div className={cn(
        "relative w-full transition-all duration-300",
        showSlashMenu ? "z-[99999]" : "z-50",
        isCentered ? "max-w-5xl mx-auto" : "max-w-5xl mx-auto px-4 py-4"
      )}>
        <SlashCommandMenu
          query={slashQuery}
          isVisible={showSlashMenu}
          onSelect={handleSlashCommandSelect}
          onDismiss={() => {
            setShowSlashMenu(false);
            setSlashQuery("");
          }}
          userRole={userRole}
          userSubRole={userSubRole}
          align={isCentered ? "bottom" : "top"}
        />

        {/* Input Box - Premium container with toolbar at bottom */}
        <div className={cn(
          "flex flex-col rounded-[24px] bg-white dark:bg-[#121215] border border-zinc-200/60 dark:border-[#27272a] shadow-md transition-all duration-300 p-4",
          "focus-within:border-zinc-400 dark:focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-650",
          showSlashMenu && "border-zinc-400 dark:focus-within:border-zinc-650"
        )}>
          {/* Text Area */}
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={
              !isOnline
                ? "System offline..."
                : chatPlaceholder
            }
            disabled={chatIsLoading || !isOnline}
            rows={1}
            style={{ height: 'auto', minHeight: '44px' }}
            ref={(el) => {
              if (el) {
                // Auto grow height
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
              }
            }}
            className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 border-none ring-0 resize-none leading-relaxed py-1"
            maxLength={20000}
          />

          {/* Toolbar Row */}
          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-3 mt-2">
            {/* Left Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Add context"
                onClick={handlePlusClick}
              >
                <Plus className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors data-[state=open]:bg-zinc-100 dark:data-[state=open]:bg-zinc-800"
                    title="Attach Options"
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-52 p-1.5">
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                    onSelect={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "*/*";
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Paperclip className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>Attach File</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                    onSelect={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "image/*";
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>Attach Image</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                    onSelect={() => {
                      setInput((prev) => prev ? prev + " [Voice Note] " : "[Voice Note] ");
                    }}
                  >
                    <Mic className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>Voice Note</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                    onSelect={() => {
                      handlePlusClick();
                    }}
                  >
                    <LinkIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>Add Project Context</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileAttach}
              />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Send Button */}
              <Button
                onClick={() => {
                  const cmd = matchSlashCommand(input, userRole, userSubRole);
                  if (cmd) {
                    handleSlashCommandSelect(cmd);
                  } else {
                    sendMessage();
                  }
                }}
                disabled={!input.trim() || chatIsLoading || !isOnline}
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full transition-all duration-200",
                  input.trim()
                    ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:scale-105"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                )}
              >
                {chatIsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Character count */}
        {input.length > 0 && (
          <div className="flex justify-between items-center px-1 mt-1.5 text-[10px]">
            <span className="text-muted-foreground font-medium">
              {input.length >= 20000 && "Maximum character limit reached"}
            </span>
            <span className="transition-all duration-200 font-mono font-medium text-muted-foreground">
              {input.length.toLocaleString()}/20,000
            </span>
          </div>
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
            <WifiOff className="h-3 w-3" />
            <span>You&apos;re offline. Messages will be sent when connection is restored.</span>
          </div>
        )}
      </div>
    );
  };

  if (!isMounted || !isLoaded) {
    return null;
  }

  // --- UI RENDER (Full-Screen Developer OS Layout) ---

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-3.5rem)] w-full relative bg-[#f8f9fa] dark:bg-[#09090b] overflow-hidden">
        {/* Premium Glassmorphic Orbs & Grids (Unified Background) */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(0,0,0,0.02)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(0,0,0,0.02)_1px,_transparent_1px)] bg-[size:120px_120px] dark:bg-[linear-gradient(to_right,_rgba(255,255,255,0.01)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(255,255,255,0.01)_1px,_transparent_1px)] opacity-60" />
          <div className="absolute top-0 right-[15%] h-[350px] w-[350px] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/30 dark:from-indigo-900/10 dark:to-purple-950/10 blur-[80px]" />
          <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-zinc-400/10 dark:bg-zinc-600/5 blur-[120px]" />
          <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-zinc-300/10 dark:bg-zinc-800/5 blur-[100px]" />
        </div>

        {/* ── Center: Main Chat Area ──────────────────────── */}
        <div className="flex-1 flex flex-col relative bg-transparent min-w-0 overflow-hidden">

          {/* Error Display */}
          {errorState.show && (
            <div className="px-4 py-3 border-b bg-red-50 dark:bg-red-950/50">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-xs">{errorState.message}</span>
                  <div className="flex gap-1 ml-2">
                    {errorState.retryable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={retryLastAction}
                        className="h-6 px-2 text-xs"
                        disabled={retryCount >= 3}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry {retryCount > 0 && `(${retryCount}/3)`}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearError}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            <div className="max-w-5xl mx-auto w-full px-8 py-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[72vh] text-center px-6 max-w-4xl mx-auto w-full py-8">

                  {/* ── Hero: Greeting + Robot Mascot ────────────── */}
                  <div className="w-full mb-12 text-left select-none">
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3 mb-3">
                      <span className="text-4xl leading-none">👋</span> {timeGreeting}, {firstName}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium pl-1 leading-relaxed">
                      Here&apos;s what&apos;s happening with your workspace today.
                    </p>
                  </div>

                  {/* ── Input Area ──────────────────────────── */}
                  <div className="w-full mb-5 relative">
                    {/* Input Area card */}
                    <div className={cn("relative transition-all duration-200", showSlashMenu ? "z-[99999]" : "z-10")}>
                      {renderInputArea(true)}
                    </div>
                  </div>

                  {/* ── Command Pills (from Image 2 — kept as-is) ── */}
                  <div className="flex items-center gap-2 flex-wrap justify-center mb-10 w-full">
                    {[
                      { cmd: "/tasks", label: "/tasks", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                      { cmd: "/projects", label: "/projects", icon: <FolderKanban className="h-3.5 w-3.5" /> },
                      { cmd: "/progress", label: "/progress", icon: <BarChart3 className="h-3.5 w-3.5" /> },
                      { cmd: "/notifications", label: "/notifications", icon: <Bell className="h-3.5 w-3.5" /> },
                      { cmd: "/recommend", label: "/recommend", icon: <TrendingUp className="h-3.5 w-3.5" /> },
                      { cmd: "/help", label: "/help", icon: <MessageCircle className="h-3.5 w-3.5" /> },
                    ].map((pill) => (
                      <button
                        key={pill.cmd}
                        onClick={() => {
                          const cmd = matchSlashCommand(pill.cmd, userRole, userSubRole);
                          if (cmd) handleSlashCommandSelect(cmd);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-[#27272a] text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-[#1c1c21] hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200 shadow-sm hover:shadow"
                      >
                        {pill.icon}
                        <span>{pill.label}</span>
                      </button>
                    ))}
                  </div>



                  {/* ── Stats Cards Row (same 4 cards as Overview page) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    {[
                      {
                        title: "Task Completion",
                        value: `${statsCompletionRate}%`,
                        description: `${statsCompletedTasks}/${statsTotalTasks} tasks completed`,
                        icon: <CheckCircle className="h-4 w-4" />,
                        color: "text-green-600 dark:text-emerald-400",
                        bgColor: "bg-green-50 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/50",
                        borderColor: "border-green-100 dark:border-emerald-500/30",
                      },
                      {
                        title: "Team Members",
                        value: String(statsActiveMembers),
                        description: statsIsCompany ? `Active in company` : `Across projects`,
                        icon: <Users className="h-4 w-4" />,
                        color: "text-purple-600 dark:text-purple-400",
                        bgColor: "bg-purple-50 dark:bg-purple-950/60 dark:border dark:border-purple-800/50",
                        borderColor: "border-purple-100 dark:border-purple-500/20",
                      },
                      {
                        title: "Active Projects",
                        value: String(statsActiveProjects),
                        description: `${statsCompletedProjects} completed projects`,
                        icon: <Target className="h-4 w-4" />,
                        color: "text-indigo-600 dark:text-blue-400",
                        bgColor: "bg-indigo-50 dark:bg-blue-950/60 dark:border dark:border-blue-800/50",
                        borderColor: "border-indigo-100 dark:border-blue-500/20",
                      },
                      {
                        title: "Risk Signals",
                        value: String(statsBlockedTasks),
                        description: `${statsOverdueTasks} overdue tasks`,
                        icon: <AlertTriangle className="h-4 w-4" />,
                        color: "text-amber-600 dark:text-amber-400",
                        bgColor: "bg-amber-50 dark:bg-amber-950/60 dark:border dark:border-amber-800/50",
                        borderColor: "border-amber-100 dark:border-amber-500/30",
                      },
                    ].map((card) => (
                      <div
                        key={card.title}
                        className={cn(
                          "rounded-2xl bg-white dark:bg-[#121215] border p-4 text-left transition-all duration-200 hover:shadow-md",
                          card.borderColor
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{card.title}</span>
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", card.bgColor)}>
                            <span className={card.color}>{card.icon}</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-0.5">{card.value}</div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{card.description}</p>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              <div className="space-y-4">
                {messages.map((message, idx) => {
                  const isLastMessage = idx === messages.length - 1;
                  const isAssistantThinking = localIsLoading && message.role === "assistant" && isLastMessage;

                  if (message.role === "assistant" && !message.content && !message.data && !isAssistantThinking) {
                    return null;
                  }
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isStreaming={isAssistantThinking}
                      onUpdateContent={(content) => handleUpdateMessageContent(message.id, content)}
                      onEditSubmit={handleEditSubmit}
                      onSwitchVersion={handleSwitchVersion}
                      onRetry={handleRetry}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* ── Input Area with Slash Commands ──────────── */}
          {messages.length > 0 && (
            <div className={cn(
              "border-t border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md relative",
              showSlashMenu ? "z-[99999]" : "z-20"
            )}>
              {renderInputArea(false)}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Rename the exported component to reflect the new structure
export { SupportChatContainer as SupportAgentChat };

