"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pin,
  Trash2,
  MoreHorizontal,
  Edit2,
  Check,
  X,
  Search,
  MessageSquare,
  Sparkles,
  PanelRightClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/components/support-agent/SupportAgentChat";

interface AgentSidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onTogglePin: (id: string) => void;
  onBeginRename: (id: string) => void;
  onSaveRename: (id: string) => void;
  onCancelRename: () => void;
  renamingId: string | null;
  renamingValue: string;
  onRenamingValueChange: (value: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AgentSidebar({
  chatSessions,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onTogglePin,
  onBeginRename,
  onSaveRename,
  onCancelRename,
  renamingId,
  renamingValue,
  onRenamingValueChange,
  isCollapsed = false,
  onToggleCollapse,
}: AgentSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter sessions by search query
  const filteredSessions = searchQuery.trim()
    ? chatSessions.filter(
        (session) =>
          session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.messages.some((m) =>
            m.content.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : chatSessions;

  // Separate pinned and unpinned
  const pinnedSessions = filteredSessions.filter((s) => s.pinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.pinned);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 7) return date.toLocaleDateString();
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  if (isCollapsed) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-slate-950/50 backdrop-blur-sm border-l border-zinc-200/60 dark:border-zinc-800/80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 h-14 shrink-0">
        <span className="text-sm font-semibold tracking-wider text-zinc-900 dark:text-zinc-50 uppercase">
          History
        </span>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 bg-background shadow-sm hover:bg-muted"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* New Chat Button Row */}
      <div className="px-3 pt-3.5 pb-1">
        <Button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold shadow-md transition-all duration-200 border border-transparent"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="h-8 pl-8 text-xs bg-white/30 dark:bg-black/30 border border-white/20 dark:border-white/5 focus:border-zinc-400 focus:bg-background/80 transition-all duration-200 rounded-lg placeholder-zinc-500/70"
          />
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-2 py-1">
        {/* Pinned Section */}
        {pinnedSessions.length > 0 && (
          <div className="mb-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 mb-1.5">
              📌 Pinned
            </h4>
            <div className="space-y-0.5">
              {pinnedSessions.map((session) => (
                <ChatSessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeChatId}
                  onSelect={() => onSelectChat(session.id)}
                  onDelete={() => onDeleteChat(session.id)}
                  onTogglePin={() => onTogglePin(session.id)}
                  onBeginRename={() => onBeginRename(session.id)}
                  onSaveRename={() => onSaveRename(session.id)}
                  onCancelRename={onCancelRename}
                  isRenaming={renamingId === session.id}
                  renamingValue={renamingValue}
                  onRenamingValueChange={onRenamingValueChange}
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Section */}
        {unpinnedSessions.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 mb-1.5">
              Recent
            </h4>
            <div className="space-y-0.5">
              {unpinnedSessions.map((session) => (
                <ChatSessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeChatId}
                  onSelect={() => onSelectChat(session.id)}
                  onDelete={() => onDeleteChat(session.id)}
                  onTogglePin={() => onTogglePin(session.id)}
                  onBeginRename={() => onBeginRename(session.id)}
                  onSaveRename={() => onSaveRename(session.id)}
                  onCancelRename={onCancelRename}
                  isRenaming={renamingId === session.id}
                  renamingValue={renamingValue}
                  onRenamingValueChange={onRenamingValueChange}
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground/60 font-medium">
              {searchQuery ? "No chats found" : "No conversations yet"}
            </p>
            {!searchQuery && (
              <p className="text-[10px] text-muted-foreground/40 mt-1">
                Type / to start with a command
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Individual Chat Session Item ──────────────────────────────────────────

interface ChatSessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onBeginRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  isRenaming: boolean;
  renamingValue: string;
  onRenamingValueChange: (value: string) => void;
  formatRelativeTime: (date: Date) => string;
}

function ChatSessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onTogglePin,
  onBeginRename,
  onSaveRename,
  onCancelRename,
  isRenaming,
  renamingValue,
  onRenamingValueChange,
  formatRelativeTime,
}: ChatSessionItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-100 group relative border border-transparent",
        isActive
          ? "bg-white/60 dark:bg-white/10 backdrop-blur-md border-white/40 dark:border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.04)] text-foreground font-bold"
          : "text-foreground/75 hover:bg-white/20 dark:hover:bg-white/5 hover:text-foreground",
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeChatIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-zinc-950 dark:bg-white"
          transition={{ duration: 0.2 }}
        />
      )}

      {isRenaming ? (
        <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
          <Input
            value={renamingValue}
            onChange={(e) => onRenamingValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveRename();
              if (e.key === "Escape") onCancelRename();
            }}
            autoFocus
            className="h-7 text-xs flex-1"
            aria-label="Rename chat"
          />
          <Button
            size="icon"
            onClick={onSaveRename}
            className="h-6 w-6 rounded-md"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCancelRename}
            className="h-6 w-6 rounded-md"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          {/* Chat title and timestamp */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {session.pinned && (
                <Pin className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-xs truncate block",
                  isActive ? "font-semibold" : "font-medium",
                )}
              >
                {session.title.length > 0 ? session.title : "Empty Chat"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">
              {formatRelativeTime(session.timestamp)}
            </span>
          </div>

          {/* Actions dropdown */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin();
                  }}
                >
                  <Pin className="h-3.5 w-3.5 mr-2" />
                  {session.pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onBeginRename();
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
}
