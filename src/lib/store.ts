/**
 * This file provides Redux-based hooks and type exports for backward compatibility.
 * All Zustand dependencies have been removed and replaced with Redux Toolkit.
 *
 * Components importing from "@/lib/store" will now use Redux state management.
 */

"use client";

import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../redux/store";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch } from "@/lib/queueAwareFetch";

// Re-export types from Redux slices
export type {
  Certificate,
  CertificatesState,
} from "../redux/slice/certificates.slice";

export type {
  LearningSection,
  QuizQuestion,
  ChapterQuiz,
  ChapterProgress,
  LearningChapter,
  LearningPath,
  LearningState,
} from "../redux/slice/learning.slice";

export type { Note, NotesState } from "../redux/slice/notes.slice";

export type { ChapterUIState } from "../redux/slice/chapterUI.slice";

export type {
  ProjectAnalytics,
  AnalyticsState,
} from "../redux/slice/analytics.slice";

export type { ThemeMode, ThemeState } from "../redux/slice/theme.slice";

export type {
  LegacyProject as Project,
  LegacyProjectFilters,
  LegacyProjectState,
} from "../redux/slice/legacyProject.slice";

export type {
  TaskColumn,
  SubTask,
  TaskNote,
  TaskActivity,
  pull_request,
  LegacyTask as Task,
  LegacyTaskState,
} from "../redux/slice/legacyTask.slice";

// Import slice actions
import {
  setCertificates,
  addCertificate,
  updateCertificate,
  removeCertificate,
} from "../redux/slice/certificates.slice";
import type { Certificate } from "../redux/slice/certificates.slice";

import {
  updateSectionNotes,
  markSectionComplete,
  updateProgress as updateLearningProgress,
  submitQuizScore,
  addQuizResult,
} from "../redux/slice/learning.slice";

import {
  addNote as addNoteAction,
  updateNote as updateNoteAction,
  deleteNote as deleteNoteAction,
} from "../redux/slice/notes.slice";

import { setOpenSections, toggleSection } from "../redux/slice/chapterUI.slice";

import {
  generateProjectAnalytics,
  generateAndCacheAnalytics,
} from "../redux/slice/analytics.slice";

import {
  setTheme,
  toggleTheme as toggleThemeAction,
} from "../redux/slice/theme.slice";

import {
  addProject as addProjectAction,
  updateProject as updateProjectAction,
  deleteProject as deleteProjectAction,
  setFilters,
} from "../redux/slice/legacyProject.slice";
import type {
  LegacyProject,
  LegacyProjectFilters,
} from "../redux/slice/legacyProject.slice";

import {
  loadTasks,
  moveTaskAsync,
  deleteTaskAsync,
  addTaskAsync,
  updateTask,
  deleteColumn,
  addNote as addTaskNote,
  updateNote as updateTaskNote,
  deleteNoteFromTask,
  addSubTask as addSubTaskAction,
  updateSubTask as updateSubTaskAction,
  deleteSubTask as deleteSubTaskAction,
} from "../redux/slice/legacyTask.slice";
import type {
  LegacyTask,
  TaskColumn,
  SubTask,
} from "../redux/slice/legacyTask.slice";

// Import mock data for types
import userData from "../components/mock/user.json";

export type User = typeof userData;

// Legacy type aliases for backward compatibility
export type ProjectTasks = {
  columns: TaskColumn[];
  tasks: LegacyTask[];
};

// User Profile Types (for backward compatibility)
export type UserProfile = {
  full_name: string;
  headline: string;
  bio: string;
  skills: string[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  avatar: string;
  resume?: string;
};

const defaultProfile: UserProfile = {
  full_name: "Ayush Kumar",
  headline: "Software Engineering Intern",
  bio: "Computer Science student passionate about web development and AI. Currently learning full-stack development and exploring machine learning applications.",
  skills: ["JavaScript", "React", "Node.js", "Python", "TypeScript", "Next.js"],
  socialLinks: {
    github: "https://github.com/ayushkumar",
    linkedin: "https://linkedin.com/in/ayushkumar",
    twitter: "https://twitter.com/ayushkumar",
  },
  avatar: "https://placehold.co/128x128/svg",
};

// Typed hooks
const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);

// =====================================
// REDUX-BASED HOOKS (Zustand Replacements)
// =====================================

/**
 * useCertificatesStore - Redux-based hook replacing Zustand certificates store
 */
