"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  FolderKanban,
  Bell,
  MessageSquareCode,
  GitPullRequest,
  FileText,
  User,
  BarChart3,
  TrendingUp,
  Target,
  FolderPlus,
  ListPlus,
  HelpCircle,
  Command,
  Trash2,
  Edit2,
  Sparkles,
  Brain,
  Github,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterSlashCommands,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type SlashCommand,
  type SlashCommandCategory,
} from "@/lib/slashCommands";

// Map icon name strings to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  ClipboardList,
  FolderKanban,
  Bell,
  MessageSquareCode,
  GitPullRequest,
  FileText,
  User,
  BarChart3,
  TrendingUp,
  Target,
  FolderPlus,
  ListPlus,
  HelpCircle,
  Command,
  Trash2,
  Edit2,
  Sparkles,
  Brain,
  Github,
  RefreshCw,
};

interface SlashCommandMenuProps {
  /** The current text in the input (everything after "/" or the full input) */
  query: string;
  /** Whether the menu should be visible */
  isVisible: boolean;
  /** Called when user selects a command */
  onSelect: (command: SlashCommand) => void;
  /** Called when user dismisses the menu */
  onDismiss: () => void;
  /** Current user role for filtering commands */
  userRole?: string | null;
  /** Current user sub-role for filtering commands */
  userSubRole?: string | null;
  /** Menu alignment direction relative to input */
  align?: "top" | "bottom";
}

export function SlashCommandMenu({
  query,
  isVisible,
  onSelect,
  onDismiss,
  userRole,
  userSubRole,
  align = "top",
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter commands based on query
  const filteredCommands = useMemo(
    () => filterSlashCommands(query, userRole, userSubRole),
    [query, userRole, userSubRole],
  );

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      commands: filteredCommands.filter((c) => c.category === cat),
    })).filter((g) => g.commands.length > 0);
  }, [filteredCommands]);

  // Flat list for keyboard navigation
  const flatList = useMemo(
    () => groupedCommands.flatMap((g) => g.commands),
    [groupedCommands],
  );

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) =>
            prev < flatList.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatList.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          if (flatList[selectedIndex]) {
            onSelect(flatList[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onDismiss();
          break;
        case "Tab":
          e.preventDefault();
          if (flatList[selectedIndex]) {
            onSelect(flatList[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isVisible, flatList, selectedIndex, onSelect, onDismiss]);

  // Click outside to dismiss
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    // Use setTimeout to avoid dismissing on the same click that opened the menu
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onDismiss]);

  if (!isVisible || flatList.length === 0) return null;

  let flatIndex = 0;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "absolute left-0 right-0 z-[99999] isolate",
          align === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
          "bg-white dark:bg-[#0D0D0F] border border-zinc-200 dark:border-[#26272B] rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)]",
          "max-h-[320px] overflow-y-auto hide-scrollbar opacity-100 backdrop-blur-none",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 dark:border-[#26272B] bg-white dark:bg-[#0D0D0F]">
          <Command className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Commands
          </span>
          <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            ↑↓ navigate · ↵ select · esc dismiss
          </span>
        </div>

        {/* Command Groups */}
        <div className="py-1.5 bg-white dark:bg-[#0D0D0F]">
          {groupedCommands.map((group) => (
            <div key={group.category}>
              {/* Category label */}
              <div className="px-4 py-1.5 bg-white dark:bg-[#0D0D0F]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group.label}
                </span>
              </div>

              {/* Commands in this category */}
              {group.commands.map((cmd) => {
                const currentFlatIndex = flatIndex;
                flatIndex++;

                const IconComponent = ICON_MAP[cmd.icon] || HelpCircle;
                const isSelected = currentFlatIndex === selectedIndex;

                return (
                  <button
                    key={cmd.name}
                    ref={(el) => {
                      itemRefs.current[currentFlatIndex] = el;
                    }}
                    onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(cmd);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors duration-75",
                      isSelected
                        ? "bg-zinc-100 dark:bg-[#1C1D22] text-foreground"
                        : "text-foreground/80 hover:bg-zinc-50 dark:hover:bg-[#16171B] bg-white dark:bg-[#0D0D0F]",
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-lg transition-colors shrink-0",
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Command name + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-semibold font-mono",
                            isSelected ? "text-primary" : "text-foreground",
                          )}
                        >
                          {cmd.name}
                        </span>
                        {cmd.category === "create" && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Write
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {cmd.description}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="slash-cmd-indicator"
                        className="h-5 w-1 rounded-full bg-primary"
                        transition={{ duration: 0.15 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
