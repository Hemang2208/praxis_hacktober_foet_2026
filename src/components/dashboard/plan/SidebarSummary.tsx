import React from 'react';

type Summary = {
  total_tasks?: number;
  high_priority_tasks?: number;
  estimated_total_duration?: string;
  complexity_breakdown?: { low?: number; medium?: number; high?: number };
};

export default function SidebarSummary({ summary }: { summary: Summary }) {
  return (
    <aside className="space-y-4">
      <div className="rounded-xl p-4 bg-gradient-to-br from-indigo-600 to-purple-500 text-white shadow-md">
        <div className="text-xs opacity-80">Tasks</div>
        <div className="text-2xl font-extrabold">{summary.total_tasks || 0}</div>
        <div className="text-sm mt-1 opacity-90">High Priority: <span className="font-semibold">{summary.high_priority_tasks || 0}</span></div>
      </div>

      <div className="rounded-xl p-3 bg-white/60 backdrop-blur-sm shadow-sm">
        <div className="text-xs text-slate-600">Estimated Total</div>
        <div className="font-semibold text-slate-900">{summary.estimated_total_duration || 'N/A'}</div>
      </div>

      <div className="rounded-xl p-3 bg-white/60 backdrop-blur-sm shadow-sm">
        <div className="text-xs text-slate-600">Complexity</div>
        <div className="mt-2 flex gap-2">
          <div className="text-xs px-2 py-1 rounded bg-green-100">Low: {summary.complexity_breakdown?.low || 0}</div>
          <div className="text-xs px-2 py-1 rounded bg-yellow-100">Medium: {summary.complexity_breakdown?.medium || 0}</div>
          <div className="text-xs px-2 py-1 rounded bg-red-100">High: {summary.complexity_breakdown?.high || 0}</div>
        </div>
      </div>
    </aside>
  );
}
