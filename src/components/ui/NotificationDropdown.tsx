"use client";

import React from "react";
import {
  Bell,
  GitPullRequest,
  FileText,
  CheckCircle,
  X,
  MoreHorizontal,
  Eye,
  UserPlus,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Notification } from "@/hooks/useNotifications";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (notificationIds: string[]) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDeleteNotifications: (notificationIds: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
}

// Get icon for notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "AI_FEEDBACK_READY":
    case "CODE_REVIEW_RESULT":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "CODE_REVIEW_PASSED":
      return <ThumbsUp className="h-4 w-4 text-green-500" />;
    case "CODE_REVIEW_FAILED":
      return <ThumbsDown className="h-4 w-4 text-red-500" />;
    case "TASK_ASSIGNED":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "TASK_COMPLETED":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "TASK_IN_REVIEW":
      return <ClipboardList className="h-4 w-4 text-amber-500" />;
    case "TASK_DUE_SOON":
      return <Clock className="h-4 w-4 text-orange-500" />;
    case "PR_SUBMITTED":
      return <GitPullRequest className="h-4 w-4 text-blue-600" />;
    case "PROJECT_CREATED":
      return <Star className="h-4 w-4 text-yellow-500" />;
    case "PROJECT_APPROVED":
      return <ThumbsUp className="h-4 w-4 text-green-600" />;
    case "PROJECT_REJECTED":
      return <ThumbsDown className="h-4 w-4 text-red-600" />;
    case "PROJECT_MEMBER_ADDED":
      return <UserPlus className="h-4 w-4 text-indigo-500" />;
    case "ASSESSMENT_READY":
    case "ASSESSMENT_SUBMITTED":
      return <FileText className="h-4 w-4 text-purple-500" />;
    case "PLAN_GENERATED":
      return <ClipboardList className="h-4 w-4 text-cyan-500" />;
    case "SUPPORT_ESCALATION":
      return <MessageSquare className="h-4 w-4 text-red-500" />;
    case "SYSTEM_ACTIVITY":
    case "LOGOUT":
      return <X className="h-4 w-4 text-orange-500" />;
    case "LOGIN":
      return <GitPullRequest className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

// Get relative time string
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

// Get message for specific notification types
const getNotificationMessage = (notification: Notification) => {
  // Always use the message from the notification object first, then fallback to custom messages
  if (notification.message) {
    return notification.message;
  }

  switch (notification.type) {
    case "CODE_REVIEW_RESULT":
      return `Code review ready for "${notification.data?.task_title || "your task"}"`;
    case "CODE_REVIEW_PASSED":
      return `Code review passed for "${notification.data?.task_title || "task"}"`;
    case "CODE_REVIEW_FAILED":
      return `Code review failed for "${notification.data?.task_title || "task"}"`;
    case "TASK_ASSIGNED":
      return `New task assigned: "${notification.data?.task_title || "Task"}"`;
    case "TASK_COMPLETED":
      return `Task "${notification.data?.task_title || "Task"}" completed successfully`;
    case "TASK_IN_REVIEW":
      return `Task "${notification.data?.task_title || "Task"}" is in review`;
    case "TASK_DUE_SOON":
      return `Task "${notification.data?.task_title || "Task"}" is due soon`;
    case "PR_SUBMITTED":
      return `Pull request submitted for "${notification.data?.task_title || "task"}"`;
    case "PROJECT_CREATED":
      return `Project "${notification.data?.project_title || "Project"}" created`;
    case "PROJECT_APPROVED":
      return `Project "${notification.data?.project_title || "Project"}" approved`;
    case "PROJECT_REJECTED":
      return `Project "${notification.data?.project_title || "Project"}" rejected`;
    case "PROJECT_MEMBER_ADDED":
      return `You were added to project "${notification.data?.project_title || "Project"}"`;
    case "ASSESSMENT_READY":
      return `Assessment ready for "${notification.data?.task_title || "task"}"`;
    case "ASSESSMENT_SUBMITTED":
      return `Assessment submitted for "${notification.data?.task_title || "task"}"`;
    case "PLAN_GENERATED":
      return `Plan generated for "${notification.data?.project_title || "project"}"`;
    case "SUPPORT_ESCALATION":
      return "Support escalation requested";
    case "SYSTEM_ACTIVITY":
    case "LOGIN":
    case "LOGOUT":
      return notification.message;
    default:
      return notification.message || "New notification";
  }
};

