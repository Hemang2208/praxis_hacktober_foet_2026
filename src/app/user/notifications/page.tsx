"use client";

export const dynamic = "force-dynamic";

import React from "react";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { motion } from "framer-motion";
import { useUser } from "@/redux/hooks";
import { useNotifications } from "@/hooks/useNotifications";

export default function StudentNotificationsPage() {
  const { user } = useUser();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshNotifications,
  } = useNotifications();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8 max-w-4xl"
    >
      <NotificationCenter
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotifications}
        onRefresh={refreshNotifications}
        isLoading={isLoading}
      />
    </motion.div>
  );
}