export const useCertificatesStore = () => {
  const dispatch = useAppDispatch();
  const certificates = useAppSelector(
    (state: RootState) => state.certificates.certificates,
  );
  const loading = useAppSelector(
    (state: RootState) => state.certificates.loading,
  );
  const error = useAppSelector((state: RootState) => state.certificates.error);

  const getCertificate = React.useCallback(
    (certId: string) =>
      certificates.find((cert: Certificate) => cert.id === certId),
    [certificates],
  );

  const getEarnedCertificates = React.useCallback(
    () => certificates.filter((cert: Certificate) => cert.status === "earned"),
    [certificates],
  );

  const getInProgressCertificates = React.useCallback(
    () =>
      certificates.filter((cert: Certificate) => cert.status === "in-progress"),
    [certificates],
  );

  // Generate credential ID from course name
  const generateCredentialId = (courseTitle: string): string => {
    const words = courseTitle.split(/\s+/).filter((w) => w.length > 0);
    const abbrev = words
      .slice(0, 4)
      .map((word) => {
        const upperChars = word.match(/[A-Z]/g) || [];
        if (upperChars.length >= 2) {
          return upperChars.slice(0, 3).join("");
        }
        return word.substring(0, 3).toUpperCase();
      })
      .join("-");

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000;

    return `${abbrev}-${year}-${randomSuffix}`;
  };

  const generatePdf = React.useCallback(
    async (certId: string, userName: string = "User"): Promise<Blob> => {
      const cert = getCertificate(certId);
      if (!cert) throw new Error("Certificate not found");

      const generatedCredentialId = generateCredentialId(cert.title);
      const currentDate = new Date().toLocaleDateString();

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Background color
      pdf.setFillColor(250, 248, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Border
      pdf.setDrawColor(99, 102, 241);
      pdf.setLineWidth(3);
      pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);

      // Title
      pdf.setFontSize(32);
      pdf.setTextColor(99, 102, 241);
      pdf.setFont("helvetica", "bold");
      pdf.text("CERTIFICATE OF COMPLETION", pageWidth / 2, 50, {
        align: "center",
      });

      // Award icon
      pdf.setFontSize(20);
      pdf.text("★", pageWidth / 2, 65, { align: "center" });

      // Main text
      pdf.setFontSize(14);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont("helvetica", "normal");
      pdf.text("This certifies that", pageWidth / 2, 80, { align: "center" });

      // Recipient name
      pdf.setFontSize(28);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.text(userName, pageWidth / 2, 100, { align: "center" });

      // Completion text
      pdf.setFontSize(14);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont("helvetica", "normal");
      pdf.text("has successfully completed", pageWidth / 2, 115, {
        align: "center",
      });

      // Course title
      pdf.setFontSize(20);
      pdf.setTextColor(99, 102, 241);
      pdf.setFont("helvetica", "bold");
      const splitTitle = pdf.splitTextToSize(cert.title, 150);
      pdf.text(splitTitle, pageWidth / 2, 130, { align: "center" });

      // Description
      pdf.setFontSize(12);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont("helvetica", "normal");
      const splitDesc = pdf.splitTextToSize(cert.description, 150);
      pdf.text(splitDesc, pageWidth / 2, 145, { align: "center" });

      // Bottom section
      const bottomY = pageHeight - 40;

      pdf.setFontSize(10);
      pdf.text("Issued by", 50, bottomY);
      pdf.setFont("helvetica", "bold");
      pdf.text(cert.issuer, 50, bottomY + 8);

      pdf.setFont("helvetica", "normal");
      pdf.text("Date Issued", pageWidth / 2 - 30, bottomY);
      pdf.setFont("helvetica", "bold");
      pdf.text(currentDate, pageWidth / 2 - 30, bottomY + 8);

      pdf.setFont("helvetica", "normal");
      pdf.text("Credential ID", pageWidth - 50, bottomY);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(generatedCredentialId, pageWidth - 50, bottomY + 8);

      return pdf.output("blob");
    },
    [getCertificate],
  );

  const verifyCertificate = React.useCallback(
    (credentialId: string) =>
      certificates.find(
        (cert: Certificate) => cert.credentialId === credentialId,
      ) || null,
    [certificates],
  );

  return {
    certificates,
    loading,
    error,
    getCertificate,
    getEarnedCertificates,
    getInProgressCertificates,
    generatePdf,
    verifyCertificate,
    // Actions
    setCertificates: (certs: Certificate[]) => dispatch(setCertificates(certs)),
    addCertificate: (cert: Certificate) => dispatch(addCertificate(cert)),
    updateCertificate: (id: string, updates: Partial<Certificate>) =>
      dispatch(updateCertificate({ id, updates })),
    removeCertificate: (id: string) => dispatch(removeCertificate(id)),
  };
};

