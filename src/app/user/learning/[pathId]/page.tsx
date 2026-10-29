"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  CheckCircle,
  Award,
  ChevronRight,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLearningPath } from "@/lib/store";

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

export default function LearningPathPage() {
  const params = useParams();
  const pathId = params.pathId as string;
  const path = useLearningPath(pathId);

  if (!path) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Learning path not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The learning path you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const totalSections = path.chapters.reduce(
    (acc, chapter) => acc + chapter.sections.length,
    0
  );
  const completedSections = path.chapters.reduce(
    (acc, chapter) =>
      acc + chapter.sections.filter((section) => section.completed).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/user/learning" className="hover:text-slate-700">
            Learning Paths
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>{path.title}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {path.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
              {path.description}
            </p>
          </div>
          {path.progress === 100 && (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-700 border-green-200"
            >
              <Award className="mr-1 h-3 w-3" />
              Completed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className={getDifficultyColor(path.difficulty)}
          >
            {path.difficulty}
          </Badge>
          <div className="flex items-center text-sm text-slate-500">
            <Clock className="mr-1 h-3 w-3" />
            {path.estimated_hours} hours
          </div>
          <div className="flex items-center text-sm text-slate-500">
            <BookOpen className="mr-1 h-3 w-3" />
            {totalSections} sections
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {path.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Progress Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>Track your learning journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-slate-600">
                {completedSections}/{totalSections} sections completed
              </span>
            </div>
            <Progress value={path.progress} className="h-3" />
            <div className="text-center">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {path.progress}%
              </span>
              <span className="text-sm text-slate-500 ml-1">complete</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Chapters */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Chapters
        </h2>
        <div className="space-y-4">
          {path.chapters.map((chapter, index) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <Collapsible defaultOpen={index === 0}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {chapter.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                          )}
                          <div className="text-left">
                            <CardTitle className="text-lg">
                              {chapter.title}
                            </CardTitle>
                            <CardDescription>
                              {chapter.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {chapter.sections.filter((s) => s.completed).length}
                            /{chapter.sections.length}
                          </Badge>
                          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {chapter.sections.map((section) => (
                          <div
                            key={section.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {section.completed ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                              )}
                              <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                  {section.title}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  {section.estimatedTime} min
                                </div>
                              </div>
                            </div>
                            <Button
                              asChild
                              size="sm"
                              variant={
                                section.completed ? "outline" : "default"
                              }
                            >
                              <Link
                                href={`/user/learning/${pathId}/chapters/${chapter.id}/sections/${section.id}`}
                              >
                                {section.completed ? "Review" : "Start"}
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
