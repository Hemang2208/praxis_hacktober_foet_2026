"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setTheme, toggleTheme, ThemeMode } from "@/redux/slice/theme.slice";

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage once on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("kiyo-theme") as ThemeMode | null;
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system")) {
      dispatch(setTheme(savedTheme));
    }
  }, [dispatch]);

  // Sync document.documentElement class when theme state changes
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("kiyo-theme", "dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
      localStorage.setItem("kiyo-theme", "light");
    } else if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      localStorage.setItem("kiyo-theme", "system");
    }
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full text-zinc-500 dark:text-zinc-400 opacity-50 cursor-pointer"
        disabled
      >
        <Sun className="h-4.5 w-4.5" />
      </Button>
    );
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => dispatch(toggleTheme())}
      className="h-9 w-9 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-zinc-600 transition-transform duration-200 hover:-rotate-12" />
      )}
    </Button>
  );
}
