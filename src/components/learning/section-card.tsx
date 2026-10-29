"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LearningSection } from "@/lib/store";

interface SectionCardProps {
  section: LearningSection;
}

export function SectionCard({ section }: SectionCardProps) {
  const params = useParams();
  const pathId = params.pathId as string;
  const chapterId = params.chapterId as string;

  return (
    <div className="pl-7 space-y-4">
      <div className="flex items-start gap-3">
        {section.completed ? (
          <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 mt-1 flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              {section.title}
            </h4>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-3 w-3" />
              {section.estimatedTime} min
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {section.content.substring(0, 150)}...
          </p>
          <Button
            asChild
            size="sm"
            variant={section.completed ? "outline" : "default"}
          >
            <Link
              href={`/dashboard/learning/${pathId}/chapters/${chapterId}/sections/${section.id}`}
            >
              {section.completed ? "Review Section" : "Start Section"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
