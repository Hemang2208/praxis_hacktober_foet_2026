"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Award,
  Users,
  Calendar,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";

const performanceMetrics = [
  {
    title: "Task Completion Rate",
    value: "84%",
    change: "+12%",
    trend: "up",
    description: "vs last month",
  },
  {
    title: "Average Response Time",
    value: "2.3h",
    change: "-0.5h",
    trend: "up",
    description: "to feedback",
  },
  {
    title: "Code Quality Score",
    value: "92",
    change: "+8",
    trend: "up",
    description: "AI assessment",
  },
  {
    title: "Learning Velocity",
    value: "7.2",
    change: "+1.1",
    trend: "up",
    description: "skills per week",
  },
];

const skillsData = [
  { skill: "React", current: 85, target: 90, growth: "+15%" },
  { skill: "TypeScript", current: 78, target: 85, growth: "+22%" },
  { skill: "Node.js", current: 72, target: 80, growth: "+18%" },
  { skill: "Git", current: 88, target: 95, growth: "+12%" },
  { skill: "Problem Solving", current: 82, target: 90, growth: "+20%" },
  { skill: "Testing", current: 65, target: 75, growth: "+25%" },
];

const weeklyActivity = [
  { day: "Mon", tasks: 8, commits: 5, hours: 6.5 },
  { day: "Tue", tasks: 12, commits: 8, hours: 7.2 },
  { day: "Wed", tasks: 6, commits: 3, hours: 5.8 },
  { day: "Thu", tasks: 15, commits: 12, hours: 8.1 },
  { day: "Fri", tasks: 10, commits: 7, hours: 6.9 },
  { day: "Sat", tasks: 4, commits: 2, hours: 3.2 },
  { day: "Sun", tasks: 2, commits: 1, hours: 2.1 },
];

const achievements = [
  {
    title: "Code Quality Master",
    description: "Maintained 90+ quality score for 30 days",
    date: "Jan 15, 2024",
    type: "quality",
    points: 500,
  },
  {
    title: "Sprint Champion",
    description: "Completed all tasks in 3 consecutive sprints",
    date: "Jan 10, 2024",
    type: "productivity",
    points: 300,
  },
  {
    title: "Collaboration Expert",
    description: "Helped 5+ team members with code reviews",
    date: "Jan 8, 2024",
    type: "teamwork",
    points: 250,
  },
  {
    title: "Learning Streak",
    description: "Completed daily learning goals for 14 days",
    date: "Jan 5, 2024",
    type: "learning",
    points: 200,
  },
];

const getMaxValue = (
  data: typeof weeklyActivity,
  key: keyof (typeof weeklyActivity)[0]
) => {
  return Math.max(
    ...data.map((item) => (typeof item[key] === "number" ? item[key] : 0))
  );
};

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Performance Analytics
          </h1>
          <p className="text-slate-600 mt-1">
            Track your progress and skill development over time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 days
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {metric.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-slate-900">
                    {metric.value}
                  </div>
                  <div
                    className={`flex items-center text-sm ${
                      metric.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="mr-1 h-4 w-4" />
                    ) : (
                      <TrendingDown className="mr-1 h-4 w-4" />
                    )}
                    {metric.change}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Skills Progress */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5 text-indigo-600" />
                Skills Development
              </CardTitle>
              <CardDescription>
                Your progress towards skill mastery goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {skillsData.map((skill, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">
                      {skill.skill}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        {skill.growth}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        {skill.current}%
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={skill.current} className="h-2" />
                    <div
                      className="absolute top-0 h-2 w-1 bg-slate-400 rounded-full"
                      style={{ left: `${skill.target}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Current: {skill.current}%</span>
                    <span>Target: {skill.target}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-600" />
                Weekly Activity
              </CardTitle>
              <CardDescription>
                Your daily productivity metrics this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyActivity.map((day, index: number) => {
                  const maxTasks = getMaxValue(weeklyActivity, "tasks");
                  const maxCommits = getMaxValue(weeklyActivity, "commits");
                  const maxHours = getMaxValue(weeklyActivity, "hours");

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900 w-12">
                          {day.day}
                        </span>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <span>{day.tasks} tasks</span>
                          <span>{day.commits} commits</span>
                          <span>{day.hours}h</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">Tasks</div>
                          <Progress
                            value={(day.tasks / maxTasks) * 100}
                            className="h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">Commits</div>
                          <Progress
                            value={(day.commits / maxCommits) * 100}
                            className="h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">Hours</div>
                          <Progress
                            value={(day.hours / maxHours) * 100}
                            className="h-1"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5 text-yellow-600" />
              Recent Achievements
            </CardTitle>
            <CardDescription>
              Your latest milestones and accomplishments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">
                        {achievement.title}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {achievement.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`ml-2 ${
                        achievement.type === "quality"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : achievement.type === "productivity"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : achievement.type === "teamwork"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      +{achievement.points}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {achievement.date}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {achievement.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Learning Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              Personalized Learning Path
            </CardTitle>
            <CardDescription>
              AI-recommended next steps based on your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "Advanced React Patterns",
                  description:
                    "Learn render props, HOCs, and compound components",
                  difficulty: "Intermediate",
                  estimatedTime: "2 weeks",
                  priority: "high",
                },
                {
                  title: "Testing Best Practices",
                  description:
                    "Master unit testing with Jest and React Testing Library",
                  difficulty: "Beginner",
                  estimatedTime: "1 week",
                  priority: "medium",
                },
                {
                  title: "GraphQL Fundamentals",
                  description: "Build APIs with GraphQL and Apollo",
                  difficulty: "Intermediate",
                  estimatedTime: "3 weeks",
                  priority: "low",
                },
              ].map((course, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-slate-900">
                      {course.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={
                        course.priority === "high"
                          ? "border-red-200 text-red-700 bg-red-50"
                          : course.priority === "medium"
                          ? "border-yellow-200 text-yellow-700 bg-yellow-50"
                          : "border-green-200 text-green-700 bg-green-50"
                      }
                    >
                      {course.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span>{course.difficulty}</span>
                    <span>{course.estimatedTime}</span>
                  </div>
                  <Button size="sm" className="w-full">
                    Start Learning
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
