"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CollegeNotifications() {
  const [announcements, setAnnouncements] = useState([
    {
      title: "Campus Placement Drive Announced",
      message: "We are excited to announce a new placement drive with top IT companies. Register by March 10th!",
      date: "2026-02-08",
    },
    {
      title: "Holiday Notice",
      message: "The college will remain closed on February 15th for a public holiday.",
      date: "2026-02-07",
    },
  ]);
  const [form, setForm] = useState({ title: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setAnnouncements([
        { ...form, date: new Date().toISOString().slice(0, 10) },
        ...announcements,
      ]);
      setForm({ title: "", message: "" });
      setSubmitting(false);
    }, 500);
  };

  return (
    <main className="max-w-3xl mx-auto p-6 min-h-screen bg-white dark:bg-black">
      <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Notifications & Announcements</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Post a New Announcement</CardTitle>
          <CardDescription>Share important updates with all students instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              name="title"
              placeholder="Announcement Title"
              value={form.title}
              onChange={handleChange}
              maxLength={100}
              required
            />
            <Textarea
              name="message"
              placeholder="Write your announcement here..."
              value={form.message}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              required
            />
            <Button type="submit" disabled={submitting || !form.title.trim() || !form.message.trim()}>
              {submitting ? "Posting..." : "Post Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-6">
        {announcements.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-center text-muted-foreground">No announcements yet.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((a, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{a.title}</CardTitle>
                <CardDescription>{a.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-base text-slate-700 dark:text-slate-200 whitespace-pre-line">{a.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
