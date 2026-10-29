import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { invalidatePageCache, invalidateDetailItemCache } from "@/redux/slice/cache.slice";

export interface NotificationItem {
  _id: string;
  id: string;
  user_id: string;
  event_type: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  is_read: boolean;
  isRead: boolean;
  read_at?: string | null;
  readAt?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  category: "feedback" | "tasks" | "projects" | "system" | "achievements";
  created_at: string;
  updated_at?: string;
}

interface NotificationsState {
  notifications: NotificationItem[];
  unread_count: number;
  is_loading: boolean;
  error: string | null;
}

const initial_state: NotificationsState = {
  notifications: [],
  unread_count: 0,
  is_loading: false,
  error: null,
};

export const fetch_notifications = createAsyncThunk<
  { notifications: NotificationItem[]; unread_count: number },
  { page?: number; category?: string },
  { rejectValue: string }
>(
  "notifications/fetch_notifications",
  async ({ page = 1, category }: { page?: number; category?: string } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });

    if (category && category !== "all") {
      params.append("category", category);
    }

    const response = await fetch(`/api/notifications?${params.toString()}`);
    if (!response.ok) {
      const error_data = await response.json().catch(() => ({}));
      throw new Error(error_data.error || "Failed to fetch notifications");
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid response format: expected JSON");
    }

    const data = await response.json();
    return {
      notifications: (data.notifications || []) as NotificationItem[],
      unread_count: Number(data.unread_count ?? data.unreadCount ?? 0),
    };
  },
);

export const mark_notification_read = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  "notifications/mark_notification_read",
  async (notification_id: string, { dispatch }) => {
    const response = await fetch(`/api/notifications/${notification_id}/read`, {
      method: "PATCH",
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({}));
      throw new Error(
        error_data.error || "Failed to mark notification as read",
      );
    }

    dispatch(invalidatePageCache({ resource: "user" }));
    return notification_id;
  },
);

export const mark_notifications_read = createAsyncThunk<
  string[],
  string[],
  { rejectValue: string }
>(
  "notifications/mark_notifications_read",
  async (notification_ids: string[], { dispatch }) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notification_ids }),
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({}));
      throw new Error(
        error_data.error || "Failed to mark notifications as read",
      );
    }

    dispatch(invalidatePageCache({ resource: "user" }));
    return notification_ids;
  },
);

export const mark_all_notifications_read = createAsyncThunk<
  boolean,
  void,
  { rejectValue: string }
>(
  "notifications/mark_all_notifications_read",
  async (_, { dispatch }) => {
    const response = await fetch("/api/notifications/read-all", {
      method: "PATCH",
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({}));
      throw new Error(
        error_data.error || "Failed to mark all notifications as read",
      );
    }

    dispatch(invalidatePageCache({ resource: "user" }));
    return true;
  },
);

export const delete_notifications = createAsyncThunk<
  string[],
  string[],
  { rejectValue: string }
>(
  "notifications/delete_notifications",
  async (notification_ids: string[], { dispatch }) => {
    const params = new URLSearchParams({ ids: notification_ids.join(",") });
    const response = await fetch(`/api/notifications?${params.toString()}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({}));
      throw new Error(error_data.error || "Failed to delete notifications");
    }

    dispatch(invalidatePageCache({ resource: "user" }));
    return notification_ids;
  },
);

const notifications_slice = createSlice({
  name: "notifications",
  initialState: initial_state,
  reducers: {
    set_notifications_error: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clear_notifications_state: () => initial_state,
  },
  extraReducers: (builder) => {
    builder.addCase(fetch_notifications.pending, (state) => {
      state.is_loading = true;
      state.error = null;
    });

    builder.addCase(fetch_notifications.fulfilled, (state, action) => {
      state.is_loading = false;
      state.notifications = action.payload.notifications;
      state.unread_count = action.payload.unread_count;
    });

    builder.addCase(fetch_notifications.rejected, (state, action) => {
      state.is_loading = false;
      state.error = action.error.message || "Failed to fetch notifications";
    });

    builder.addCase(mark_notification_read.fulfilled, (state, action) => {
      state.notifications = state.notifications.map((notification) =>
        notification._id === action.payload
          ? {
              ...notification,
              is_read: true,
              isRead: true,
              read_at: new Date().toISOString(),
              readAt: new Date().toISOString(),
            }
          : notification,
      );
      state.unread_count = Math.max(
        0,
        state.notifications.filter((notification) => !notification.is_read)
          .length,
      );
    });

    builder.addCase(mark_notifications_read.fulfilled, (state, action) => {
      const ids = new Set(action.payload);
      state.notifications = state.notifications.map((notification) =>
        ids.has(notification._id)
          ? {
              ...notification,
              is_read: true,
              isRead: true,
              read_at: new Date().toISOString(),
              readAt: new Date().toISOString(),
            }
          : notification,
      );
      state.unread_count = Math.max(
        0,
        state.notifications.filter((notification) => !notification.is_read)
          .length,
      );
    });

    builder.addCase(mark_all_notifications_read.fulfilled, (state) => {
      state.notifications = state.notifications.map((notification) => ({
        ...notification,
        is_read: true,
        isRead: true,
        read_at: new Date().toISOString(),
        readAt: new Date().toISOString(),
      }));
      state.unread_count = 0;
    });

    builder.addCase(delete_notifications.fulfilled, (state, action) => {
      const ids = new Set(action.payload);
      state.notifications = state.notifications.filter(
        (notification) => !ids.has(notification._id),
      );
      state.unread_count = Math.max(
        0,
        state.notifications.filter((notification) => !notification.is_read)
          .length,
      );
    });
  },
});

export const { set_notifications_error, clear_notifications_state } =
  notifications_slice.actions;

export default notifications_slice.reducer;
