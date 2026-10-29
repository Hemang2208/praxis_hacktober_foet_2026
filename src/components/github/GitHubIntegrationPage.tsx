"use client";

import React from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/redux/hooks";
import { fetchGitHubData, clearGitHubCacheStorage } from "@/redux/slice/github.slice";
import type { GitHubRepository, GitHubCommit } from "@/redux/slice/github.slice";
import type { RootState } from "@/redux/store";
import useUserProfile from "@/hooks/useUserProfile";
import { formatDistanceToNow } from "date-fns";

// Radix/UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  GitBranch,
  GitCommit,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Loader2,
  Layers,
  ArrowRight,
} from "lucide-react";

// Standard Recharts imports with client-only mounting safety wrapper
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Helper function to calculate code quality score
import { calculateCodeQuality } from "@/lib/github";
import { ContributionCalendar } from "./ContributionCalendar";

interface GitHubIntegrationPageProps {
  redirectPath: string;
}

export function GitHubIntegrationPage({ redirectPath }: GitHubIntegrationPageProps) {
  const { mongoUser, loading: profileLoading, error: profileError } = useUserProfile();
  const dispatch = useAppDispatch();
  
  const githubData = useSelector((state: RootState) => state.github.data);
  const githubLoading = useSelector((state: RootState) => state.github.loading);
  const githubError = useSelector((state: RootState) => state.github.error);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullRequests, setPullRequests] = React.useState<any[]>([]);
  const [prLoading, setPrLoading] = React.useState(false);
  const [commitRange, setCommitRange] = React.useState(30);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Extract GitHub username dynamically
  let githubUsername: string | null = null;
  if (mongoUser?.socialLinks?.github) {
    const match = mongoUser.socialLinks.github.match(/github\.com\/([^/]+)/);
    if (match) {
      githubUsername = match[1];
    }
  }

  // Fallback to cookies if redirect from OAuth was handled server-side
  if (!githubUsername && typeof window !== "undefined") {
    try {
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith("github_user="));
      if (cookieValue) {
        const rawValue = cookieValue.split("=")[1];
        let decoded = decodeURIComponent(rawValue);
        if (decoded.startsWith('"') && decoded.endsWith('"')) {
          decoded = decoded.slice(1, -1);
        }
        if (!(decoded.startsWith("{") && decoded.endsWith("}"))) {
          try {
            decoded = decodeURIComponent(decoded);
          } catch {}
        }
        const githubUserObj = JSON.parse(decoded);
        if (githubUserObj && githubUserObj.login) {
          githubUsername = githubUserObj.login;
        }
      }
    } catch {}
  }

  // Fetch initial profile & data
  React.useEffect(() => {
    if (githubUsername) {
      if (!githubData.user || githubData.user.login !== githubUsername) {
        dispatch(fetchGitHubData(githubUsername));
      }
    }
  }, [githubUsername, dispatch, githubData.user]);

  // Fetch Pull Requests separately
  React.useEffect(() => {
    if (mongoUser?._id && mongoUser.role === "student") {
      setPrLoading(true);
      fetch("/api/github/pull-requests", {
        headers: {
          "x-user-id": mongoUser._id,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.pull_requests) {
            setPullRequests(data.pull_requests);
          }
        })
        .catch((err) => console.error("Error fetching pull requests:", err))
        .finally(() => setPrLoading(false));
    }
  }, [mongoUser?._id, mongoUser?.role]);

  // Refetch / Refresh logic
  const refetch = async () => {
    if (githubUsername && !isRefreshing) {
      setIsRefreshing(true);
      try {
        dispatch(clearGitHubCacheStorage(githubUsername));
        await dispatch(fetchGitHubData(githubUsername));
        
        // Refetch PRs as well
        if (mongoUser?._id && mongoUser.role === "student") {
          const res = await fetch("/api/github/pull-requests", {
            headers: {
              "x-user-id": mongoUser._id,
            },
          });
          const data = await res.json();
          if (data && data.pull_requests) {
            setPullRequests(data.pull_requests);
          }
        }
      } catch (err) {
        console.error("Refetch failed", err);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleConnectGitHub = () => {
    window.location.href = `/api/github/oauth/start?redirect=${redirectPath}`;
  };

  // ── SKELETON LOADER ───────────────────────────────────────────────
  if (profileLoading || (githubLoading && !githubData.user)) {
    return (
      <div className="space-y-8 animate-pulse p-1">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-4 w-96 bg-zinc-100 dark:bg-zinc-900 rounded-md"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
          </div>
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-850 rounded-lg"></div>
              <div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-850 rounded-md"></div>
              <div className="h-6 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-md"></div>
            </div>
          ))}
        </div>

        {/* 3-Column Analytics Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md"></div>
              <div className="h-48 w-full bg-zinc-100 dark:bg-zinc-850 rounded-xl"></div>
            </div>
          ))}
        </div>

        {/* Bottom Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-md"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-full bg-zinc-100 dark:bg-zinc-850 rounded-xl"></div>
              ))}
            </div>
          </div>
          <div className="h-96 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-850 rounded-md"></div>
                    <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-850 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ──────────────────────────────────────────────────
  if (profileError || githubError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">GitHub Integration</h1>
            <p className="text-zinc-500 text-sm mt-1">Track commits, sync repos, and analyze contribution history.</p>
          </div>
        </div>
        <Alert variant="destructive" className="border-red-200/60 bg-red-50/50 text-red-900 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{profileError || githubError}</AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button onClick={refetch} variant="outline" className="border-zinc-200 hover:bg-zinc-50 rounded-xl font-medium" disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── NOT CONNECTED STATE ──────────────────────────────────────────
  if (!githubUsername) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex flex-col gap-1 border-b border-zinc-200/60 dark:border-[#1E1F23] pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-[#F5F5F5]">
            GitHub Sync
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#B3B3B8]">
            Sync your code repositories, view commits, pull requests, and analyze contributions directly in your Kiyo workspace.
          </p>
        </div>

        <div className="w-full border border-zinc-200/60 dark:border-[#1E1F23] rounded-2xl bg-white dark:bg-[#111214] p-10 md:p-14 text-center flex flex-col items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] min-h-[400px]">
          <div className="h-16 w-16 bg-zinc-50 dark:bg-zinc-850 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800 mb-5">
            <GitBranch className="h-8 w-8 text-zinc-900 dark:text-zinc-50" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Connect Your GitHub Account</h2>
          <p className="text-xs text-zinc-500 dark:text-[#B3B3B8] max-w-md mb-6 leading-relaxed">
            Link your GitHub account to enable automatic PR tracking, contribution metrics, and code review insights across all your projects.
          </p>
          <Button
            className="bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-white rounded-xl px-6 py-2.5 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            onClick={handleConnectGitHub}
          >
            Connect GitHub Account
          </Button>
        </div>
      </div>
    );
  }

  // ── DATA PREPARATION & CALCULATIONS ──────────────────────────────
  const repos = githubData.repositories || [];
  const commits = (githubData.commits || []) as GitHubCommit[];

  // Code Quality Score calculation using existing helper
  const repoQualities = repos.map((repo) =>
    calculateCodeQuality(repo, commits as any, githubData.stats?.languages || {})
  );
  const avgQualityScore = repoQualities.length > 0
    ? Math.round(repoQualities.reduce((sum, q) => sum + q, 0) / repoQualities.length)
    : 85;

  let semanticStatus = "Good";
  let semanticColor = "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
  if (avgQualityScore >= 90) {
    semanticStatus = "Excellent";
    semanticColor = "text-green-600 bg-green-50 dark:bg-green-950/30";
  } else if (avgQualityScore < 70) {
    semanticStatus = "Needs Attention";
    semanticColor = "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
  }

  // Repositories breakdown
  const publicRepos = repos.filter((r) => !r.private).length;
  const privateRepos = repos.filter((r) => r.private).length;

  // PRs Breakdown
  const totalPRs = pullRequests.length;
  const closedPRs = pullRequests.filter((pr) => pr.state === "closed" || pr.state === "merged").length;

  // Group commits by day over the last 180 days for Commit Activity Chart
  const getCommitChartData = () => {
    const dataMap: Record<string, number> = {};
    // Seed last 180 days with 0
    for (let i = 179; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dataMap[key] = 0;
    }

    // Populate with real commit timestamps
    commits.forEach((commit) => {
      if (commit.timestamp) {
        const dateKey = new Date(commit.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (dateKey in dataMap) {
          dataMap[dateKey] += 1;
        }
      }
    });

    return Object.entries(dataMap).map(([date, count]) => ({
      date,
      commits: count,
    }));
  };

  const chartData = getCommitChartData();
  const hasCommitsInWindow = chartData.some((d) => d.commits > 0);

  // Create unified timeline activity list
  const recentActivities: any[] = [];
  
  // 1. Commits Pushed
  commits.slice(0, 4).forEach((commit) => {
    recentActivities.push({
      id: `commit-${commit.id}`,
      type: "commit",
      title: "Commit pushed",
      description: commit.message,
      meta: `${commit.repository} • ${commit.branch || "main"}`,
      timestamp: commit.timestamp ? new Date(commit.timestamp) : new Date(),
    });
  });

  // 2. PRs Pushed/Merged
  pullRequests.slice(0, 4).forEach((pr, index) => {
    const isMerged = pr.state === "merged" || pr.state === "closed";
    recentActivities.push({
      id: `pr-${pr.url || index}`,
      type: "pr",
      title: isMerged ? "Pull request merged" : "Pull request opened",
      description: pr.title,
      meta: `#${pr.url?.split("/").pop() || "PR"}`,
      timestamp: pr.created_at ? new Date(pr.created_at) : new Date(),
    });
  });

  // Sort unified activities chronologically (most recent first)
  recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // ── RENDER COMPONENT ──────────────────────────────────────────────
  return (
    <div className="space-y-8 p-1">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">GitHub Integration</h1>
          </div>
          <p className="text-zinc-500 text-sm">Sync your repositories, track contributions, and analyze code impact.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={refetch}
            variant="outline"
            className="border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] hover:bg-zinc-50 dark:hover:bg-[#17181C] text-zinc-800 dark:text-[#F5F5F5] font-medium rounded-xl h-10 px-4 transition-all"
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Now
          </Button>
          <Button
            className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium rounded-xl h-10 px-4 transition-all"
            onClick={() => window.open(`https://github.com/${githubUsername}`, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on GitHub
          </Button>
        </div>
      </div>

      {/* ── TOP METRICS (5 CARDS) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Commits */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white dark:bg-[#111214] overflow-hidden hover:scale-[1.01] transition-transform duration-200">
          <CardContent className="p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-[#17181C] flex items-center justify-center border border-zinc-100 dark:border-[#26272B] text-zinc-900 dark:text-[#F5F5F5]">
              <GitCommit className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 dark:text-[#71717A] uppercase tracking-wider">Total Commits</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-[#F5F5F5] mt-1">{githubData.stats?.totalCommits || "0"}</h3>
              <p className="text-[11px] text-zinc-400 dark:text-[#71717A] mt-1">Across all repositories</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Repositories */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white dark:bg-[#111214] overflow-hidden hover:scale-[1.01] transition-transform duration-200">
          <CardContent className="p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-[#17181C] flex items-center justify-center border border-zinc-100 dark:border-[#26272B] text-zinc-900 dark:text-[#F5F5F5]">
              <GitBranch className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 dark:text-[#71717A] uppercase tracking-wider">Repositories</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-[#F5F5F5] mt-1">{githubData.stats?.totalRepos || "0"}</h3>
              <p className="text-[11px] text-zinc-400 dark:text-[#71717A] mt-1">{publicRepos} public • {privateRepos} private</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Stars */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white dark:bg-[#111214] overflow-hidden hover:scale-[1.01] transition-transform duration-200">
          <CardContent className="p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-[#17181C] flex items-center justify-center border border-zinc-100 dark:border-[#26272B] text-zinc-900 dark:text-[#F5F5F5]">
              <Star className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 dark:text-[#71717A] uppercase tracking-wider">Total Stars</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-[#F5F5F5] mt-1">{githubData.stats?.totalStars || "0"}</h3>
              <p className="text-[11px] text-zinc-400 dark:text-[#71717A] mt-1">Across all repositories</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Pull Requests */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white dark:bg-[#111214] overflow-hidden hover:scale-[1.01] transition-transform duration-200">
          <CardContent className="p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-[#17181C] flex items-center justify-center border border-zinc-100 dark:border-[#26272B] text-zinc-900 dark:text-[#F5F5F5]">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 dark:text-[#71717A] uppercase tracking-wider">Pull Requests</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-[#F5F5F5] mt-1">{totalPRs}</h3>
              <p className="text-[11px] text-zinc-400 dark:text-[#71717A] mt-1">{closedPRs} merged / closed</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Code Health */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white dark:bg-[#111214] overflow-hidden hover:scale-[1.01] transition-transform duration-200">
          <CardContent className="p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-[#17181C] flex items-center justify-center border border-zinc-100 dark:border-[#26272B] text-zinc-900 dark:text-[#F5F5F5]">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 dark:text-[#71717A] uppercase tracking-wider">Code Health</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-[#F5F5F5]">{avgQualityScore}%</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${semanticColor}`}>
                  {semanticStatus}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-[#71717A] mt-1">Overall repository quality</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3-COLUMN ANALYTICS SECTION ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contribution Activity */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-[#F5F5F5]">Contribution Activity</h3>
              <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0 dark:bg-[#17181C] dark:text-[#F5F5F5] dark:border-[#26272B]">90 Days</Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mb-6">Your contributions over the last 90 days</p>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 py-2 overflow-x-auto hide-scrollbar w-full">
            <ContributionCalendar username={githubUsername} />
          </div>
          <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-[#71717A] pt-3 border-t border-zinc-100 dark:border-[#1E1F23]">
            <span>Less</span>
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded bg-zinc-100 dark:bg-[#17181C]"></span>
              <span className="h-2 w-2 rounded bg-emerald-100 dark:bg-emerald-950"></span>
              <span className="h-2 w-2 rounded bg-emerald-300 dark:bg-emerald-800"></span>
              <span className="h-2 w-2 rounded bg-emerald-500 dark:bg-emerald-500"></span>
              <span className="h-2 w-2 rounded bg-emerald-700 dark:bg-emerald-300"></span>
            </div>
            <span>More</span>
          </div>
        </Card>

        {/* Center Column: Commit Activity */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-[#F5F5F5]">Commit Activity</h3>
              <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0 dark:bg-[#17181C] dark:text-[#F5F5F5] dark:border-[#26272B]">6 Months</Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mb-6">Commits over time</p>
          </div>
          <div className="flex-1 w-full h-[160px] min-h-[160px]">
            {mounted && hasCommitsInWindow ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    fontSize={9}
                    tick={{ fill: "#71717A" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={9}
                    tick={{ fill: "#71717A" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111214",
                      borderColor: "#26272B",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                      color: "#F5F5F5",
                    }}
                    labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#F5F5F5" }}
                    itemStyle={{ fontSize: "11px", color: "#22C55E", padding: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="commits"
                    stroke="#22C55E"
                    strokeWidth={1.8}
                    fillOpacity={1}
                    fill="url(#colorCommits)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : mounted ? (
              <div className="flex items-center justify-center h-full text-xs text-zinc-400 dark:text-[#71717A]">
                No commits in the last 6 months
              </div>
            ) : null}
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-[#1E1F23]"></div>
        </Card>

        {/* Right Column: Top Repositories */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-[#F5F5F5]">Top Repositories</h3>
              <button
                className="text-[11px] font-medium text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
                onClick={() => window.open(`https://github.com/${githubUsername}?tab=repositories`, "_blank")}
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mb-4">Most relevant repositories</p>
          </div>
          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[220px] pr-1 hide-scrollbar">
            {repos.length > 0 ? (
              repos.slice(0, 5).map((repo: GitHubRepository) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between border-b border-zinc-50 dark:border-[#1E1F23]/60 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 pr-2">
                    <h4
                      className="font-medium text-xs text-zinc-800 dark:text-[#F5F5F5] hover:text-black dark:hover:text-white truncate cursor-pointer"
                      onClick={() => window.open(repo.html_url, "_blank")}
                    >
                      {repo.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center text-[10px] text-zinc-400 dark:text-[#71717A]">
                        <span
                          className="h-1.5 w-1.5 rounded-full mr-1 flex-shrink-0"
                          style={{
                            backgroundColor:
                              repo.language === "TypeScript"
                                ? "#3178C6"
                                : repo.language === "JavaScript"
                                ? "#F1E05A"
                                : repo.language === "Python"
                                ? "#3572A5"
                                : repo.language === "HTML"
                                ? "#E34C26"
                                : repo.language === "CSS"
                                ? "#563D7C"
                                : "#A1A1AA",
                          }}
                        ></span>
                        {repo.language || "Other"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-[10px] flex-shrink-0">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <GitBranch className="h-3 w-3" />
                      {repo.forks_count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-400 text-xs">No repositories found</div>
            )}
          </div>
        </Card>
      </div>

      {/* ── BOTTOM SECTION ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Recent Commits */}
        <Card className="lg:col-span-2 rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-[#F5F5F5]">Recent Commits</h3>
              <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1">Latest code changes and contribution details</p>
            </div>
            <button
              className="text-[11px] font-medium text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
              onClick={() => window.open(`https://github.com/${githubUsername}?tab=repositories`, "_blank")}
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-4">
            {commits.length > 0 ? (
              commits.slice(0, 4).map((commit: GitHubCommit) => (
                <div
                  key={commit.id}
                  className="flex items-start justify-between border-b border-zinc-100 dark:border-[#1E1F23] pb-3.5 last:border-0 last:pb-0 hover:bg-zinc-50/50 dark:hover:bg-[#17181C]/50 p-2 rounded-xl transition-colors cursor-pointer"
                  onClick={() => commit.url && window.open(commit.url, "_blank")}
                >
                  <div className="flex gap-3 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={githubData.user?.avatar_url} />
                      <AvatarFallback className="bg-zinc-100 dark:bg-[#17181C] text-zinc-800 dark:text-[#F5F5F5] text-xs font-semibold">
                        {commit.author?.charAt(0).toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium text-zinc-800 dark:text-[#F5F5F5] truncate leading-snug">
                        {commit.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-450 dark:text-[#71717A]">
                        <span className="font-semibold text-zinc-650 dark:text-[#A1A1AA]">{commit.repository}</span>
                        <span>•</span>
                        <span className="font-mono bg-zinc-50 dark:bg-[#17181C] px-1 py-0.5 rounded border border-zinc-100 dark:border-[#26272B] dark:text-[#A1A1AA]">
                          {commit.branch || "main"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pl-3">
                    <span className="text-[10px] text-zinc-400 dark:text-[#71717A]">
                      {commit.timestamp ? formatDistanceToNow(new Date(commit.timestamp), { addSuffix: true }) : ""}
                    </span>
                    <div className="flex gap-2 text-[10px] font-semibold">
                      {commit.additions > 0 && <span className="text-emerald-600 dark:text-emerald-500">+{commit.additions}</span>}
                      {commit.deletions > 0 && <span className="text-red-500">-{commit.deletions}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-400 dark:text-[#71717A] text-sm">No recent commits found</div>
            )}
          </div>
        </Card>

        {/* Right Card: Recent Activity */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#1E1F23] bg-white dark:bg-[#111214] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-[#F5F5F5]">Recent Activity</h3>
            <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1">Timeline of your latest GitHub events</p>
          </div>
          <div className="flex-1 relative pl-5 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-100 dark:before:bg-[#1E1F23]">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 5).map((activity, idx) => (
                <div key={activity.id} className="relative group">
                  {/* Timeline dot */}
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-[#17181C] border-2 border-white dark:border-[#111214] group-hover:bg-black dark:group-hover:bg-white transition-colors duration-200"></span>
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-[#F5F5F5]">{activity.title}</span>
                      <span className="text-[9px] text-zinc-400 dark:text-[#71717A] flex-shrink-0">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-[#A1A1AA] leading-snug line-clamp-2">{activity.description}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-[#71717A] font-medium">{activity.meta}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-400 dark:text-[#71717A] text-xs pl-0 before:hidden">No recent activity events found</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
