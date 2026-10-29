"use client";

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetch_notifications,
  mark_notifications_read,
  mark_all_notifications_read,
  delete_notifications,
} from "@/redux/slice/notifications.slice";

// Define the notification interface
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

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: NotificationData;
  isRead: boolean;
  readAt?: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: "feedback" | "tasks" | "projects" | "system" | "achievements";
  created_at: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (page?: number, category?: string) => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotifications: (notificationIds: string[]) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const dispatch = useAppDispatch();

  // Fetch user from /api/auth/current-user or use context
  const { data } = useSWR("/api/auth/current-user", async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  });
  const notifications_raw = useAppSelector(
    (state) => state.notifications.notifications,
  );
  const unread_count = useAppSelector(
    (state) => state.notifications.unread_count,
  );
  const is_loading = useAppSelector((state) => state.notifications.is_loading);
  const error = useAppSelector((state) => state.notifications.error);

  const notifications: Notification[] = notifications_raw.map(
    (notification) => ({
      _id: notification._id,
      type: notification.event_type,
      title: notification.title,
      message: notification.message,
      data: (notification.metadata || {}) as NotificationData,
      isRead: Boolean(notification.is_read),
      readAt: notification.read_at || undefined,
      priority: notification.priority,
      category: notification.category,
      created_at: notification.created_at,
    }),
  );

  // Fetch notifications from API
  const fetchNotifications = useCallback(
    async (page = 1, category?: string, showError = false) => {
      if (!data?.user?.user_id) return;

      try {
        await dispatch(fetch_notifications({ page, category })).unwrap();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch notifications";
        console.error("Error fetching notifications:", err);
        // Only show toast error if explicitly requested (user-initiated refresh)
        if (showError) {
          toast.error(errorMessage);
        }
      }
    },
    [data?.user?.user_id, dispatch],
  );

  // Mark specific notifications as read
  const markAsRead = useCallback(
    async (notificationIds: string[]) => {
      if (!data?.user?.user_id || notificationIds.length === 0) return;

      try {
        await dispatch(mark_notifications_read(notificationIds)).unwrap();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to mark notifications as read";
        console.error("Error marking notifications as read:", err);
        toast.error(errorMessage);
      }
    },
    [data?.user?.user_id, dispatch],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!data?.user?.user_id) return;

    try {
      await dispatch(mark_all_notifications_read()).unwrap();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to mark all notifications as read";
      console.error("Error marking all notifications as read:", err);
      toast.error(errorMessage);
    }
  }, [data?.user?.user_id, dispatch]);

  // Delete notifications
  const deleteNotifications = useCallback(
    async (notificationIds: string[]) => {
      if (!data?.user?.user_id || notificationIds.length === 0) return;

      try {
        await dispatch(delete_notifications(notificationIds)).unwrap();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete notifications";
        console.error("Error deleting notifications:", err);
        toast.error(errorMessage);
      }
    },
    [data?.user?.user_id, dispatch],
  );

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(1, undefined, true); // true = show error toast
  }, [fetchNotifications]);

  // Auto-fetch notifications when user changes
  useEffect(() => {
    if (data?.user?.user_id) {
      fetchNotifications();
      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [data, fetchNotifications]);

  return {
    notifications,
    unreadCount: unread_count,
    isLoading: is_loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshNotifications,
  };
};

export default useNotifications;

export function useUser() {
  const { data } = useSWR("/api/auth/current-user", async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  });
  return {
    mongoUser: data?.user || null,
    isLoaded: Boolean(data),
    error: null,
  };
}