// Handle notification click to navigate to relevant page and mark as read
const handleNotificationClick = async (
  notification: Notification,
  onMarkAsRead: (id: string) => Promise<void>,
) => {
  // Mark as read if it's unread
  if (!notification.isRead) {
    try {
      await onMarkAsRead(notification._id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  // Navigate to relevant page
  if (notification.data?.task_id && notification.data?.project_id) {
    // Use nested route when project_id is available
    const taskUrl = `/user/projects/${notification.data.project_id}/board/tasks/${notification.data.task_id}`;
    const feedbackTab = notification.data.feedback_id ? "?tab=feedback" : "";
    window.location.href = taskUrl + feedbackTab;
  } else if (notification.data?.task_id) {
    // Fallback to old route
    const taskUrl = `/user/tasks/${notification.data.task_id}`;
    const feedbackTab = notification.data.feedback_id ? "?tab=feedback" : "";
    window.location.href = taskUrl + feedbackTab;
  } else if (notification.data?.project_id) {
    window.location.href = `/user/projects/${notification.data.project_id}`;
  } else if (notification.data?.pull_request_url) {
    window.open(notification.data.pull_request_url, "_blank");
  }
};
const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}> = ({ notification, onMarkAsRead, onDelete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`group relative p-3.5 border-l-2 border-b border-zinc-100/60 dark:border-[#1E1F23] hover:bg-zinc-50/60 dark:hover:bg-[#1C1D22] cursor-pointer transition-all duration-200 ${
        notification.isRead
          ? "border-l-transparent bg-white dark:bg-[#111214]"
          : "border-l-zinc-950 dark:border-l-emerald-500 bg-zinc-50/20 dark:bg-[#17181C]"
      }`}
      onClick={() => handleNotificationClick(notification, onMarkAsRead)}
    >
      <div className="flex items-start gap-3">
        {/* Icon wrapper */}
        <div className="h-8 w-8 border border-zinc-200 dark:border-[#26272B] rounded-xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-[#111214] shadow-sm">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p
              className={`text-xs font-bold truncate ${
                notification.isRead ? "text-zinc-700 dark:text-[#A1A1AA]" : "text-zinc-950 dark:text-[#F5F5F5]"
              }`}
            >
              {notification.title}
            </p>

            <div className="flex items-center gap-1 ml-2">
              {notification.priority === "urgent" && (
                <Badge variant="destructive" className="text-[8px] font-bold px-1 py-0 rounded">
                  !
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3 text-zinc-450 dark:text-[#71717A]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-[#111214] border border-zinc-250/60 dark:border-[#1E1F23] rounded-xl shadow-md p-1 min-w-44">
                  {!notification.isRead && (
                    <DropdownMenuItem
                      className="text-xs rounded-lg cursor-pointer flex items-center py-2 dark:text-[#F5F5F5] dark:hover:bg-[#17181C]"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onMarkAsRead(notification._id);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2 text-zinc-500 dark:text-[#71717A]" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification._id);
                    }}
                    className="text-xs rounded-lg cursor-pointer text-red-650 dark:text-red-400 flex items-center py-2 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <X className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 dark:text-[#A1A1AA] mt-1 line-clamp-2 leading-relaxed font-medium">
            {getNotificationMessage(notification)}
          </p>

          <div className="flex items-center justify-between mt-2.5">
            <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0 rounded border-zinc-200 dark:border-[#26272B] text-zinc-500 dark:text-[#A1A1AA] bg-white dark:bg-[#17181C]">
              {notification.category}
            </Badge>
            <span className="text-[9px] text-zinc-450 dark:text-[#71717A] font-medium">
              {getRelativeTime(notification.created_at)}
            </span>
          </div>
        </div>

        {/* Unread indicator dot */}
        {!notification.isRead && (
          <div className="w-1.5 h-1.5 bg-zinc-950 dark:bg-emerald-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </motion.div>
  );
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotifications,
  onRefresh,
}) => {
  // Show all notifications (unread first, then recent read ones)
  const sortedNotifications = [...notifications].sort((a, b) => {
    // Unread notifications first
    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;
    // Then by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const displayNotifications = sortedNotifications.slice(0, 10); // Show up to 10 notifications

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] font-bold bg-zinc-950 text-white border border-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 bg-white dark:bg-[#111214] border border-zinc-200/60 dark:border-[#1E1F23] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden" sideOffset={8}>
        <div className="border-b border-zinc-100 dark:border-[#1E1F23] px-4 py-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-zinc-900 dark:text-[#F5F5F5]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-6 px-2 font-semibold text-zinc-500 dark:text-[#A1A1AA] hover:text-zinc-900 dark:hover:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] border border-zinc-250/60 dark:border-[#26272B] rounded-lg cursor-pointer"
                  onClick={onMarkAllAsRead}
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 border border-zinc-250/60 dark:border-[#26272B] hover:bg-zinc-50 dark:hover:bg-[#17181C] rounded-lg cursor-pointer"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <motion.div
                  animate={isLoading ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: isLoading ? Infinity : 0 }}
                >
                  <Bell className="h-3 w-3 text-zinc-500 dark:text-[#A1A1AA]" />
                </motion.div>
              </Button>
            </div>
          </div>

          {unreadCount > 0 && (
            <p className="text-[10px] text-zinc-500 dark:text-[#71717A] mt-1 font-medium">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="max-h-[320px] overflow-y-auto overflow-x-hidden pr-0.5 scrollbar-thin">
          <div className="py-0">
            {isLoading && displayNotifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-zinc-950 dark:border-[#F5F5F5] border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-xs text-zinc-450 dark:text-[#71717A] font-medium">
                  Loading notifications...
                </p>
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-8 w-8 text-zinc-300 dark:text-[#26272B] mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-800 dark:text-[#F5F5F5]">No notifications</p>
                <p className="text-[10px] text-zinc-400 dark:text-[#71717A] mt-1 font-medium">
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {displayNotifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkAsRead={async (id) => await onMarkAsRead([id])}
                    onDelete={(id) => onDeleteNotifications([id])}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {displayNotifications.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-[#1E1F23] px-4 py-2.5 bg-zinc-50/50 dark:bg-[#0D0D0F]">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[10px] font-semibold text-zinc-900 dark:text-[#F5F5F5] bg-white dark:bg-[#17181C] hover:bg-zinc-50 dark:hover:bg-[#26272B] border border-zinc-200/80 dark:border-[#26272B] rounded-xl cursor-pointer py-1.5 h-auto transition-colors"
              onClick={() => (window.location.href = "/user/notifications")}
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
