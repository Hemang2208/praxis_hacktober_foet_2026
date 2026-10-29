"use client";

import React from "react";

interface Day {
  contributionCount: number;
  date: string;
}

interface Week {
  contributionDays: Day[];
}

interface CalendarData {
  totalContributions: number;
  weeks: Week[];
}

interface ContributionCalendarProps {
  username: string;
}

const COLORS_LIGHT = ["#f4f4f5", "#d1fae5", "#6ee7b7", "#10b981", "#047857"];
const COLORS_DARK = ["#17181c", "#064e3b", "#047857", "#10b981", "#34d399"];

function getColorIndex(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function ContributionCalendar({ username }: ContributionCalendarProps) {
  const [data, setData] = React.useState<CalendarData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/github/contributions?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json && json.weeks) setData(json as CalendarData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center gap-[3px]">
        {Array.from({ length: 53 }).map((_, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, di) => (
              <div
                key={di}
                className="h-[10px] w-[10px] rounded-sm bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data || !data.weeks || data.weeks.length === 0) {
    return (
      <div className="text-xs text-zinc-400 text-center py-4">
        No contribution data available
      </div>
    );
  }

  const totalWeeks = data.weeks.length;
  const padLeft = totalWeeks < 53 ? 53 - totalWeeks : 0;
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

  return (
    <div className="overflow-x-auto hide-scrollbar w-full">
      <div className="flex gap-[3px]">
        {Array.from({ length: padLeft }).map((_, i) => (
          <div key={`pad-${i}`} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, d) => (
              <div key={d} className="h-[10px] w-[10px] rounded-sm" />
            ))}
          </div>
        ))}
        {data.weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.contributionDays.map((day, di) => (
              <div
                key={di}
                className="h-[10px] w-[10px] rounded-sm"
                style={{ backgroundColor: colors[getColorIndex(day.contributionCount)] }}
                title={`${day.date}: ${day.contributionCount} contribution${day.contributionCount !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