/**
 * useLearningStore - Redux-based hook replacing Zustand learning store
 */
export const useLearningStore = () => {
  const dispatch = useAppDispatch();
  const paths = useAppSelector((state: RootState) => state.learning.paths);
  const chapterProgress = useAppSelector(
    (state: RootState) => state.learning.chapterProgress,
  );
  const quizzes = useAppSelector((state: RootState) => state.learning.quizzes);

  const getLearningPath = React.useCallback(
    (pathId: string) => paths.find((path) => path.id === pathId),
    [paths],
  );

  const getChapter = React.useCallback(
    (pathId: string, chapterId: string) => {
      const path = paths.find((p) => p.id === pathId);
      return path?.chapters.find((chapter) => chapter.id === chapterId);
    },
    [paths],
  );

  const getSection = React.useCallback(
    (pathId: string, chapterId: string, sectionId: string) => {
      const chapter = getChapter(pathId, chapterId);
      return chapter?.sections.find((section) => section.id === sectionId);
    },
    [getChapter],
  );

  const getChapterQuiz = React.useCallback(
    (chapterId: string) => quizzes[chapterId],
    [quizzes],
  );

  const getChapterProgress = React.useCallback(
    (chapterId: string) =>
      chapterProgress[chapterId] || { completed: false, quizCompleted: false },
    [chapterProgress],
  );

  return {
    paths,
    chapterProgress,
    quizzes,
    getLearningPath,
    getChapter,
    getSection,
    getChapterQuiz,
    getChapterProgress,
    // Actions
    updateSectionNotes: (
      pathId: string,
      chapterId: string,
      sectionId: string,
      notes: string,
    ) => dispatch(updateSectionNotes({ pathId, chapterId, sectionId, notes })),
    markSectionComplete: (
      pathId: string,
      chapterId: string,
      sectionId: string,
      completed: boolean,
    ) =>
      dispatch(
        markSectionComplete({ pathId, chapterId, sectionId, completed }),
      ),
    updateProgress: (pathId: string) =>
      dispatch(updateLearningProgress(pathId)),
    submitQuizScore: (chapterId: string, score: number) =>
      dispatch(submitQuizScore({ chapterId, score })),
    addQuizResult: (chapterId: string, score: number) =>
      dispatch(addQuizResult({ chapterId, score })),
  };
};

/**
 * useNotesStore - Redux-based hook replacing Zustand notes store
 */
export const useNotesStore = () => {
  const dispatch = useAppDispatch();
  const notes = useAppSelector((state: RootState) => state.notes.notes);

  const getNotesBySectionId = React.useCallback(
    (sectionId: string) => notes.filter((note) => note.sectionId === sectionId),
    [notes],
  );

  return {
    notes,
    getNotesBySectionId,
    addNote: (sectionId: string, body: string) =>
      dispatch(addNoteAction({ sectionId, body })),
    updateNote: (noteId: string, body: string) =>
      dispatch(updateNoteAction({ noteId, body })),
    deleteNote: (noteId: string) => dispatch(deleteNoteAction(noteId)),
  };
};

/**
 * useChapterUIStore - Redux-based hook replacing Zustand chapter UI store
 */
export const useChapterUIStore = () => {
  const dispatch = useAppDispatch();
  const openSections = useAppSelector(
    (state: RootState) => state.chapterUI.openSections,
  );

  return {
    openSections,
    setOpenSections: (sections: string[]) =>
      dispatch(setOpenSections(sections)),
    toggleSection: (sectionId: string) => dispatch(toggleSection(sectionId)),
  };
};

/**
 * useAnalyticsStore - Redux-based hook replacing Zustand analytics store
 */
export const useAnalyticsStore = () => {
  const dispatch = useAppDispatch();
  const analyticsCache = useAppSelector(
    (state: RootState) => state.analytics.analyticsCache,
  );

  const getProjectAnalytics = React.useCallback(
    (project_id: string) => {
      if (analyticsCache[project_id]) {
        return analyticsCache[project_id];
      }
      // Generate and return analytics (will also be cached via dispatch)
      dispatch(generateAndCacheAnalytics(project_id));
      return generateProjectAnalytics(project_id);
    },
    [analyticsCache, dispatch],
  );

  return {
    getProjectAnalytics,
  };
};

