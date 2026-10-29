"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RelatedEntity {
  type?: string;
  name?: string;
  id?: string;
}

interface Notification {
  _id?: string;
  title: string;
  message?: string;
  description?: string;
  type?: string;
  category?: string;
  priority?: string;
  status?: string;
  is_read?: boolean;
  sender?: string;
  related_entity?: RelatedEntity;
  action_text?: string;
  action_url?: string;
  created_at?: string;
  read_at?: string;
}

interface NotificationDisplayProps {
  notifications: Notification[];
  totalCount?: number;
}

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
};

const getPriorityColor = (priority?: string) => {
  if (priority === "high" || priority === "urgent") return "text-red-500";
  if (priority === "medium") return "text-yellow-500";
  return "text-green-500";
};

const getTypeIcon = (type?: string, category?: string) => {
  const t = type || category;
  if (t === "task") return "📋";
  if (t === "project") return "🗂️";
  if (t === "comment") return "💬";
  if (t === "mention") return "👤";
  if (t === "deadline") return "⏰";
  if (t === "success") return "✨";
  if (t === "warning") return "⚠️";
  if (t === "error") return "❌";
  return "🔔";
};

export function NotificationDisplay({
  notifications,
  totalCount,
}: NotificationDisplayProps) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No notifications found. You&apos;re all caught up! 🎉
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => n.is_read).length;
  const readCount = notifications.length - unreadCount;

  return (
    <div className="w-full space-y-4">
      {/* Header with summary */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">🔔 Notifications</span>
          <Badge variant="outline">
            {totalCount || notifications.length} total
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {unreadCount} unread
          </span>
          <span>•</span>
          <span>{readCount} read</span>
        </div>
      </div>

      {/* All notifications in chronological order */}
      <div className="space-y-2">
        {notifications.map((notif, index) => (
          <NotificationItem key={notif._id || index} notification={notif} />
        ))}
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const typeIcon = getTypeIcon(notification.type, notification.category);
  const priorityColor = getPriorityColor(notification.priority);
  const isUnread = notification.is_read;
  const message = notification.message || notification.description;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isUnread
          ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          : "bg-background border-border opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-1">
        <span className="text-lg mt-0.5">{typeIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold truncate">
              {notification.title}
            </h4>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>

          {/* Message */}
          {message && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {message}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {notification.type && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {notification.type}
              </Badge>
            )}
            {notification.priority && (
              <span className={cn("font-medium", priorityColor)}>
                {notification.priority}
              </span>
            )}
            {notification.sender && (
              <span className="text-muted-foreground">
                👤 {notification.sender}
              </span>
            )}
            {notification.created_at && (
              <span className="text-muted-foreground">
                {getTimeAgo(notification.created_at)}
              </span>
            )}
          </div>

          {/* Related entity */}
          {notification.related_entity?.name && (
            <div className="mt-2 text-xs text-muted-foreground">
              🔗 {notification.related_entity.type}:{" "}
              {notification.related_entity.name}
            </div>
          )}

          {/* Action link */}
          {notification.action_text && notification.action_url && (
            <div className="mt-2">
              <a
                href={notification.action_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                {notification.action_text} →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
