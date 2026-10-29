"use client";
import {
  Activity,
  MessageSquare,
  Edit,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Task } from "@/lib/store";
import { formatDateTime } from "@/lib/formatDate";

interface TaskActivityTabProps {
  task: Task;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "created":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "moved":
      return <ArrowRight className="h-4 w-4 text-sky-600" />;
    case "commented":
      return <MessageSquare className="h-4 w-4 text-violet-600" />;
    case "updated":
      return <Edit className="h-4 w-4 text-yellow-600" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    default:
      return <Activity className="h-4 w-4 text-slate-600" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "created":
      return "bg-emerald-100";
    case "moved":
      return "bg-sky-100";
    case "commented":
      return "bg-violet-100";
    case "updated":
      return "bg-yellow-100";
    case "completed":
      return "bg-emerald-100";
    default:
      return "bg-slate-100";
  }
};

export function TaskActivityTab({ task }: TaskActivityTabProps) {
  const sortedActivity = [...(task.activity ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
        Activity Timeline ({sortedActivity.length})
      </h3>

  {(task.activity?.length ?? 0) === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No activity yet
          </h4>
          <p className="text-slate-600 dark:text-slate-400">
            Activity will appear here as you work on this task.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedActivity.map((activity, index: number) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${getActivityColor(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={
                              activity.author.avatar ||
                              "https://placehold.co/30/svg"
                            }
                            alt={activity.author.name}
                          />
                          <AvatarFallback className="text-xs">
                            {activity.author.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {activity.author.name}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {activity.description}
                    </p>
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-slate-500">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
