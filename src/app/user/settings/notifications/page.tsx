"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell, Mail, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

const notificationSettings = [
  {
    category: "Email Notifications",
    icon: Mail,
    settings: [
      {
        id: "email-tasks",
        label: "Task assignments",
        description: "Get notified when you're assigned to a task",
      },
      {
        id: "email-deadlines",
        label: "Deadline reminders",
        description: "Receive reminders before task deadlines",
      },
      {
        id: "email-comments",
        label: "Comments and mentions",
        description: "Get notified when someone comments or mentions you",
      },
      {
        id: "email-updates",
        label: "Project updates",
        description: "Receive updates about project progress",
      },
    ],
  },
  {
    category: "Push Notifications",
    icon: Bell,
    settings: [
      {
        id: "push-tasks",
        label: "New tasks",
        description: "Get notified about new task assignments",
      },
      {
        id: "push-messages",
        label: "Direct messages",
        description: "Receive notifications for direct messages",
      },
      {
        id: "push-meetings",
        label: "Meeting reminders",
        description: "Get reminded about upcoming meetings",
      },
    ],
  },
  {
    category: "In-App Notifications",
    icon: MessageSquare,
    settings: [
      {
        id: "app-achievements",
        label: "Achievements",
        description: "Get notified when you earn badges or complete milestones",
      },
      {
        id: "app-system",
        label: "System updates",
        description:
          "Receive notifications about system maintenance and updates",
      },
    ],
  },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = React.useState<Record<string, boolean>>({
    "email-tasks": true,
    "email-deadlines": true,
    "email-comments": false,
    "email-updates": true,
    "push-tasks": true,
    "push-messages": true,
    "push-meetings": false,
    "app-achievements": true,
    "app-system": true,
  });

  const handleToggle = (settingId: string) => {
    setSettings((prev) => ({
      ...prev,
      [settingId]: !prev[settingId],
    }));
  };

  const handleSave = () => {
    toast.success("Notification preferences saved successfully!");
  };

  return (
    <div className="space-y-6">
      {notificationSettings.map((category, index) => (
        <motion.div
          key={category.category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5" />
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.settings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{setting.label}</p>
                    <p className="text-sm text-slate-600">
                      {setting.description}
                    </p>
                  </div>
                  <Switch
                    checked={settings[setting.id]}
                    onCheckedChange={() => handleToggle(setting.id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex justify-end"
      >
        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Preferences
        </Button>
      </motion.div>
    </div>
  );
}
