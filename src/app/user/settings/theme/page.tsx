"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useThemeStore } from "@/lib/store";
import toast from "react-hot-toast";

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "Light mode with bright colors",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dark mode with muted colors",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your system preference",
    icon: Monitor,
  },
];

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const [selectedTheme, setSelectedTheme] = React.useState(theme);

  const handleSave = () => {
    setTheme(selectedTheme as "light" | "dark" | "system");
    toast.success("Theme preference saved successfully!");
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Theme Preference</h3>
              <RadioGroup
                value={selectedTheme}
                onValueChange={(value) =>
                  setSelectedTheme(value as "light" | "dark" | "system")
                }
              >
                <div className="grid gap-4">
                  {themeOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-3"
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label
                        htmlFor={option.value}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <option.icon className="h-5 w-5" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-slate-600">
                            {option.description}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={selectedTheme === theme}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Theme Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
