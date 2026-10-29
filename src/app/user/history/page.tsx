"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAppDispatch } from "@/redux/hooks";
import { useUser } from "@/hooks/useUser";
import {
  Search,
  Plus,
  History,
  Ellipsis,
  Trash2,
  Edit,
  Loader2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  fetchSupportChats,
  deleteSupportChat,
  updateSupportChatTitle,
  addLocalSession,
} from "@/redux/slice/supportChat.slice";
import type { Message, ChatSession } from "@/types/support-agent";

const CHAT_HISTORY_KEY_PREFIX = "supportAgentChatSessions";
const getChatHistoryKey = (userId?: string | null) =>
  userId ? `${CHAT_HISTORY_KEY_PREFIX}_${userId}` : CHAT_HISTORY_KEY_PREFIX;

const genId = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const safeSaveChatHistory = (sessions: ChatSession[], activeId: string | null, userId?: string | null) => {
  if (typeof window === "undefined" || !userId) return;
  const key = getChatHistoryKey(userId);
  try {
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to save chat sessions to localStorage:", error);
  }
};

const formatTimeOrDate = (date: Date) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  if (date >= startOfToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (date >= startOfYesterday) {
    return "Yesterday";
  } else {
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
  }
};

const getPreview = (session: ChatSession) => {
  if (!session.messages || session.messages.length === 0) return "No messages yet";
  const lastMsg = session.messages[session.messages.length - 1];
  const content = lastMsg.content || "";
  return content.replace(/[*#`_\-]/g, "").slice(0, 120);
};

const groupSessions = (sessions: ChatSession[]) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOf30DaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { [key: string]: ChatSession[] } = {
    "Today": [],
    "Yesterday": [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    "Older": []
  };

  sessions.forEach(session => {
    const date = session.timestamp ? new Date(session.timestamp) : new Date();
    if (date >= startOfToday) {
      groups["Today"].push(session);
    } else if (date >= startOfYesterday) {
      groups["Yesterday"].push(session);
    } else if (date >= startOf7DaysAgo) {
      groups["Previous 7 Days"].push(session);
    } else if (date >= startOf30DaysAgo) {
      groups["Previous 30 Days"].push(session);
    } else {
      groups["Older"].push(session);
    }
  });

  return groups;
};

export default function ChatHistoryPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mongoUser, isLoaded } = useUser();
  const userId = mongoUser?.user_id || mongoUser?._id || null;

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog & drop states
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Active chat ref (stored in storage check)
  const activeChatId = chatSessions[0]?.id || null;

  // Load chat sessions from local storage and sync with server
  useEffect(() => {
    if (isLoaded && userId && typeof window !== "undefined") {
      setLoading(true);
      const storedHistory = localStorage.getItem(getChatHistoryKey(userId));
      let localSessions: ChatSession[] = [];
      if (storedHistory) {
        try {
          const raw = JSON.parse(storedHistory);
          localSessions = raw.map((session: any) => ({
            id: String(session.id),
            title: session.title || "New Chat",
            messages: session.messages || [],
            timestamp: session.timestamp ? new Date(session.timestamp) : new Date(),
            pinned: !!session.pinned,
          }));
        } catch (e) {
          console.error("Failed to parse chat history from local storage", e);
        }
      }

      setChatSessions(localSessions);

      // Async server load
      (async () => {
        try {
          const action = await dispatch(fetchSupportChats());
          const serverChats = Array.isArray(action.payload)
            ? (action.payload as any[])
            : [];

          if (serverChats.length > 0) {
            const mapped = serverChats.map((s) => ({
              id: String(s.id),
              title: s.title || "Support Chat",
              messages: (s.messages || []).map((m: any) => ({
                id: m._id ? String(m._id) : genId(),
                role: m.role,
                content: m.content || "",
                timestamp: new Date(m.timestamp),
                type: m.type || "text",
              })),
              timestamp: s.lastActivity ? new Date(s.lastActivity) : new Date(),
              pinned: false,
            }));

            setChatSessions((prev) => {
              const existingKeys = new Set(
                prev.map(
                  (p) => `${p.title}::${(p.messages[0]?.content || "").slice(0, 80)}`
                )
              );
              const filteredServer = mapped.filter((m) => {
                const key = `${m.title}::${(m.messages[0]?.content || "").slice(0, 80)}`;
                return !existingKeys.has(key);
              });

              const merged = [...filteredServer, ...prev];
              const mergedSorted = merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

              safeSaveChatHistory(mergedSorted, activeChatId, userId);
              return mergedSorted;
            });
          }
          setLoading(false);
        } catch (err) {
          console.warn("Failed to sync server-side chats", err);
          setLoading(false);
        }
      })();
    }
  }, [isLoaded, userId, dispatch]);

  const handleNewChat = () => {
    const newChatId = genId();
    const newSession: ChatSession = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      timestamp: new Date(),
    };

    const key = getChatHistoryKey(userId);
    const currentHistory = localStorage.getItem(key) || "[]";
    try {
      const rawHistory = JSON.parse(currentHistory);
      rawHistory.unshift(newSession);
      localStorage.setItem(key, JSON.stringify(rawHistory));
    } catch (e) {
      localStorage.setItem(key, JSON.stringify([newSession]));
    }

    try {
      dispatch(
        addLocalSession({
          id: newChatId,
          title: "New Chat",
          messages: [],
        })
      );
    } catch (err) {
      console.warn("Failed to create new local support chat session", err);
    }

    router.push(`/user/chat/${newChatId}`);
  };

  const handleBeginRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenamingValue(currentTitle);
    setIsRenameOpen(true);
  };

  const handleRenameSave = () => {
    if (!renamingId || !renamingValue.trim()) return;

    setChatSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== renamingId) return s;
        return { ...s, title: renamingValue.trim() };
      });
      safeSaveChatHistory(updated, activeChatId, userId);
      return updated;
    });

    const isServerId = /^[0-9a-fA-F]{24}$/.test(renamingId);
    if (isServerId) {
      try {
        dispatch(updateSupportChatTitle({ chatId: renamingId, title: renamingValue.trim() }));
      } catch (err) {
        console.warn("Failed to update chat title on server", err);
      }
    }

    setRenamingId(null);
    setIsRenameOpen(false);
  };

  const handleBeginDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingId) return;

    setChatSessions((prev) => {
      const updated = prev.filter((s) => s.id !== deletingId);
      safeSaveChatHistory(updated, activeChatId, userId);
      return updated;
    });

    const isServerId = /^[0-9a-fA-F]{24}$/.test(deletingId);
    if (isServerId) {
      try {
        dispatch(deleteSupportChat({ chatId: deletingId }));
      } catch (err) {
        console.warn("Failed to delete chat on server", err);
      }
    }

    setDeletingId(null);
    setIsDeleteOpen(false);
  };

  // Filter conversations
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return chatSessions;
    const query = searchQuery.toLowerCase().trim();
    return chatSessions.filter((s) => {
      const matchesTitle = s.title.toLowerCase().includes(query);
      const matchesMessages = s.messages.some((m) =>
        m.content.toLowerCase().includes(query)
      );
      return matchesTitle || matchesMessages;
    });
  }, [chatSessions, searchQuery]);

  const grouped = useMemo(() => groupSessions(filteredSessions), [filteredSessions]);

  const hasConversations = chatSessions.length > 0;
  const hasSearchResults = filteredSessions.length > 0;

  return (
    <div className="flex-1 min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-[#F5F5F5] p-6 md:p-8 flex flex-col max-w-5xl mx-auto w-full transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-[#F5F5F5] flex items-center gap-2">
            <History className="h-7 w-7 text-zinc-800 dark:text-[#F5F5F5]" />
            Chat History
          </h1>
          <p className="text-zinc-500 dark:text-[#A1A1AA] text-sm mt-1">
            Find and continue your previous conversations.
          </p>
        </div>
        <Button
          onClick={handleNewChat}
          className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold px-5 py-2.5 h-10 shadow-sm flex items-center gap-2 border border-zinc-950 transition-all cursor-pointer dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:border-white"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search bar */}
      {hasConversations && (
        <div className="relative w-full mb-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-[#71717A]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 pr-4 py-2.5 h-11 w-full rounded-xl border border-zinc-200 dark:border-[#1E1F23] focus-visible:ring-zinc-400 bg-white dark:bg-[#111214] text-zinc-900 dark:text-[#F5F5F5] placeholder:text-zinc-400 dark:placeholder:text-[#71717A] text-sm"
          />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1">
        {loading ? (
          // Loading state
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="border border-zinc-200/60 dark:border-[#1E1F23] rounded-xl p-5 bg-white dark:bg-[#111214] space-y-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-5 w-48 bg-zinc-150 dark:bg-[#17181C] rounded" />
                  <div className="h-4 w-12 bg-zinc-150 dark:bg-[#17181C] rounded" />
                </div>
                <div className="h-4 w-[75%] bg-zinc-100 dark:bg-[#17181C]/60 rounded" />
              </div>
            ))}
          </div>
        ) : !hasConversations ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-center border border-zinc-150 dark:border-[#1E1F23] border-dashed rounded-2xl bg-zinc-50/30 dark:bg-[#111214]/50 p-8 max-w-lg mx-auto mt-8">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-[#17181C] flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-zinc-455 dark:text-[#A1A1AA]" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-[#F5F5F5]">No conversations yet</h3>
            <p className="text-zinc-500 dark:text-[#A1A1AA] text-xs mt-2 max-w-sm">
              Start a new conversation with Kiyo and it will appear here.
            </p>
            <Button
              onClick={handleNewChat}
              className="mt-6 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold px-4 h-9 flex items-center gap-1.5 cursor-pointer dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Start New Chat
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : !hasSearchResults ? (
          // Search empty state
          <div className="flex flex-col items-center justify-center py-16 text-center p-8 max-w-md mx-auto">
            <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-[#17181C] flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-zinc-400 dark:text-[#71717A]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">No conversations found</h3>
            <p className="text-zinc-400 dark:text-[#A1A1AA] text-xs mt-1">
              Try searching with another keyword.
            </p>
          </div>
        ) : (
          // Conversations list grouped
          <div className="space-y-8">
            {Object.entries(grouped).map(([groupName, sessions]) => {
              if (sessions.length === 0) return null;

              return (
                <div key={groupName} className="space-y-3">
                  <h2 className="text-xs font-bold tracking-wider text-zinc-400 dark:text-[#71717A] uppercase select-none pl-1">
                    {groupName}
                  </h2>
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => router.push(`/user/chat/${session.id}`)}
                        className="group relative flex items-start justify-between border border-zinc-200 dark:border-[#1E1F23] rounded-xl p-5 bg-white dark:bg-[#111214] hover:bg-zinc-50/50 dark:hover:bg-[#17181C] hover:shadow-sm hover:border-zinc-300 dark:hover:border-[#26272B] transition-all duration-200 cursor-pointer overflow-hidden"
                      >
                        {/* Active vertical indicator */}
                        {session.id === activeChatId && (
                          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-zinc-950 dark:bg-emerald-500" />
                        )}

                        <div className="flex-1 pr-6 min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5] group-hover:text-zinc-950 dark:group-hover:text-white truncate">
                            {session.title || "New Chat"}
                          </h3>
                          <p className="text-xs text-zinc-400 dark:text-[#A1A1AA] mt-1.5 truncate leading-relaxed">
                            {getPreview(session)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 select-none">
                          <span className="text-[11px] text-zinc-400 dark:text-[#71717A] font-medium">
                            {formatTimeOrDate(session.timestamp ? new Date(session.timestamp) : new Date())}
                          </span>

                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#17181C] hover:text-zinc-900 dark:hover:text-[#F5F5F5] text-zinc-400 dark:text-[#71717A] p-0 flex items-center justify-center cursor-pointer"
                                >
                                  <Ellipsis className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white dark:bg-[#111214] border border-zinc-155 dark:border-[#1E1F23] p-1 rounded-xl shadow-lg w-36">
                                <DropdownMenuItem
                                  onClick={() => handleBeginRename(session.id, session.title)}
                                  className="text-xs font-medium text-zinc-700 dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] hover:text-zinc-955 dark:hover:text-white p-2 rounded-lg cursor-pointer flex items-center gap-2"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleBeginDelete(session.id)}
                                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-lg cursor-pointer flex items-center gap-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#111214] border border-zinc-150 dark:border-[#1E1F23] p-5 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">Rename Conversation</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1">
              Enter a new title for this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              placeholder="Conversation title..."
              className="rounded-xl border border-zinc-200 dark:border-[#1E1F23] bg-white dark:bg-[#17181C] text-zinc-900 dark:text-[#F5F5F5] focus-visible:ring-zinc-450 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSave();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsRenameOpen(false)}
              className="rounded-xl border border-zinc-200 dark:border-[#26272B] dark:bg-transparent text-zinc-800 dark:text-[#F5F5F5] hover:bg-zinc-100 dark:hover:bg-[#17181C] text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSave}
              className="rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold h-9 px-4 cursor-pointer"
              disabled={!renamingValue.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#111214] border border-zinc-150 dark:border-[#1E1F23] p-5 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-650 dark:text-red-400 flex items-center gap-2">
              Delete this conversation?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-[#A1A1AA] leading-relaxed mt-1.5">
              This conversation and its messages will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-xl border border-zinc-200 dark:border-[#26272B] dark:bg-transparent text-zinc-800 dark:text-[#F5F5F5] hover:bg-zinc-100 dark:hover:bg-[#17181C] text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
