"use client";

import { useState, useEffect } from "react";
import { mutate } from "swr";
import { useAppDispatch, useAppSelector, useIsDirty } from "@/redux/hooks";
import {
  updateNotificationPreferences,
  selectNotificationPreferences,
  setDirty,
} from "@/redux/slice/user.slice";
import { useProfileBootstrap } from "@/hooks/useProfileBootstrap";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Bell, Mail, Code, Users, ClipboardCheck, Save, X } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface NotificationPreferencesProps {
  initialUser: Record<string, unknown>;
}

interface Prefs {
  email: boolean;
  taskEmails: boolean;
  reviewEmails: boolean;
  projectEmails: boolean;
  assessmentEmails: boolean;
}

const DEFAULT_PREFS: Prefs = {
  email: true,
  taskEmails: true,
  reviewEmails: true,
  projectEmails: true,
  assessmentEmails: true,
};

const TOGGLE_ITEMS: {
  key: keyof Prefs;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "email",
    label: "Email Notifications",
    description: "Receive email notifications for account activity",
    icon: Mail,
  },
  {
    key: "taskEmails",
    label: "Task Emails",
    description: "Get notified when tasks are assigned or updated",
    icon: ClipboardCheck,
  },
  {
    key: "reviewEmails",
    label: "Review Emails",
    description: "Get notified when code reviews or feedback are available",
    icon: Code,
  },
  {
    key: "projectEmails",
    label: "Project Emails",
    description: "Receive updates about project progress and changes",
    icon: Users,
  },
  {
    key: "assessmentEmails",
    label: "Assessment Emails",
    description: "Get notified when assessments are created or graded",
    icon: Bell,
  },
];

export default function NotificationPreferences({
  initialUser,
}: NotificationPreferencesProps) {
  const dispatch = useAppDispatch();
  const isDirty = useIsDirty();
  useProfileBootstrap(initialUser as any);
  const storedPrefs = useAppSelector(selectNotificationPreferences);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setPortalTarget(document.getElementById("profile-actions-portal"));
  }, []);

  useEffect(() => {
    if (storedPrefs) {
      setPrefs({
        email: storedPrefs.email ?? true,
        taskEmails: storedPrefs.taskEmails ?? true,
        reviewEmails: storedPrefs.reviewEmails ?? true,
        projectEmails: storedPrefs.projectEmails ?? true,
        assessmentEmails: storedPrefs.assessmentEmails ?? true,
      });
    }
  }, [storedPrefs]);

  const handleToggle = (key: keyof Prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    dispatch(setDirty(true));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      dispatch(updateNotificationPreferences(prefs));
      const profileRes = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: prefs }),
      });
      if (!profileRes.ok) {
        throw new Error("Failed to save preferences");
      }
      await mutate("/api/auth/profile");
      await mutate("/api/auth/current-user");
      dispatch(setDirty(false));
      toast.success("Notification preferences saved!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save preferences",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPrefs(
      storedPrefs
        ? {
            email: storedPrefs.email ?? true,
            taskEmails: storedPrefs.taskEmails ?? true,
            reviewEmails: storedPrefs.reviewEmails ?? true,
            projectEmails: storedPrefs.projectEmails ?? true,
            assessmentEmails: storedPrefs.assessmentEmails ?? true,
          }
        : DEFAULT_PREFS,
    );
    dispatch(setDirty(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Notification Preferences
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Choose which notifications you want to receive.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Toggle individual notification channels on or off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TOGGLE_ITEMS.map(({ key, label, description, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor={key}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </p>
                </div>
              </div>
              <Switch
                id={key}
                checked={prefs[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons via Portal */}
      {mounted && portalTarget
        ? createPortal(
            <Card className="w-full">
              <CardContent className="p-4 flex flex-col gap-3">
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="w-full gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={!isDirty || saving}
                  className="w-full gap-2 cursor-pointer border-slate-300 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                {isDirty && (
                  <p className="text-xs text-muted-foreground self-center">
                    You have unsaved changes.
                  </p>
                )}
              </CardContent>
            </Card>,
            portalTarget
          )
        : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:hidden"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleSave}
                      disabled={!isDirty || saving}
                      className="w-full sm:w-auto gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-white font-medium"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={!isDirty || saving}
                      className="w-full sm:w-auto gap-2 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    {isDirty && (
                      <p className="text-xs text-muted-foreground self-center">
                        You have unsaved changes.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
    </div>
  );
}
