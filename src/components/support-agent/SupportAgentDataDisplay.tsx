"use client";
 
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface RecommendationData {
  recommendations: Array<{
    title: string;
    description: string;
    category: string;
    priority: string;
    reasoning: string;
  }>;
  timestamp: string;
}

interface ProgressData {
  overall_progress: number;
  tasks_summary: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
  projects_summary: {
    total: number;
    completed: number;
    active: number;
  };
  skills_progress: Record<string, number>;
  recent_achievements: Array<{
    title: string;
    description: string;
    date: string;
    category: string;
  }>;
  areas_for_improvement: string[];
  timestamp: string;
}

interface NextActionData {
  recommendation: string;
  actionType: string;
  priority: string;
  reasoning: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

interface ProfileData {
  profile: {
    basic_info: Record<string, unknown>;
    skills: string[];
    experience: Record<string, unknown>;
    preferences: Record<string, unknown>;
  };
  activity_summary: {
    total_tasks: number;
    completed_tasks: number;
    total_projects: number;
    active_projects: number;
    github_contributions: number;
    last_login: string;
  };
  performance_metrics: {
    productivity_score: number;
    completion_rate: number;
    average_task_time: number;
    streak_days: number;
  };
  tasks?: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  }>;
  code_quality_trend?: Array<{
    date: string;
    quality: number;
    task_id: string;
  }>;
  recent_feedback?: Array<{
    _id: string;
    assessment: {
      overall: number;
      codeQuality: number;
    };
    analysisDate: string;
    totalIssues: number;
  }>;
  pull_requests?: Array<{
    pull_request: {
      title: string;
      status: string;
      url: string;
    };
    submitted_at: string;
  }>;
  timestamp: string;
}

interface SupportAgentDataDisplayProps {
  type: "recommendations" | "progress" | "action" | "profile";
  data: RecommendationData | ProgressData | NextActionData | ProfileData;
}

