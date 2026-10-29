import type { Task } from "@/redux/slice/task.slice";

export type TaskWorkflowStatus =
  | "todo"
  | "in-progress"
  | "submitted"
  | "completed"
  | "blocked";

export const TASK_WORKFLOW_COLUMNS: TaskWorkflowStatus[] = [
  "todo",
  "in-progress",
  "submitted",
  "completed",
  "blocked",
];

export function normalizeTaskWorkflowStatus(
  input: unknown,
): TaskWorkflowStatus {
  const value = String(input ?? "")
    .trim()
    .toLowerCase();

  if (value === "completed" || value === "done" || value === "complete") {
    return "completed";
  }

  if (value === "submitted" || value === "review" || value === "under-review") {
    return "submitted";
  }

  if (value === "blocked") {
    return "blocked";
  }

  if (
    value === "in-progress" ||
    value === "in_progress" ||
    value === "inprogress" ||
    value === "in progress" ||
    value === "progress"
  ) {
    return "in-progress";
  }

  if (
    value === "todo" ||
    value === "to-do" ||
    value === "to do" ||
    value === "pending" ||
    value === "not-started"
  ) {
    return "todo";
  }

  return "todo";
}

export function getTaskWorkflowLabel(status: TaskWorkflowStatus): string {
  switch (status) {
    case "todo":
      return "Pending";
    case "in-progress":
      return "Progress";
    case "submitted":
      return "Submitted";
    case "completed":
      return "Completed";
    case "blocked":
      return "Blocked";
    default:
      return "Pending";
  }
}

export function getVisibleSubTasks(
  task?: {
    sub_tasks?: Task["sub_tasks"] | null;
  } | null,
): Task["sub_tasks"] {
  const subTasks = Array.isArray(task?.sub_tasks) ? task.sub_tasks : [];
  return subTasks.filter((subTask) => {
    const record = subTask as unknown as Record<string, unknown>;
    return !Boolean(
      record.is_deleted ?? record.isDeleted ?? record.deleted ?? false,
    );
  });
}

export function areAllVisibleSubTasksCompleted(
  task?: {
    sub_tasks?: Task["sub_tasks"] | null;
  } | null,
): boolean {
  const visibleSubTasks = getVisibleSubTasks(task);
  if (visibleSubTasks.length === 0) return true;
  return visibleSubTasks.every((subTask) => Boolean(subTask.completed));
}

export function canSubmitTaskForReview(
  task?: {
    status?: TaskWorkflowStatus | string | null;
    sub_tasks?: Task["sub_tasks"] | null;
    linked_pr_id?: string | null;
  } | null,
): boolean {
  if (!task) return false;

  const normalizedStatus = normalizeTaskWorkflowStatus(task.status);

  // Cannot submit if already submitted or completed
  if (normalizedStatus === "submitted" || normalizedStatus === "completed") {
    return false;
  }

  // Can submit from any other status (todo, in-progress, blocked) if requirements are met
  return areAllVisibleSubTasksCompleted(task) && Boolean(task.linked_pr_id);
}

export function areAllVisibleSubTasksCompletedForPrLink(
  task?: {
    sub_tasks?: Task["sub_tasks"] | null;
  } | null,
): boolean {
  // Only check if visible subtasks are completed, regardless of PR link status
  // This gates showing the PR linking UI
  return areAllVisibleSubTasksCompleted(task);
}

export function getAllowedWorkflowTransitions(
  currentStatus: TaskWorkflowStatus,
): TaskWorkflowStatus[] {
  switch (currentStatus) {
    case "todo":
      return ["in-progress", "blocked"];
    case "in-progress":
      return ["blocked", "submitted"];
    case "submitted":
      return ["in-progress", "completed"];
    case "blocked":
      return ["in-progress"];
    case "completed":
      return [];
    default:
      return [];
  }
}

export function canTransitionWorkflowStatus(
  currentStatus: unknown,
  nextStatus: unknown,
): boolean {
  const normalizedCurrent = normalizeTaskWorkflowStatus(currentStatus);
  const normalizedNext = normalizeTaskWorkflowStatus(nextStatus);

  if (normalizedCurrent === normalizedNext) return true;
  return getAllowedWorkflowTransitions(normalizedCurrent).includes(
    normalizedNext,
  );
}

export function canApproveOrRejectTask(
  task?: {
    status?: TaskWorkflowStatus | string | null;
  } | null,
  reviewerRole?: string | null,
): boolean {
  const normalizedRole = String(reviewerRole ?? "")
    .trim()
    .toLowerCase();
  return (
    normalizeTaskWorkflowStatus(task?.status) === "submitted" &&
    (normalizedRole === "owner" || normalizedRole === "admin")
  );
}
