"use client";

import { useEffect, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export type CompanyFeedItem = {
  id: string;
  agent: string;
  type: "REJECTED" | "INFO" | "SUCCESS" | "WARNING";
  message: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean | null>;
};

const TYPE_STYLES: Record<CompanyFeedItem["type"], string> = {
  REJECTED: "border-red-500/20 bg-red-500/10 text-red-200",
  INFO: "border-blue-500/20 bg-blue-500/10 text-blue-200",
  SUCCESS: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  WARNING: "border-amber-500/20 bg-amber-500/10 text-amber-200",
};

export function CompanyAgentFeed({
  feed,
  searchQuery,
  transportMode,
  locked,
}: {
  feed: CompanyFeedItem[];
  searchQuery: string;
  transportMode: "websocket" | "polling" | "locked";
  locked: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const filteredFeed = useMemo(() => {
    if (!searchQuery.trim()) {
      return feed;
    }

    const needle = searchQuery.trim().toLowerCase();
    return feed.filter((item) => {
      return [item.agent, item.message, item.type, ...Object.values(item.metadata).map(String)]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [feed, searchQuery]);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [filteredFeed.length]);

  return (
    <Card className="border-slate-800 bg-slate-950/90 text-slate-50 shadow-2xl shadow-slate-950/20">
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-slate-50">Agent Intelligence Feed</CardTitle>
            <p className="mt-1 text-sm text-slate-400">Streaming operational logs from the company agent pipeline.</p>
          </div>
          <Badge variant="secondary" className="border border-slate-700 bg-slate-900 text-slate-200">
            {locked ? "Locked" : transportMode === "websocket" ? "Socket live" : "Polling"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[760px]">
          <div ref={viewportRef} className="space-y-3 p-4">
            {filteredFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
                {locked ? "Analytics are locked. Unlock Talent to view live agent output." : "Waiting for agent activity."}
              </div>
            ) : (
              filteredFeed.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${TYPE_STYLES[item.type]}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-current bg-transparent text-inherit">
                        {item.agent}
                      </Badge>
                      <span className="text-xs uppercase tracking-[0.22em] opacity-70">{item.type}</span>
                    </div>
                    <span className="text-xs opacity-70">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/90">{item.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-inherit/80">
                    {Object.entries(item.metadata).map(([key, value]) => (
                      <span key={`${item.id}-${key}`} className="rounded-full border border-current/20 px-2 py-1">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}