/**
 * useThemeStore - Redux-based hook replacing Zustand theme store
 */
export const useThemeStore = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state: RootState) => state.theme.theme);

  const memoizedSetTheme = React.useCallback(
    (newTheme: "light" | "dark" | "system") => dispatch(setTheme(newTheme)),
    [dispatch]
  );

  const memoizedToggleTheme = React.useCallback(
    () => dispatch(toggleThemeAction()),
    [dispatch]
  );

  return {
    theme,
    setTheme: memoizedSetTheme,
    toggleTheme: memoizedToggleTheme,
  };
};

/**
 * useProjectStore - Redux-based hook replacing Zustand project store
 */
export const useProjectStore = () => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector(
    (state: RootState) => state.legacyProject.projects,
  );
  const filters = useAppSelector(
    (state: RootState) => state.legacyProject.filters,
  );

  const getProject = React.useCallback(
    (id: string) => projects.find((project) => project.id === id),
    [projects],
  );

  const getFilteredProjects = React.useCallback(() => {
    return projects.filter((project) => {
      const matchesStatus =
        filters.status.length === 0 || filters.status.includes(project.status);
      const matchesTags =
        filters.tags.length === 0 ||
        filters.tags.some((tag) => project.tags.includes(tag));
      const matchesSearch =
        filters.search === "" ||
        project.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        project.description
          .toLowerCase()
          .includes(filters.search.toLowerCase());
      return matchesStatus && matchesTags && matchesSearch;
    });
  }, [projects, filters]);

  return {
    projects,
    filters,
    getProject,
    getFilteredProjects,
    addProject: (
      project: Omit<LegacyProject, "id" | "created_at" | "updated_at">,
    ) => dispatch(addProjectAction(project)),
    updateProject: (id: string, updates: Partial<LegacyProject>) =>
      dispatch(updateProjectAction({ id, updates })),
    deleteProject: (id: string) => dispatch(deleteProjectAction(id)),
    setFilters: (newFilters: Partial<LegacyProjectFilters>) =>
      dispatch(setFilters(newFilters)),
  };
};

/**
 * useTaskStore - Redux-based hook replacing Zustand task store
 */
export const useTaskStore = () => {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state: RootState) => state.legacyTask.tasks);
  const columns = useAppSelector(
    (state: RootState) => state.legacyTask.columns,
  );
  const loading = useAppSelector(
    (state: RootState) => state.legacyTask.loading,
  );
  const error = useAppSelector((state: RootState) => state.legacyTask.error);

  const getTask = React.useCallback(
    (id: string) => tasks.find((task) => task.id === id || task._id === id),
    [tasks],
  );

  const findContainer = React.useCallback(
    (id: string) =>
      columns.find(
        (col: TaskColumn) => col.id === id || col.task_ids.includes(id),
      ),
    [columns],
  );

  return {
    tasks,
    columns,
    loading,
    error,
    getTask,
    findContainer,
    loadTasks: (project_id: string) => dispatch(loadTasks(project_id)),
    moveTask: async (
      task_id: string,
      sourceId: string,
      destId: string,
      destIndex: number,
    ) => {
      await dispatch(moveTaskAsync({ task_id, sourceId, destId, destIndex }));
    },
    deleteColumn: (project_id: string, columnId: string) =>
      dispatch(deleteColumn({ project_id, columnId })),
    deleteTask: async (project_id: string, task_id: string) => {
      await dispatch(deleteTaskAsync({ project_id, task_id }));
    },
    addTask: async (
      project_id: string,
      columnId: string,
      task: {
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
        status: string;
        assignee: { id: string; name: string; avatar: string };
        due_date: string;
        tags: string[];
        project_id: string;
      },
    ) => {
      await dispatch(addTaskAsync({ project_id, columnId, task }));
    },
    updateTask: (task_id: string, updates: Partial<LegacyTask>) =>
      dispatch(updateTask({ task_id, updates })),
    addNote: (task_id: string, content: string, taskMongoId?: string) => {
      dispatch(addTaskNote({ task_id, content, taskMongoId }));
      // Also call API
      const task = tasks.find((t: LegacyTask) => t.id === task_id);
      const mongoId = taskMongoId || task?._id;
      if (mongoId) {
        queueAwareFetch(
          `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(mongoId)}/notes`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          },
        ).catch(console.error);
      }
    },
    updateNote: (
      task_id: string,
      noteId: string,
      content: string,
      taskMongoId?: string,
    ) => {
      dispatch(updateTaskNote({ task_id, noteId, content }));
      const task = tasks.find((t: LegacyTask) => t.id === task_id);
      const mongoId = taskMongoId || task?._id;
      if (mongoId) {
        queueAwareFetch(
          `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(mongoId)}/notes`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noteId, content }),
          },
        ).catch(console.error);
      }
    },
    deleteNote: (task_id: string, noteId: string, taskMongoId?: string) => {
      dispatch(deleteNoteFromTask({ task_id, noteId }));
      const task = tasks.find((t: LegacyTask) => t.id === task_id);
      const mongoId = taskMongoId || task?._id;
      if (mongoId) {
        queueAwareFetch(
          `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(mongoId)}/notes?noteId=${noteId}`,
          {
            method: "DELETE",
          },
        ).catch(console.error);
      }
    },
    addSubTask: (task_id: string, title: string) =>
      dispatch(addSubTaskAction({ task_id, title })),
    updateSubTask: (
      task_id: string,
      subtask_id: string,
      updates: Partial<SubTask>,
    ) => dispatch(updateSubTaskAction({ task_id, subtask_id, updates })),
    deleteSubTask: (task_id: string, subtask_id: string) =>
      dispatch(deleteSubTaskAction({ task_id, subtask_id })),
  };
};

