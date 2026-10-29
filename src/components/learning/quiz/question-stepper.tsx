"use client";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionStepperProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: number[];
}

export function QuestionStepper({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
}: QuestionStepperProps) {
  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      {Array.from({ length: totalQuestions }, (_, index) => {
        const isAnswered = answeredQuestions.includes(index);
        const isCurrent = index === currentQuestion;

        return (
          <motion.div
            key={index}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{
              scale: isCurrent ? 1.2 : 1,
              opacity: 1,
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium",
              isCurrent && "border-primary bg-primary text-primary-foreground",
              isAnswered &&
                !isCurrent &&
                "border-green-500 bg-green-500 text-white",
              !isAnswered &&
                !isCurrent &&
                "border-slate-300 bg-slate-100 text-slate-600"
            )}
          >
            {isAnswered ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <span>{index + 1}</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
