"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, RotateCcw, Trophy } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLearningStore, QuizQuestion } from "@/lib/store";

interface QuizCardProps {
  chapterId: string;
}

export function QuizCard({ chapterId }: QuizCardProps) {
  const { getChapterQuiz, addQuizResult } = useLearningStore();
  const quiz = getChapterQuiz(chapterId);

  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<
    Record<number, number>
  >({});
  const [showResults, setShowResults] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);

  const { width, height } = useWindowSize();

  const isCompleted = quiz?.score !== undefined;
  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const totalQuestions = quiz?.questions.length || 0;
  const progress =
    totalQuestions > 0
      ? ((currentQuestionIndex + 1) / totalQuestions) * 100
      : 0;

  React.useEffect(() => {
    if (isCompleted && quiz) {
      setShowResults(true);
      if (quiz.score && quiz.score >= 80) {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isCompleted, quiz?.score, quiz]);

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!quiz) return;
    let correctAnswers = 0;
    quiz.questions.forEach((question: QuizQuestion, index: number) => {
      if (selectedAnswers[index] === question.correct) {
        correctAnswers++;
      }
    });
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    addQuizResult(chapterId, score);
    setShowResults(true);
    if (score >= 80) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setShowConfetti(false);
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Excellent work! You've mastered this chapter.";
    if (score >= 80) return "Great job! You've passed this chapter.";
    if (score >= 70) return "Good effort! Consider reviewing the material.";
    return "Keep studying! Review the chapter and try again.";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (!quiz) {
    return (
      <Card data-testid="quiz-card">
        <CardContent className="p-6 text-center">
          <p className="text-slate-500">No quiz available for this chapter.</p>
        </CardContent>
      </Card>
    );
  }

  if (showResults && isCompleted) {
    return (
      <Card data-testid="quiz-card" className="relative overflow-hidden">
        {showConfetti && (
          <Confetti width={width} height={height} recycle={false} />
        )}
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {quiz.score && quiz.score >= 80 ? (
              <Trophy className="h-6 w-6 text-yellow-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div
              className={`text-4xl font-bold ${getScoreColor(quiz.score ?? 0)}`}
            >
              {quiz.score}%
            </div>
            <p className="text-slate-600 mt-2">
              {
                quiz.questions.filter(
                  (_: QuizQuestion, index: number) =>
                    selectedAnswers[index] === quiz.questions[index].correct
                ).length
              }{" "}
              out of {totalQuestions} correct
            </p>
          </div>
          <Alert>
            <AlertDescription className="text-center">
              {getScoreMessage(quiz.score ?? 0)}
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <h4 className="font-semibold">Review Answers:</h4>
            {quiz.questions.map((question: QuizQuestion, index: number) => {
              const userAnswer = selectedAnswers[index];
              const isCorrect = userAnswer === question.correct;
              return (
                <div key={question.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <p className="font-medium">{question.question}</p>
                  </div>
                  <div className="ml-7 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Your answer:</span>{" "}
                      <span
                        className={
                          isCorrect ? "text-green-600" : "text-red-600"
                        }
                      >
                        {question.options[userAnswer]}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="text-sm">
                        <span className="font-medium">Correct answer:</span>{" "}
                        <span className="text-green-600">
                          {question.options[question.correct]}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center">
            <Button onClick={handleRetake} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="quiz-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chapter Quiz</CardTitle>
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">
              {currentQuestion?.question}
            </h3>
            <RadioGroup
              value={selectedAnswers[currentQuestionIndex]?.toString()}
              onValueChange={(value) =>
                handleAnswerSelect(currentQuestionIndex, Number.parseInt(value))
              }
            >
              {currentQuestion?.options.map((option: string, index: number) => (
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
        </AnimatePresence>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() =>
              setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
            }
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestionIndex] === undefined}
          >
            {currentQuestionIndex === totalQuestions - 1 ? "Submit" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
