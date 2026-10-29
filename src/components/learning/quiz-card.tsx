"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, ArrowRight, RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { type ChapterQuiz, useLearningStore } from "@/lib/store";

interface QuizCardProps {
  quiz: ChapterQuiz;
  chapterId: string;
  previousScore?: number;
  completed: boolean;
}

export function QuizCard({
  quiz,
  chapterId,
  previousScore,
  completed,
}: QuizCardProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [score, setScore] = React.useState<number | null>(null);
  const { submitQuizScore } = useLearningStore();

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const hasSelectedAnswer = selectedAnswers[currentQuestionIndex] !== undefined;

  const handleAnswerSelect = (answerIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newSelectedAnswers);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Calculate score and submit
      const correctAnswers = selectedAnswers.reduce((count, answer, index) => {
        return answer === quiz.questions[index].correct ? count + 1 : count;
      }, 0);
      const calculatedScore = Math.round(
        (correctAnswers / quiz.questions.length) * 100
      );
      setScore(calculatedScore);
      setIsSubmitted(true);
      submitQuizScore(chapterId, calculatedScore);
    } else {
      // Go to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setIsSubmitted(false);
    setScore(null);
  };

  // If already completed, show the score card
  if (completed && !isSubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chapter Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Score</span>
            <span className="text-sm font-medium">{previousScore}%</span>
          </div>
          <Progress value={previousScore} className="h-3" />
          <div className="text-center mt-4">
            {previousScore && previousScore >= 80 ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-lg font-medium text-green-600">
                  Quiz Passed!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <XCircle className="h-12 w-12 text-amber-500" />
                <p className="text-lg font-medium text-amber-600">Try Again</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRestart} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retake Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If submitted, show the results
  if (isSubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {score}%
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              You got{" "}
              {
                selectedAnswers.filter(
                  (answer, index) => answer === quiz.questions[index].correct
                ).length
              }{" "}
              out of {quiz.questions.length} questions correct
            </p>
          </div>

          <Progress value={score || 0} className="h-3" />

          <div className="text-center mt-4">
            {score && score >= 80 ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-lg font-medium text-green-600">
                  Congratulations! You passed!
                </p>
                <p className="text-sm text-slate-500">
                  You need 80% or higher to pass
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <XCircle className="h-12 w-12 text-amber-500" />
                <p className="text-lg font-medium text-amber-600">
                  Keep studying and try again!
                </p>
                <p className="text-sm text-slate-500">
                  You need 80% or higher to pass
                </p>
              </div>
            )}
          </div>

          {/* Show detailed results */}
          <div className="space-y-3 mt-6">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              Question Review
            </h4>
            {quiz.questions.map((question, index) => {
              const userAnswer = selectedAnswers[index];
              const isCorrect = userAnswer === question.correct;

              return (
                <div key={question.id} className="p-3 rounded-lg border">
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{question.question}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Your answer: {question.options[userAnswer]}
                        {!isCorrect && (
                          <span className="text-green-600 ml-2">
                            (Correct: {question.options[question.correct]})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRestart} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retake Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show the quiz questions
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chapter Quiz</CardTitle>
          <span className="text-sm text-slate-500">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>
        </div>
        <Progress
          value={((currentQuestionIndex + 1) / quiz.questions.length) * 100}
          className="h-2"
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {currentQuestion.question}
          </h3>

          <RadioGroup
            value={selectedAnswers[currentQuestionIndex]?.toString()}
            onValueChange={(value) =>
              handleAnswerSelect(Number.parseInt(value))
            }
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={index.toString()}
                  id={`option-${index}`}
                />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </motion.div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleNext}
          disabled={!hasSelectedAnswer}
          className="w-full"
        >
          {isLastQuestion ? "Submit Quiz" : "Next Question"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
