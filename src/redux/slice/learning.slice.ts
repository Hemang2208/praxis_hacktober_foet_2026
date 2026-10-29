import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import learningPathsData from "@/components/mock/learning-paths.json";
import quizzesData from "@/components/mock/quizzes.json";

// Learning Section Types
export type LearningSection = {
  id: string;
  title: string;
  content: string;
  completed: boolean;
  estimatedTime: number;
  notes: string;
};

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

export interface ChapterQuiz {
  chapterId: string;
  questions: QuizQuestion[];
  score?: number;
}

export type ChapterProgress = {
  completed: boolean;
  quizScore?: number;
  quizCompleted: boolean;
  lastAttemptDate?: string;
};

export type LearningChapter = {
  id: string;
  title: string;
  description: string;
  sections: LearningSection[];
  completed: boolean;
  quiz?: ChapterQuiz;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_hours: number;
  tags: string[];
  chapters: LearningChapter[];
  progress: number;
  enrolledAt: string;
  completed_at?: string;
};

// Merge quiz data with learning paths
const enhanceLearningPathsWithQuizzes = (
  paths: typeof learningPathsData,
  quizzes: typeof quizzesData,
): LearningPath[] => {
  return paths.map((path) => ({
    ...path,
    chapters: path.chapters.map((chapter) => {
      const quiz = quizzes.find((q) => q.chapterId === chapter.id);
      return {
        ...chapter,
        quiz: quiz || undefined,
      };
    }),
  }));
};

// Transform quiz data to record format
const transformQuizzesData = (
  quizzes: typeof quizzesData,
): Record<string, ChapterQuiz> => {
  const transformed: Record<string, ChapterQuiz> = {};
  quizzes.forEach((quiz) => {
    transformed[quiz.chapterId] = quiz;
  });
  return transformed;
};

export interface LearningState {
  paths: LearningPath[];
  chapterProgress: Record<string, ChapterProgress>;
  quizzes: Record<string, ChapterQuiz>;
  loading: boolean;
  error: string | null;
}

const initialState: LearningState = {
  paths: enhanceLearningPathsWithQuizzes(learningPathsData, quizzesData),
  chapterProgress: {},
  quizzes: transformQuizzesData(quizzesData),
  loading: false,
  error: null,
};

const learningSlice = createSlice({
  name: "learning",
  initialState,
  reducers: {
    updateSectionNotes: (
      state,
      action: PayloadAction<{
        pathId: string;
        chapterId: string;
        sectionId: string;
        notes: string;
      }>,
    ) => {
      const { pathId, chapterId, sectionId, notes } = action.payload;
      const path = state.paths.find((p) => p.id === pathId);
      if (path) {
        const chapter = path.chapters.find((c) => c.id === chapterId);
        if (chapter) {
          const section = chapter.sections.find((s) => s.id === sectionId);
          if (section) {
            section.notes = notes;
          }
        }
      }
    },
    markSectionComplete: (
      state,
      action: PayloadAction<{
        pathId: string;
        chapterId: string;
        sectionId: string;
        completed: boolean;
      }>,
    ) => {
      const { pathId, chapterId, sectionId, completed } = action.payload;
      const path = state.paths.find((p) => p.id === pathId);
      if (path) {
        const chapter = path.chapters.find((c) => c.id === chapterId);
        if (chapter) {
          const section = chapter.sections.find((s) => s.id === sectionId);
          if (section) {
            section.completed = completed;
          }
          // Update chapter completion status
          chapter.completed = chapter.sections.every((s) => s.completed);
        }
        // Update path progress
        const totalSections = path.chapters.reduce(
          (acc, ch) => acc + ch.sections.length,
          0,
        );
        const completedSections = path.chapters.reduce(
          (acc, ch) => acc + ch.sections.filter((s) => s.completed).length,
          0,
        );
        path.progress =
          totalSections > 0
            ? Math.round((completedSections / totalSections) * 100)
            : 0;
        if (path.progress === 100) {
          path.completed_at = new Date().toISOString();
        }
      }
    },
    updateProgress: (state, action: PayloadAction<string>) => {
      const pathId = action.payload;
      const path = state.paths.find((p) => p.id === pathId);
      if (path) {
        const totalSections = path.chapters.reduce(
          (acc, chapter) => acc + chapter.sections.length,
          0,
        );
        const completedSections = path.chapters.reduce(
          (acc, chapter) =>
            acc +
            chapter.sections.filter((section) => section.completed).length,
          0,
        );
        path.progress =
          totalSections > 0
            ? Math.round((completedSections / totalSections) * 100)
            : 0;
        if (path.progress === 100) {
          path.completed_at = new Date().toISOString();
        }
        path.chapters.forEach((chapter) => {
          chapter.completed = chapter.sections.every(
            (section) => section.completed,
          );
        });
      }
    },
    submitQuizScore: (
      state,
      action: PayloadAction<{ chapterId: string; score: number }>,
    ) => {
      const { chapterId, score } = action.payload;
      state.chapterProgress[chapterId] = {
        ...state.chapterProgress[chapterId],
        quizScore: score,
        quizCompleted: true,
        lastAttemptDate: new Date().toISOString(),
        completed: score >= 80,
      };
    },
    addQuizResult: (
      state,
      action: PayloadAction<{ chapterId: string; score: number }>,
    ) => {
      const { chapterId, score } = action.payload;
      if (state.quizzes[chapterId]) {
        state.quizzes[chapterId].score = score;
      }
      state.chapterProgress[chapterId] = {
        ...state.chapterProgress[chapterId],
        quizScore: score,
        quizCompleted: true,
        lastAttemptDate: new Date().toISOString(),
        completed: score >= 80,
      };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  updateSectionNotes,
  markSectionComplete,
  updateProgress,
  submitQuizScore,
  addQuizResult,
  setLoading,
  setError,
} = learningSlice.actions;

export default learningSlice.reducer;
