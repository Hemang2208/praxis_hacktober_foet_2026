import userReducer from "./slice/user.slice";
import companyReducer from "./slice/company.slice";
import projectReducer from "./slice/project.slice";
import taskReducer from "./slice/task.slice";
import dashboardReducer from "./slice/dashboard.slice";
import githubReducer from "./slice/github.slice";
import assessmentReducer from "./slice/assessment.slice";
import currentAssessmentReducer from "./slice/currentAssessment.slice";
import supportChatReducer from "./slice/supportChat.slice";
import certificatesReducer from "./slice/certificates.slice";
import learningReducer from "./slice/learning.slice";
import notesReducer from "./slice/notes.slice";
import chapterUIReducer from "./slice/chapterUI.slice";
import analyticsReducer from "./slice/analytics.slice";
import themeReducer from "./slice/theme.slice";
import legacyProjectReducer from "./slice/legacyProject.slice";
import legacyTaskReducer from "./slice/legacyTask.slice";
import cacheReducer from "./slice/cache.slice";
import notificationsReducer from "./slice/notifications.slice";
import { configureStore, Middleware } from "@reduxjs/toolkit";

// Mutation toast middleware: shows toast notifications for all thunk mutations.
// Only fires for thunk actions (non-sync), ignoring GET/fetch thunks.
// Import is dynamic to avoid server-side issues with react-hot-toast.
const mutationToastMiddleware: Middleware = () => (next) => (action: any) => {
  if (action?.type?.endsWith("/rejected")) {
    const baseType = action.type.replace("/rejected", "");
    // Only show for known mutation patterns (not fetch/GET thunks)
    const mutationPatterns = [
      "create", "update", "delete", "remove", "invite",
      "submit", "assign", "upload", "mark", "refine",
      "link", "unlink", "generate",
    ];
    const actionName = baseType.split("/").pop() || "";
    const isMutation = mutationPatterns.some((p) => {
      return actionName.toLowerCase().startsWith(p);
    });

    if (isMutation) {
      import("react-hot-toast").then(({ default: toast }) => {
        const msg =
          typeof action.payload === "string"
            ? action.payload
            : action.error?.message || "Operation failed";
        toast.error(msg, { id: action.type });
      });
    }
    return next(action);
  }

  // Show success toasts for mutation thunks (create, update, delete, etc.)
  // but NOT for fetch/pending thunks
  if (action?.type?.endsWith("/fulfilled")) {
    const baseType = action.type.replace("/fulfilled", "");
    // Only show for known mutation patterns (not fetch thunks)
    const mutationPatterns = [
      "create", "update", "delete", "remove", "invite",
      "submit", "assign", "upload", "mark", "refine",
      "link", "unlink", "generate",
    ];
        const actionName = baseType.split("/").pop() || "";
        const isMutation = mutationPatterns.some((p) => {
          return actionName.toLowerCase().startsWith(p);
        });

        if (isMutation) {
          import("react-hot-toast").then(({ default: toast }) => {
            const successMessages: Record<string, string> = {
          "project/createProject": "Project created",
          "project/deleteProject": "Project deleted",
          "project/updateProject": "Project updated",
          "project/updateProjectTeam": "Team updated",
          "project/linkProjectRepo": "Repository linked",
          "project/generateProjectTasks": "Tasks generated",
          "task/updateTask": "Task updated",
          "task/createTaskInBoard": "Task created",
          "task/updateTaskInBoard": "Task updated",
          "task/addTaskNote": "Note added",
          "task/updateTaskNote": "Note updated",
          "task/deleteTaskNote": "Note deleted",
          "task/assignUserToTask": "Member assigned",
          "assessment/createAssessment": "Assessment created",
          "assessment/submitAssessment": "Assessment submitted",
          "company/inviteMember": "Invite sent",
          "company/updateMemberRole": "Role updated",
          "company/removeMember": "Member removed",
          "company/updateProfile": "Profile updated",
          "company/uploadImage": "Image uploaded",
          "user/updateUserProfile": "Profile updated",
          "user/uploadFile": "File uploaded",
          "notifications/mark_notification_read": "Notification read",
          "notifications/mark_notifications_read": "Notifications read",
          "notifications/mark_all_notifications_read": "All read",
          "notifications/delete_notifications": "Notifications deleted",
        };
        const msg = successMessages[baseType] || `${actionName} succeeded`;
        toast.success(msg, { id: baseType });
      });
    }
    return next(action);
  }

  return next(action);
};

// Ensure localStorage is available for SSR
if (typeof window === "undefined" && typeof localStorage === "undefined") {
  class LocalStorageMock implements Storage {
    private data: Record<string, string> = {};

    get length(): number {
      return Object.keys(this.data).length;
    }

    clear(): void {
      this.data = {};
    }

    getItem(key: string): string | null {
      return this.data[key] ?? null;
    }

    key(index: number): string | null {
      const keys = Object.keys(this.data);
      return keys[index] ?? null;
    }

    removeItem(key: string): void {
      delete this.data[key];
    }

    setItem(key: string, value: string): void {
      this.data[key] = value;
    }
  }

  (global as Record<string, unknown>).localStorage = new LocalStorageMock();
}

export const store = configureStore({
  reducer: {
    user: userReducer,
    company: companyReducer,
    project: projectReducer,
    task: taskReducer,
    dashboard: dashboardReducer,
    github: githubReducer,
    assessment: assessmentReducer,
    currentAssessment: currentAssessmentReducer,
    supportChat: supportChatReducer,
    certificates: certificatesReducer,
    learning: learningReducer,
    notes: notesReducer,
    chapterUI: chapterUIReducer,
    analytics: analyticsReducer,
    theme: themeReducer,
    legacyProject: legacyProjectReducer,
    legacyTask: legacyTaskReducer,
    cache: cacheReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        // All date objects should now be serialized as ISO strings
      },
    }).concat(mutationToastMiddleware),
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
