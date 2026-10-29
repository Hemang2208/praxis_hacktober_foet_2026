"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, Clock, CheckCircle2, XCircle, Users, Award } from "lucide-react";

// Mock project & results data
const MOCK_PROJECT = {
  id: "proj-123",
  title: "E‑commerce Product Recommender",
  skills: ["TypeScript", "React", "Node", "SQL", "ML Basics"],
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // one week later
};

const MOCK_RESULT = {
  notified: true,
  selected: true,
  rank: 2,
  total: 18,
  score: 87,
  percentile: 90,
  feedback:
    "Great performance! Your answers demonstrated solid knowledge of React, SQL, and system design trade‑offs. You were among the top 3 applicants.",
};

export default function ProjectSelectionNotification() {
  const [result] = useState(MOCK_RESULT);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6 text-slate-700" />
              Project Selection Results
            </h1>
            <p className="text-sm text-muted-foreground">
              Notifications are sent after the application period closes.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            Ended
          </Badge>
        </div>

        {/* Project card */}
        <Card>
          <CardHeader>
            <CardTitle>{MOCK_PROJECT.title}</CardTitle>
            <CardDescription>
              Skills assessed: {MOCK_PROJECT.skills.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Application period ended on {MOCK_PROJECT.deadline.toLocaleDateString()}
              </p>
              {result.selected ? (
                <Badge className="bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> Selected
                </Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-800">
                  <XCircle className="h-4 w-4" /> Not Selected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Result details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={result.selected ? "sel" : "nosel"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  Your Assessment Performance
                </CardTitle>
                <CardDescription>
                  Based on comparative scoring with all applicants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Final Score</p>
                  <span className="font-medium">{result.score} / 100</span>
                </div>
                <Progress value={result.score} className="h-2" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Rank</p>
                    <p className="font-semibold">
                      #{result.rank} / {result.total}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Percentile</p>
                    <p className="font-semibold">Top {result.percentile}%</p>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                  {result.feedback}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Next steps */}
        <div className="flex justify-end">
          <Button className="w-full sm:w-auto gap-2">
            <Users className="h-4 w-4" /> View Team & Mentor
          </Button>
        </div>
      </div>
    </div>
  );
}