export function SupportAgentDataDisplay({
  type,
  data,
}: SupportAgentDataDisplayProps) {
  const getPriorityColor = (priority: string | undefined | null) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getPriorityEmoji = (priority: string | undefined | null) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "🔥";
      case "medium":
        return "✨";
      case "low":
        return "🟢";
      default:
        return "🔔";
    }
  };

  const etaForPriority = (priority: string | undefined | null) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "Today ⏰";
      case "medium":
        return "This week 📅";
      case "low":
        return "When ready 🗓️";
      default:
        return "Soon ⏳";
    }
  };

  if (type === "recommendations") {
    const recData = data as RecommendationData;
    return (
      <div className="space-y-4 text-sm">
        {recData?.recommendations && recData.recommendations.length > 0 ? (
          recData.recommendations.map((rec, index: number) => (
            <div
              key={index}
              className="rounded-lg bg-muted/5 p-4"
              role="article"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-base">
                  <span className="mr-2">{getPriorityEmoji(rec?.priority)}</span>
                  {rec?.title ?? "No title"}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityColor(rec?.priority)} className="text-xs">
                    {rec?.priority ?? "Low"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {rec?.category ?? "General"}
                  </Badge>
                </div>
              </div>

              <p className="mt-3 text-muted-foreground leading-relaxed">
                {rec?.description ?? "No description available"}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/10">💡 Tip</span>
                <span className="text-xs text-muted-foreground">Try focusing on the highest-impact item first for faster gains.</span>
              </div>

              <div className="mt-3">
                <p className="font-medium">🔎 Why this matters</p>
                <p className="text-muted-foreground leading-relaxed">
                  {rec?.reasoning ?? "No reasoning provided"}
                </p>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  To get the best results from this recommendation, consider the following steps: start small, set measurable goals, and review progress weekly. If you want, I can expand this into a concrete checklist or timeline.
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-muted/5 p-4 text-center text-muted-foreground">No recommendations available</div>
        )}
      </div>
    );
  }

  if (type === "progress") {
    const progData = data as ProgressData;
    const topSkills = progData?.skills_progress
      ? Object.entries(progData.skills_progress)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
      : [];

    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg bg-muted/5 p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">📈 Overall Progress</h3>
            <span className="text-muted-foreground">{progData?.overall_progress ?? 0}%</span>
          </div>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            You're currently at <strong>{progData?.overall_progress ?? 0}%</strong> overall completion. This reflects recent task activity, project updates, and skill improvements. Keep focusing on high-impact tasks to continue this momentum. 🚀
          </p>
        </div>

        <div className="rounded-lg bg-muted/5 p-4">
          <h4 className="font-medium">🗂️ Tasks Summary</h4>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            ✅ Completed: <strong>{progData?.tasks_summary?.completed ?? 0}</strong> / {progData?.tasks_summary?.total ?? 0} • 🔁 In progress: <strong>{progData?.tasks_summary?.in_progress ?? 0}</strong> • ⏳ Pending: <strong>{progData?.tasks_summary?.pending ?? 0}</strong>.
          </p>
          <p className="mt-2 text-muted-foreground">Prioritize tasks that unblock others and split large tasks into smaller, trackable steps. Small daily wins compound—try a 25-minute focused session. ⏱️</p>
        </div>

        <div className="rounded-lg bg-muted/5 p-4">
          <h4 className="font-medium">📁 Projects Summary</h4>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            You have <strong>{progData?.projects_summary?.total ?? 0}</strong> projects — <strong>{progData?.projects_summary?.active ?? 0}</strong> active, <strong>{progData?.projects_summary?.completed ?? 0}</strong> completed. Keep milestones small and measurable to accelerate progress.
          </p>
          {topSkills.length > 0 && (
            <p className="mt-2 text-muted-foreground">Top skill progress: {topSkills.map(([s, v]) => `${s} (${v}%)`).join(', ')}.</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/10">🏆 Recent Win</span>
            <span className="text-xs text-muted-foreground">Celebrate small milestones to keep momentum.</span>
          </div>
        </div>

        {progData?.recent_achievements && progData.recent_achievements.length > 0 && (
          <div className="rounded-lg bg-muted/5 p-4">
            <h4 className="font-medium">Recent Achievements</h4>
            <div className="mt-2 space-y-2 text-muted-foreground">
              {progData.recent_achievements.slice(0, 3).map((ach, i) => (
                <div key={i}>
                  <div className="font-medium">{ach?.title ?? 'N/A'}</div>
                  <div>{ach?.description ?? ''}</div>
                  <div className="text-xs mt-1">
                    <Badge variant="outline" className="text-xs">{ach?.category ?? 'General'}</Badge>
                    <span className="ml-2">🎉</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === "action") {
    const actionData = data as NextActionData;
    return (
      <div className="rounded-lg bg-muted/5 p-4 text-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold">⏭️ Next Action</div>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(actionData?.priority)} className="text-xs">{actionData?.priority ?? "Low"}</Badge>
            <span className="text-xs text-muted-foreground">{etaForPriority(actionData?.priority)}</span>
          </div>
        </div>

        <p className="mt-3 font-medium">{actionData?.recommendation ?? "No recommendation available"}</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{actionData?.actionType ?? 'General'}</Badge>
          <span className="text-xs text-muted-foreground">🔧 {actionData?.context ? 'Context-aware' : 'General guidance'}</span>
        </div>

        <div className="mt-3">
          <p className="font-medium">Why this?</p>
          <p className="text-muted-foreground leading-relaxed">{actionData?.reasoning ?? "No reasoning provided"}</p>
          <p className="mt-2 text-muted-foreground leading-relaxed">Suggested steps: 1) Clarify the desired outcome, 2) Break the action into 2–4 small tasks, 3) Assign due dates and review progress after one week. I can convert this into a checklist if you'd like.</p>
          <div className="mt-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/10">💡 Quick Tip</span> <span className="ml-2 text-xs text-muted-foreground">If blocked, share the blocker and I’ll suggest alternatives.</span></div>
        </div>
      </div>
    );
  }

  if (type === "profile") {
    const profileData = data as ProfileData;
    return (
      <div className="space-y-4 text-sm">
        {/* Activity Summary */}
        <div className="rounded-lg bg-muted/5 p-4">
          <div className="flex items-center gap-2">
            <div className="font-semibold">👤 Activity Summary</div>
            <div className="text-muted-foreground">Last updated: {profileData.timestamp ?? 'N/A'}</div>
          </div>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            You have <strong>{profileData.activity_summary?.total_tasks ?? 0}</strong> tasks in total, with <strong>{profileData.activity_summary?.completed_tasks ?? 0}</strong> completed. Projects: <strong>{profileData.activity_summary?.total_projects ?? 0}</strong>, active <strong>{profileData.activity_summary?.active_projects ?? 0}</strong>. Your GitHub contributions: <strong>{profileData.activity_summary?.github_contributions ?? 0}</strong>.
          </p>
          {profileData.profile?.skills && profileData.profile.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {profileData.profile.skills.map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="rounded-lg bg-muted/5 p-4">
          <div className="font-medium">📊 Performance Metrics</div>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Productivity Score: <strong>{profileData.performance_metrics?.productivity_score ?? 'N/A'}%</strong>. Completion Rate: <strong>{profileData.performance_metrics?.completion_rate?.toFixed(1) ?? 'N/A'}%</strong>. Current streak: <strong>{profileData.performance_metrics?.streak_days ?? 0}</strong> days. Focus on consistent, small wins to raise these numbers week over week.
          </p>
        </div>

        {/* Tasks Overview */}
        {profileData.tasks && profileData.tasks.length > 0 && (
          <div className="rounded-lg bg-muted/5 p-4">
            <div className="font-medium mb-3">📝 Your Tasks</div>
            <div className="space-y-2">
              {profileData.tasks.map((task, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/10">
                  <div className="flex-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {task.status}
                    </Badge>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'} className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Quality Trend */}
        {profileData.code_quality_trend && profileData.code_quality_trend.length > 0 && (
          <div className="rounded-lg bg-muted/5 p-4">
            <div className="font-medium mb-3">📈 Code Quality Trend</div>
            <div className="space-y-2">
              {profileData.code_quality_trend.slice(0, 5).map((trend, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-muted-foreground text-xs">
                    {new Date(trend.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(100, Math.max(0, trend.quality))}
                      className="w-32 h-2"
                    />
                    <span className="font-medium text-xs w-12 text-right">{trend.quality}%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Average: <strong>{(profileData.code_quality_trend.reduce((sum, t) => sum + t.quality, 0) / profileData.code_quality_trend.length).toFixed(1)}%</strong>
            </p>
          </div>
        )}

        {/* Recent Feedback */}
        {profileData.recent_feedback && profileData.recent_feedback.length > 0 && (
          <div className="rounded-lg bg-muted/5 p-4">
            <div className="font-medium mb-3">💬 Recent AI Feedback</div>
            <div className="space-y-2">
              {profileData.recent_feedback.map((feedback, i) => (
                <div key={i} className="p-2 rounded bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {new Date(feedback.analysisDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Score: {feedback.assessment.overall}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {feedback.totalIssues} issue{feedback.totalIssues !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pull Requests */}
        {profileData.pull_requests && profileData.pull_requests.length > 0 && (
          <div className="rounded-lg bg-muted/5 p-4">
            <div className="font-medium mb-3">🔀 Recent Pull Requests</div>
            <div className="space-y-2">
              {profileData.pull_requests.map((pr, i) => (
                <div key={i} className="p-2 rounded bg-muted/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">{pr.pull_request.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(pr.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge 
                      variant={pr.pull_request.status === 'open' ? 'default' : pr.pull_request.status === 'merged' ? 'secondary' : 'outline'} 
                      className="text-xs"
                    >
                      {pr.pull_request.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
