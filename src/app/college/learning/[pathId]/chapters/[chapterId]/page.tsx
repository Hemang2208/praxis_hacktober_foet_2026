"use client";

import * as React from "react";
import {
  useParams,
  //  useRouter
} from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useChapter, useLearningStore, useChapterUIStore } from "@/lib/store";
import { SectionCard } from "@/components/learning/section-card";
import { QuizCard } from "@/components/learning/quiz/quiz-card";

export default function ChapterPage() {
  const params = useParams();
  // const router = useRouter();
  const pathId = params.pathId as string;
  const chapterId = params.chapterId as string;

  const chapter = useChapter(pathId, chapterId);
  const { getChapterProgress, getChapterQuiz } = useLearningStore();
  const { openSections, setOpenSections } = useChapterUIStore();
  const chapterProgress = getChapterProgress(chapterId);
  const quiz = getChapterQuiz(chapterId);

  const [showConfetti, setShowConfetti] = React.useState(false);
  const { width, height } = useWindowSize();

  React.useEffect(() => {
    // Show confetti when quiz is completed with high score
    if (!chapterProgress?.quizScore || !quiz) return;
    if (chapterProgress?.quizCompleted && chapterProgress?.quizScore >= 80) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [chapterProgress, quiz]);

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Chapter not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The chapter you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const completedSections = chapter.sections.filter(
    (section) => section.completed
  ).length;
  const totalSections = chapter.sections.length;
  const progress =
    totalSections > 0
      ? Math.round((completedSections / totalSections) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {showConfetti && (
        <Confetti width={width} height={height} recycle={false} />
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/college/learning" className="hover:text-slate-700">
            Learning Paths
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/college/learning/${pathId}`}
            className="hover:text-slate-700"
          >
            Path
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>{chapter.title}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {chapter.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
              {chapter.description}
            </p>
          </div>
          {chapter.completed && (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-700 border-green-200"
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              Completed
            </Badge>
          )}
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
            <CardTitle>Chapter Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Section Completion</span>
              <span className="text-sm text-slate-600">
                {completedSections}/{totalSections} sections completed
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="text-center">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {progress}%
              </span>
              <span className="text-sm text-slate-500 ml-1">complete</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sections with Accordion */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Sections
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <Accordion
                type="multiple"
                className="w-full space-y-2"
                value={openSections}
                onValueChange={setOpenSections}
              >
                {chapter.sections.map((section) => (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 text-left">
                        {section.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        )}
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-slate-100">
                            {section.title}
                          </h4>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <SectionCard section={section} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quiz */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Chapter Quiz
        </h2>
        <QuizCard chapterId={chapterId} />
      </motion.div>
    </div>
  );
}