/**
 * useAuthStore - Redux-based hook for backward compatibility
 * Note: Real auth is managed through the user slice and auth APIs
 */
export const useAuthStore = () => {
  const userProfile = useAppSelector(
    (state: RootState) => state.user.userProfile,
  );
  const isAuthenticated = useAppSelector(
    (state: RootState) => state.user.isAuthenticated,
  );

  // Provide a default profile for backward compatibility
  const profile: UserProfile = userProfile
    ? {
        full_name: userProfile.full_name || defaultProfile.full_name,
        headline: userProfile.headline || defaultProfile.headline,
        bio: userProfile.bio || defaultProfile.bio,
        skills: userProfile.skills || defaultProfile.skills,
        socialLinks: userProfile.socialLinks || defaultProfile.socialLinks,
        avatar: userProfile.profile_picture || defaultProfile.avatar,
        resume: userProfile.resume,
      }
    : defaultProfile;

  return {
    user: userProfile as unknown as User | null,
    isAuthenticated,
    profile,
    login: async () => {
      // Auth is handled by API routes, this is for backward compatibility
      console.warn("useAuthStore.login is deprecated. Use API authentication.");
      return false;
    },
    logout: () => {
      console.warn(
        "useAuthStore.logout is deprecated. Use API authentication.",
      );
    },
    updateUser: () => {
      console.warn(
        "useAuthStore.updateUser is deprecated. Use user slice actions.",
      );
    },
    updateUserSettings: () => {
      console.warn(
        "useAuthStore.updateUserSettings is deprecated. Use user slice actions.",
      );
    },
    updateProfile: () => {
      console.warn(
        "useAuthStore.updateProfile is deprecated. Use user slice actions.",
      );
    },
  };
};

/**
 * useUserStore - Alias for profile functionality from useAuthStore
 */
export const useUserStore = () => {
  const { profile, updateProfile } = useAuthStore();
  return { profile, updateProfile };
};

// =====================================
// UTILITY HOOKS (Backward compatible)
// =====================================

export const useProject = (project_id: string) => {
  const { getProject } = useProjectStore();
  return getProject(project_id);
};

export const useTask = (task_id: string) => {
  const { getTask } = useTaskStore();
  return getTask(task_id);
};

export const useTasksByProject = (project_id: string) => {
  const tasks = useAppSelector((state: RootState) =>
    state.legacyTask.tasks.filter(
      (t: LegacyTask) => t.project_id === project_id,
    ),
  );
  return tasks;
};

export const useLearningPath = (pathId: string) => {
  const { getLearningPath } = useLearningStore();
  return getLearningPath(pathId);
};

export const useChapter = (pathId: string, chapterId: string) => {
  const { getChapter } = useLearningStore();
  return getChapter(pathId, chapterId);
};

export const useSection = (
  pathId: string,
  chapterId: string,
  sectionId: string,
) => {
  const { getSection } = useLearningStore();
  return getSection(pathId, chapterId, sectionId);
};

// Re-export types for advanced usage
export type { RootState, AppDispatch };
