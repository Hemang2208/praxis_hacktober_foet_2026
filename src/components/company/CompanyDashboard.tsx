"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CompanyKpiRibbon } from "@/components/company/CompanyKpiRibbon";
import type { CompanyFeedItem } from "@/components/company/CompanyAgentFeed";
import type { ViewerMembership } from "@/lib/company-analytics";
import {
  COMPANY_ANALYTICS_ROLES,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";
import { Lock, Search, Sparkles } from "lucide-react";

const CompanyAnalyticsPanels = dynamic(
  () =>
    import("@/components/company/CompanyAnalyticsPanels").then(
      (module) => module.CompanyAnalyticsPanels,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-sm text-slate-400">
        Loading analytics panels...
      </div>
    ),
  },
);

const CompanyAgentFeed = dynamic(
  () =>
    import("@/components/company/CompanyAgentFeed").then(
      (module) => module.CompanyAgentFeed,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-sm text-slate-400">
        Loading agent feed...
      </div>
    ),
  },
);

type OverviewResponse = {
  analytics: {
    updatedAt: string;
    locked: boolean;
    kpis: {
      hireabilityIndex: number;
      skillGap: number;
      velocityDays: number;
      roi: number;
    };
    summary: {
      activeProjects: number;
      completedProjects: number;
      totalProjects: number;
      totalTasks: number;
      completedTasks: number;
      blockedTasks: number;
      inProgressTasks: number;
      todoTasks: number;
      activeTeamMembers: number;
      progressAverage: number;
    };
    talentLeaderboard: Array<{
      label: string;
      score: number;
      completedTasks: number;
      activeTasks: number;
      blockedTasks: number;
      completionRate: number;
      focus: string;
    }>;
    projectHealth: Array<{
      label: string;
      health: number;
      progress: number;
      blockedTasks: number;
      overdueTasks: number;
      status: string;
    }>;
    alerts: Array<{
      label: string;
      severity: "info" | "warning" | "success" | "danger";
      message: string;
    }>;
    talentAccess: "full" | "masked";
  };
};

type FunnelResponse = {
  funnel: Array<{ name: string; value: number; fill: string }>;
};
type RadarResponse = { radar: Array<{ skill: string; score: number }> };
type BurndownResponse = {
  burndown: Array<{ label: string; planned: number; actual: number }>;
};
type FeedResponse = { feed: CompanyFeedItem[] };

function isViewerAllowed(viewerMembership: ViewerMembership | null) {
  return Boolean(
    viewerMembership &&
    viewerMembership.status === "active" &&
    COMPANY_ANALYTICS_ROLES.includes(
      normalizeCompanySubrole(viewerMembership.subrole),
    ),
  );
}

function normalizeFeed(items: CompanyFeedItem[]) {
  return Array.from(
    new Map(items.map((item) => [item.id, item])).values(),
  ).sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
}

