"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Play,
  CheckCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLearningStore } from "@/lib/store";

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-700 border-green-200";
    case "intermediate":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "advanced":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function LearningPathsPage() {
  const { paths } = useLearningStore();

  const inProgressPaths = paths.filter(
    (path) => path.progress > 0 && path.progress < 100,
  );
  const completedPaths = paths.filter((path) => path.progress === 100);
  // const notStartedPaths = paths.filter((path) => path.progress === 0)

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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Learning Paths
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Structured learning journeys to master new skills
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressPaths.length}</div>
              <p className="text-xs text-muted-foreground">
                Active learning paths
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedPaths.length}</div>
              <p className="text-xs text-muted-foreground">Paths completed</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paths.reduce((acc, path) => acc + path.estimated_hours, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Learning content available
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* In Progress Paths */}
      {inProgressPaths.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Continue Learning
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {inProgressPaths.map((path, index) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="group hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-indigo-600 transition-colors">
                          <Link href={`/user/learning/${path.id}`}>
                            {path.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {path.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(path.difficulty)}
                      >
                        {path.difficulty}
                      </Badge>
                      <div className="flex items-center text-sm text-slate-500">
                        <Clock className="mr-1 h-3 w-3" />
                        {path.estimated_hours}h
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium">{path.progress}%</span>
                      </div>
                      <Progress value={path.progress} className="h-2" />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {path.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {path.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{path.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <Button asChild className="w-full">
                      <Link href={`/user/learning/${path.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Continue
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Paths */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          All Learning Paths
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paths.map((path, index) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-indigo-600 transition-colors">
                        <Link href={`/user/learning/${path.id}`}>
                          {path.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {path.description}
                      </CardDescription>
                    </div>
                    {path.progress === 100 && (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={getDifficultyColor(path.difficulty)}
                    >
                      {path.difficulty}
                    </Badge>
                    <div className="flex items-center text-sm text-slate-500">
                      <Clock className="mr-1 h-3 w-3" />
                      {path.estimated_hours}h
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-medium">{path.progress}%</span>
                    </div>
                    <Progress value={path.progress} className="h-2" />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {path.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {path.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{path.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <Button
                    asChild
                    className="w-full"
                    variant={path.progress === 0 ? "default" : "outline"}
                  >
                    <Link href={`/user/learning/${path.id}`}>
                      {path.progress === 0 ? (
                        <>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Start Learning
                        </>
                      ) : path.progress === 100 ? (
                        <>
                          <Award className="mr-2 h-4 w-4" />
                          Review
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Continue
                        </>
                      )}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
