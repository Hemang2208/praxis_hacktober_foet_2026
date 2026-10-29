"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, CheckCircle, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSection, useLearningStore } from "@/lib/store";
import { NotesPanel } from "@/components/learning/notes-panel";

export default function SectionPage() {
  const params = useParams();
  const router = useRouter();
  const pathId = params.pathId as string;
  const chapterId = params.chapterId as string;
  const sectionId = params.sectionId as string;

  const section = useSection(pathId, chapterId, sectionId);
  const { markSectionComplete } = useLearningStore();
  const [isNotesOpen, setIsNotesOpen] = React.useState(false);

  if (!section) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Section not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The section you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const handleMarkComplete = () => {
    markSectionComplete(pathId, chapterId, sectionId, !section.completed);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <Link
            href={`/college/learning/${pathId}/chapters/${chapterId}`}
            className="hover:text-slate-700"
          >
            Chapter
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>{section.title}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {section.title}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                {section.estimatedTime} min read
              </div>
              {section.completed && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 border-green-200"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sheet open={isNotesOpen} onOpenChange={setIsNotesOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  📝 Notes
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Section Notes</SheetTitle>
                </SheetHeader>
                <NotesPanel sectionId={sectionId} />
              </SheetContent>
            </Sheet>

            <Button
              onClick={handleMarkComplete}
              variant={section.completed ? "outline" : "default"}
              size="sm"
            >
              {section.completed ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completed
                </>
              ) : (
                "Mark Complete"
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-8">
            <article className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {section.content}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center justify-between pt-6"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Chapter
        </Button>

        <Button
          onClick={handleMarkComplete}
          variant={section.completed ? "outline" : "default"}
        >
          {section.completed ? "Mark Incomplete" : "Mark Complete"}
          {!section.completed && <CheckCircle className="ml-2 h-4 w-4" />}
        </Button>
      </motion.div>
    </div>
  );
}
