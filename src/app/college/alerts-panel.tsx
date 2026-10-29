"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mock alert data (replace with react-query/swr fetch)
const alerts = [
  {
    name: "Amit Sharma",
    cohort: "Fall 2025 CS Batch",
    github: "https://github.com/amitsharma",
    reason: "Missed 3 tasks in a row",
    flagged: true,
  },
  {
    name: "Priya Singh",
    cohort: "Spring 2025 AI Batch",
    github: "https://github.com/priyasingh",
    reason: "Avg score dropped below 60",
    flagged: true,
  },
  {
    name: "Rahul Verma",
    cohort: "Fall 2025 CS Batch",
    github: "https://github.com/rahulverma",
    reason: "Missed 2 deadlines",
    flagged: true,
  },
];

export default function AlertsPanel() {
  // Replace with react-query/swr for real data
  // Optionally add WebSocket/SSE for real-time updates

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Flagged Students Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.length === 0 && (
              <div className="text-muted-foreground">No alerts at this time.</div>
            )}
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
                <div className="flex-1">
                  <div className="font-semibold text-lg">{alert.name}</div>
                  <div className="text-sm text-slate-500">Cohort: {alert.cohort}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="destructive">Flagged</Badge>
                    <a href={alert.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                      GitHub
                    </a>
                  </div>
                  <div className="mt-2 text-sm text-red-600 font-medium">{alert.reason}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline">View Profile</Button>
                  <Button size="sm" variant="default">Send Reminder</Button>
                  <Button size="sm" variant="secondary">Assign Mentor</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