export default function CompanyDashboard({
  companyId,
  companyName,
  viewerMembership,
}: {
  companyId: string;
  companyName: string;
  viewerMembership: ViewerMembership;
}) {
  const [overview, setOverview] = useState<
    OverviewResponse["analytics"] | null
  >(null);
  const [funnel, setFunnel] = useState<FunnelResponse["funnel"]>([]);
  const [radar, setRadar] = useState<RadarResponse["radar"]>([]);
  const [burndown, setBurndown] = useState<BurndownResponse["burndown"]>([]);
  const [feed, setFeed] = useState<CompanyFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [transportMode, setTransportMode] = useState<
    "websocket" | "polling" | "locked"
  >("polling");

  const canViewAnalytics = isViewerAllowed(viewerMembership);
  const socketUrl = process.env.NEXT_PUBLIC_COMPANY_ANALYTICS_WS_URL;

  useEffect(() => {
    if (!canViewAnalytics) {
      setLocked(true);
      setLoading(false);
      setTransportMode("locked");
      return;
    }

    let cancelled = false;

    const fetchFeed = async () => {
      const response = await fetch(`/api/company/${companyId}/analytics/feed`);
      const data = (await response
        .json()
        .catch(() => null)) as FeedResponse | null;

      if (!response.ok || !data) {
        return;
      }

      if (!cancelled) {
        setFeed(normalizeFeed(data.feed || []));
      }
    };

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const overviewResponse = await fetch(
          `/api/company/${companyId}/analytics/overview`,
        );
        const overviewData = (await overviewResponse
          .json()
          .catch(() => null)) as OverviewResponse | null;

        if (!overviewResponse.ok || !overviewData) {
          if (overviewResponse.status === 403) {
            if (!cancelled) {
              setLocked(true);
              setTransportMode("locked");
            }
            return;
          }

          throw new Error("Failed to load company analytics");
        }

        const [funnelResponse, radarResponse, burndownResponse, feedResponse] =
          await Promise.all([
            fetch(`/api/company/${companyId}/analytics/funnel`),
            fetch(`/api/company/${companyId}/analytics/radar`),
            fetch(`/api/company/${companyId}/analytics/burndown`),
            fetch(`/api/company/${companyId}/analytics/feed`),
          ]);

        const funnelData = (await funnelResponse
          .json()
          .catch(() => null)) as FunnelResponse | null;
        const radarData = (await radarResponse
          .json()
          .catch(() => null)) as RadarResponse | null;
        const burndownData = (await burndownResponse
          .json()
          .catch(() => null)) as BurndownResponse | null;
        const feedData = (await feedResponse
          .json()
          .catch(() => null)) as FeedResponse | null;

        if (!cancelled) {
          setOverview(overviewData.analytics);
          setFunnel(funnelData?.funnel || []);
          setRadar(radarData?.radar || []);
          setBurndown(burndownData?.burndown || []);
          setFeed(normalizeFeed(feedData?.feed || []));
          setLocked(false);
          setTransportMode(socketUrl ? "websocket" : "polling");
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load company analytics",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const startPolling = async () => {
      await fetchFeed();
      return window.setInterval(fetchFeed, 15000);
    };

    const startSocket = () => {
      if (!socketUrl) {
        return null;
      }

      try {
        const socket = new WebSocket(
          `${socketUrl.replace(/\/$/, "")}?companyId=${companyId}`,
        );

        socket.onopen = () => {
          if (!cancelled) {
            setTransportMode("websocket");
          }
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data as string);
            const nextFeed = Array.isArray(payload)
              ? payload
              : payload.feed
                ? payload.feed
                : payload.entry
                  ? [payload.entry]
                  : [];

            if (!cancelled && nextFeed.length > 0) {
              setFeed((current) =>
                normalizeFeed([
                  ...nextFeed,
                  ...current,
                ] as CompanyFeedItem[]).slice(0, 24),
              );
            }
          } catch {
            // Ignore malformed socket payloads and keep the dashboard live.
          }
        };

        socket.onerror = () => {
          if (!cancelled) {
            setTransportMode("polling");
          }
        };

        return socket;
      } catch {
        return null;
      }
    };

    let intervalId: number | undefined;
    let socket: WebSocket | null = null;

    void fetchAnalytics();

    if (socketUrl) {
      socket = startSocket();
      if (!socket) {
        void startPolling().then((id) => {
          intervalId = id;
          if (!cancelled) {
            setTransportMode("polling");
          }
        });
      }
    } else {
      void startPolling().then((id) => {
        intervalId = id;
        if (!cancelled) {
          setTransportMode("polling");
        }
      });
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      socket?.close();
    };
  }, [companyId, canViewAnalytics, socketUrl]);

  const feedStatus = useMemo(() => {
    if (locked) return "Locked";
    if (transportMode === "websocket") return "Socket live";
    return "Polling";
  }, [locked, transportMode]);

  if (locked) {
    return (
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6 text-slate-50 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
              Command Center
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Company Intelligence Dashboard
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {companyName} is visible, but live analytics are locked until a
              verified company seat is active.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="border border-slate-700 bg-slate-900 text-slate-200">
              {feedStatus}
            </Badge>
            <Button
              asChild
              className="bg-white text-slate-950 hover:bg-slate-200"
            >
              <Link href="/company/login">
                <Lock className="mr-2 h-4 w-4" />
                Unlock Talent
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr_0.9fr]">
          <Card className="relative overflow-hidden border-slate-800 bg-slate-900/50 text-slate-50">
            <CardContent className="space-y-3 p-6 blur-sm">
              <div className="h-20 rounded-2xl bg-slate-800/70" />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="h-24 rounded-2xl bg-slate-800/70" />
                <div className="h-24 rounded-2xl bg-slate-800/70" />
                <div className="h-24 rounded-2xl bg-slate-800/70" />
                <div className="h-24 rounded-2xl bg-slate-800/70" />
              </div>
            </CardContent>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-slate-950/35">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-xl">
                <Sparkles className="mr-2 inline-block h-4 w-4" />
                Unlock Talent to reveal the analytics layer.
              </div>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6 text-slate-50 shadow-2xl shadow-slate-950/20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
            Command Center
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Company Intelligence Dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Static company details stay above. This section runs live KPIs,
            graphs, and agent telemetry as a separate analytical layer.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Badge className="border border-slate-700 bg-slate-900 text-slate-200">
            {feedStatus}
          </Badge>
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter live feed"
              className="border-slate-800 bg-slate-900/70 pl-9 text-slate-50 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {loading && !overview ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-400">
            Loading company intelligence...
          </div>
        ) : overview ? (
          <>
            <CompanyKpiRibbon
              kpis={overview.kpis}
              summary={overview.summary}
              updatedAt={overview.updatedAt}
            />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
              <CompanyAnalyticsPanels
                overview={overview}
                funnel={funnel}
                radar={radar}
                burndown={burndown}
              />
              <CompanyAgentFeed
                feed={feed}
                searchQuery={searchQuery}
                transportMode={transportMode}
                locked={false}
              />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
