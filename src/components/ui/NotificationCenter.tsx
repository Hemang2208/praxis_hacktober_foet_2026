"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  Check,
  MoreHorizontal,
  Filter,
  Trash2,
  Star,
  Calendar,
  MessageSquare,
  TrendingUp,
  Award,
  Settings,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ClipboardList,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";

// Types
interface NotificationData {
  task_id?: string;
  task_title?: string;
  feedback_id?: string;
  pull_request_url?: string;
  project_id?: string;
  project_title?: string;
  review_status?: string;
  [key: string]: unknown;
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: NotificationData;
  isRead: boolean;
  readAt?: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: "feedback" | "tasks" | "projects" | "system" | "achievements" | "reviews" | "assessments" | "support";
  created_at: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationIds: string[]) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDelete: (notificationIds: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

// Utility functions
const getNotificationIcon = (type: string, priority: string) => {
  const iconClass =
    priority === "urgent"
      ? "text-red-500"
      : priority === "high"
        ? "text-orange-500"
        : "text-blue-500";

  switch (type) {
    case "AI_FEEDBACK_READY":
    case "CODE_REVIEW_RESULT":
      return <Star className={`h-4 w-4 ${iconClass}`} />;
    case "CODE_REVIEW_PASSED":
      return <Check className={`h-4 w-4 text-green-500`} />;
    case "CODE_REVIEW_FAILED":
      return <Bell className={`h-4 w-4 text-red-500`} />;
    case "TASK_ASSIGNED":
      return <MessageSquare className={`h-4 w-4 ${iconClass}`} />;
    case "TASK_COMPLETED":
      return <Calendar className={`h-4 w-4 ${iconClass}`} />;
    case "TASK_IN_REVIEW":
      return <TrendingUp className={`h-4 w-4 text-amber-500`} />;
    case "TASK_DUE_SOON":
      return <Bell className={`h-4 w-4 text-orange-500`} />;
    case "PR_SUBMITTED":
      return <TrendingUp className={`h-4 w-4 ${iconClass}`} />;
    case "PROJECT_CREATED":
      return <Star className={`h-4 w-4 text-yellow-500`} />;
    case "PROJECT_APPROVED":
      return <Check className={`h-4 w-4 text-green-600`} />;
    case "PROJECT_REJECTED":
      return <Bell className={`h-4 w-4 text-red-600`} />;
    case "PROJECT_MEMBER_ADDED":
      return <Star className={`h-4 w-4 text-indigo-500`} />;
    case "ASSESSMENT_READY":
    case "ASSESSMENT_SUBMITTED":
      return <Award className={`h-4 w-4 text-purple-500`} />;
    case "PLAN_GENERATED":
      return <Calendar className={`h-4 w-4 text-cyan-500`} />;
    case "SUPPORT_ESCALATION":
      return <MessageSquare className={`h-4 w-4 text-red-500`} />;
    case "LOGIN":
    case "LOGOUT":
      return <Award className={`h-4 w-4 ${iconClass}`} />;
    default:
      return <Bell className={`h-4 w-4 ${iconClass}`} />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "border-l-red-500 bg-red-50";
    case "high":
      return "border-l-orange-500 bg-orange-50";
    case "medium":
      return "border-l-blue-500 bg-blue-50";
    default:
      return "border-l-slate-500 bg-slate-50";
  }
};

const getRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
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

// Single Notification Item Component
const NotificationItem: React.FC<{
  notification: Notification;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onOpen: () => void;
}> = ({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onDelete,
  onOpen,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          !notification.isRead ? "ring-2 ring-blue-200" : ""
        } ${getPriorityColor(notification.priority)} border-l-4`}
        onClick={onOpen}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Selection Checkbox */}
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={isSelected} onCheckedChange={onSelect} />
            </div>

            {/* Notification Icon */}
            <div className="flex-shrink-0 pt-1">
              {getNotificationIcon(notification.type, notification.priority)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-medium text-sm truncate ${
                      !notification.isRead ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {notification.title}
                  </h4>
                  <p
                    className={`text-sm mt-1 line-clamp-2 ${
                      !notification.isRead ? "text-slate-600" : "text-slate-500"
                    }`}
                  >
                    {notification.message}
                  </p>
                </div>

                {/* Actions Menu */}
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!notification.isRead && (
                        <DropdownMenuItem onClick={onMarkAsRead}>
                          <Check className="h-4 w-4 mr-2" />
                          Mark as Read
                        </DropdownMenuItem>
                      )}
                      {notification.data?.feedback_id && (
                        <DropdownMenuItem onClick={onOpen}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Feedback
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {notification.category}
                  </Badge>
                  {notification.priority === "urgent" && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {getRelativeTime(notification.created_at)}
                </span>
              </div>
            </div>

            {/* Unread Indicator */}
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Notification Center Component
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter_priority, setFilterPriority] = useState("all");
  const [sort_by, setSortBy] = useState("newest");

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter((notification) => {
      if (activeTab === "unread" && notification.isRead) return false;
      if (activeTab === "feedback" && notification.category !== "feedback")
        return false;
      if (activeTab === "tasks" && notification.category !== "tasks")
        return false;
      if (filter_priority !== "all" && notification.priority !== filter_priority)
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sort_by === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sort_by === "priority") {
        const priorityOrder = { urgent: 3, high: 2, medium: 1, low: 0 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return 0;
    });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredNotifications.map((n) => n._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectNotification = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Action handlers
  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      await onMarkAsRead(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success(`Marked ${selectedIds.size} notifications as read`);
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      await onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} notifications`);
    } catch {
      toast.error("Failed to delete notifications");
    }
  };

  const handleOpenNotification = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      onMarkAsRead([notification._id]);
    }

    // Navigate based on notification type
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="h-6 w-6 text-slate-700" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-600">
              {unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "You're all caught up!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <Bell className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllAsRead}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="feedback">
            Feedback (
            {notifications.filter((n) => n.category === "feedback").length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({notifications.filter((n) => n.category === "tasks").length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationContent
            notifications={filteredNotifications}
            selectedIds={selectedIds}
            filter_priority={filter_priority}
            sort_by={sort_by}
            onSelectAll={handleSelectAll}
            onSelectNotification={handleSelectNotification}
            onMarkSelectedAsRead={handleMarkSelectedAsRead}
            onDeleteSelected={handleDeleteSelected}
            onFilterPriorityChange={setFilterPriority}
            onSortByChange={setSortBy}
            onOpenNotification={handleOpenNotification}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
          />
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <NotificationContent
            notifications={filteredNotifications}
            selectedIds={selectedIds}
            filter_priority={filter_priority}
            sort_by={sort_by}
            onSelectAll={handleSelectAll}
            onSelectNotification={handleSelectNotification}
            onMarkSelectedAsRead={handleMarkSelectedAsRead}
            onDeleteSelected={handleDeleteSelected}
            onFilterPriorityChange={setFilterPriority}
            onSortByChange={setSortBy}
            onOpenNotification={handleOpenNotification}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
          />
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <NotificationContent
            notifications={filteredNotifications}
            selectedIds={selectedIds}
            filter_priority={filter_priority}
            sort_by={sort_by}
            onSelectAll={handleSelectAll}
            onSelectNotification={handleSelectNotification}
            onMarkSelectedAsRead={handleMarkSelectedAsRead}
            onDeleteSelected={handleDeleteSelected}
            onFilterPriorityChange={setFilterPriority}
            onSortByChange={setSortBy}
            onOpenNotification={handleOpenNotification}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <NotificationContent
            notifications={filteredNotifications}
            selectedIds={selectedIds}
            filter_priority={filter_priority}
            sort_by={sort_by}
            onSelectAll={handleSelectAll}
            onSelectNotification={handleSelectNotification}
            onMarkSelectedAsRead={handleMarkSelectedAsRead}
            onDeleteSelected={handleDeleteSelected}
            onFilterPriorityChange={setFilterPriority}
            onSortByChange={setSortBy}
            onOpenNotification={handleOpenNotification}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Notification preferences can be managed in your account
                settings.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/user/settings/notifications">Open Settings</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Notification Content Component
const NotificationContent: React.FC<{
  notifications: Notification[];
  selectedIds: Set<string>;
  filter_priority: string;
  sort_by: string;
  onSelectAll: (checked: boolean) => void;
  onSelectNotification: (id: string, selected: boolean) => void;
  onMarkSelectedAsRead: () => void;
  onDeleteSelected: () => void;
  onFilterPriorityChange: (priority: string) => void;
  onSortByChange: (sort_by: string) => void;
  onOpenNotification: (notification: Notification) => void;
  onMarkAsRead: (notificationIds: string[]) => Promise<void>;
  onDelete: (notificationIds: string[]) => Promise<void>;
}> = ({
  notifications,
  selectedIds,
  filter_priority,
  sort_by,
  onSelectAll,
  onSelectNotification,
  onMarkSelectedAsRead,
  onDeleteSelected,
  onFilterPriorityChange,
  onSortByChange,
  onOpenNotification,
  onMarkAsRead,
  onDelete,
}) => {
  return (
    <>
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={
                selectedIds.size === notifications.length &&
                notifications.length > 0
              }
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({selectedIds.size} selected)
            </span>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onMarkSelectedAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Mark Read
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />

          <Select value={filter_priority} onValueChange={onFilterPriorityChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort_by} onValueChange={onSortByChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No notifications found</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  isSelected={selectedIds.has(notification._id)}
                  onSelect={(selected) =>
                    onSelectNotification(notification._id, selected)
                  }
                  onMarkAsRead={() => onMarkAsRead([notification._id])}
                  onDelete={() => onDelete([notification._id])}
                  onOpen={() => onOpenNotification(notification)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </>
  );
};

export default NotificationCenter;
