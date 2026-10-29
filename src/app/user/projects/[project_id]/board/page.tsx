"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { useDroppable } from "@dnd-kit/core";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchProjectBoard,
  updateTaskStatusInBoard,
  BoardTask,
  BoardColumn,
} from "@/redux/slice/project.slice";
import { updateTask } from "@/redux/slice/task.slice";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { Task } from "@/lib/store";
import useUserProfile from "@/hooks/useUserProfile";
import {
  canManageCompanyProjects,
  canManageCompanyTaskStatus,
  formatCompanySubroleLabel,
  getViewerCompanySubrole,
} from "@/lib/company-rbac";
import { normalizeTaskWorkflowStatus } from "@/lib/taskWorkflow";

// Transform BoardTask to Task for component compatibility
const transformBoardTaskToTask = (boardTask: BoardTask): Task => ({
  id: boardTask.id,
  title: boardTask.title,
  description: boardTask.description,
  priority: boardTask.priority as "high" | "medium" | "low",
  status: boardTask.status,
  assignee: {
    id: boardTask.assigned_to || "unassigned",
    name: boardTask.assigned_to || "Unassigned",
    avatar: "",
  },
  due_date: boardTask.due_date || "",
  tags: boardTask.tags,
  comments_count: boardTask.comments_count,
  attachments_count: boardTask.attachments_count,
  created_at: boardTask.created_at,
  completed_at:
    boardTask.status === "completed" ? boardTask.updated_at : undefined,
  project_id: boardTask.project_id,
  notes: [],
  sub_tasks: (boardTask.sub_tasks || [])
    .filter((st) => {
      const s = st as any;
      return !s.is_deleted && !s.isDeleted && !s.deleted;
    })
    .map((subtask, index) => ({
      id: `${boardTask.id}-subtask-${index}`,
      title: subtask.title,
      completed: subtask.completed,
      created_at: new Date().toISOString(),
    })),
  activity: [],
  linked_pr_id: boardTask.linked_pr_id || null,
});

function ColumnContainer({
  column,
  tasks,
  project_id,
  isStudent,
  basePath,
  canManageBoardStructure,
  canManageTaskActions,
  canUpdateTaskStatus,
  canDragTask,
  traineeReviewOnly,
  isDragOver,
  isAdminOrOwner,
}: {
  column: BoardColumn;
  tasks: Task[];
  project_id: string;
  isStudent?: boolean;
  basePath?: string;
  canManageBoardStructure?: boolean;
  canManageTaskActions?: boolean;
  canUpdateTaskStatus?: boolean;
  canDragTask?: boolean;
  traineeReviewOnly?: boolean;
  isDragOver?: boolean;
  isAdminOrOwner?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[240px] w-[320px] sm:w-[360px] lg:w-[400px] space-y-4 rounded-md p-2 transition-all ${
        isOver || isDragOver ? "bg-blue-100 dark:bg-blue-900" : "bg-muted/40"
      }`}
    >
      <KanbanColumn
        column={column}
        tasks={tasks}
        project_id={project_id}
        isStudent={isStudent}
        basePath={basePath}
        canManageBoardStructure={canManageBoardStructure}
        canManageTaskActions={canManageTaskActions}
        canUpdateTaskStatus={canUpdateTaskStatus}
        canDragTask={canDragTask}
        traineeReviewOnly={traineeReviewOnly}
        isAdminOrOwner={isAdminOrOwner}
      />
    </div>
  );
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0
    ? pointerCollisions
    : closestCorners(args);
};
export default function ProjectBoardPage() {
  const params = useParams();
  const project_id = params.project_id as string;
  const dispatch = useAppDispatch();
  const { mongoUser: viewerProfile } = useUserProfile() || { mongoUser: null };

  const viewerRole = String((viewerProfile as any)?.role ?? "").toLowerCase();
  const viewerSubrole = getViewerCompanySubrole(viewerProfile as any);
  const isCompanyViewer = viewerRole === "company" || Boolean(viewerSubrole);
  const isCompanyTrainee = isCompanyViewer && viewerSubrole === "trainee";
  const canManageBoardStructure = isCompanyViewer
    ? canManageCompanyProjects(viewerProfile as any)
    : false;
  const canManageTaskActions = canManageBoardStructure;
  const canUpdateTaskStatus = isCompanyViewer
    ? canManageCompanyTaskStatus(viewerProfile as any)
    : false;
  const canDragTask = canUpdateTaskStatus;
  const isStudentMode = !isCompanyViewer || isCompanyTrainee;

  const pendingStatusRef = React.useRef<Record<string, string>>({});

  const { projectBoard, loading, error } = useAppSelector(
    (state) => state.project,
  );
  const boardProjectId = useAppSelector(
    (state) => state.project.projectBoardProjectId,
  );
  const cachedBoardForProject = useAppSelector(
    (state) => state.project.projectBoardsByProjectId[project_id],
  );
  const boardForCurrentProject =
    cachedBoardForProject ||
    (boardProjectId === project_id ? projectBoard : null);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overColumnId, setOverColumnId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  React.useEffect(() => {
    if (project_id) {
      dispatch(fetchProjectBoard(project_id));
    }
  }, [project_id, dispatch]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!canDragTask) return;
    setActiveId(event.active.id as string);
    setOverColumnId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!canDragTask) return;
    const { active, over } = event;
    if (!over || !boardForCurrentProject) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = boardForCurrentProject.tasks.find(
      (task) => task.id === activeId,
    );
    if (!activeTask) return;

    // Resolve which column we're currently over.
    // When a column already has tasks, `over.id` is often a task id (not the column id).
    const overColumn = boardForCurrentProject.columns.find(
      (col) => col.id === overId,
    );
    const overTask = overColumn
      ? null
      : boardForCurrentProject.tasks.find((task) => task.id === overId);
    const targetStatus = overColumn?.id
      ? normalizeTaskWorkflowStatus(overColumn.id)
      : overTask?.status
        ? normalizeTaskWorkflowStatus(overTask.status)
        : null;

    setOverColumnId(targetStatus);

    if (targetStatus && activeTask.status !== targetStatus) {
      if (pendingStatusRef.current[activeId] === targetStatus) return;
      pendingStatusRef.current[activeId] = targetStatus;

      dispatch(
        updateTaskStatusInBoard({
          project_id,
          task_id: activeId,
          newStatus: targetStatus,
        }),
      )
        .unwrap()
        .then(() =>
          dispatch(
            updateTask({
              id: activeId,
              updates: {
                status: targetStatus as
                  | "todo"
                  | "in-progress"
                  | "submitted"
                  | "completed"
                  | "blocked",
              },
            }),
          ).unwrap(),
        )
        .catch((err) => {
          console.warn("Failed to update board status", err);
          const message =
            typeof err === "string"
              ? err
              : err instanceof Error
                ? err.message
                : "Failed to update task status";
          toast.error(message);
        })
        .finally(() => {
          delete pendingStatusRef.current[activeId];
        });
    }
  };

  const handleDragEnd = () => {
    setActiveId(null);
    setOverColumnId(null);
  };

  const activeTask =
    activeId && boardForCurrentProject
      ? boardForCurrentProject.tasks.find((task) => task.id === activeId)
      : null;

  if (loading.fetchBoard && !boardForCurrentProject) {
    return (
      <div className="h-full flex flex-col gap-6">
        <motion.div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </motion.div>

        <div className="flex-1 min-h-0 overflow-auto pb-4 hide-scrollbar">
          <div className="flex gap-3 min-w-max">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="w-[350px]">
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-24 mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-20 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error.fetchBoard || !boardForCurrentProject) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          Board Not Found
        </h3>
        <p className="text-gray-600 mb-4">
          {error.fetchBoard || "The project board could not be loaded."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 px-6 pt-4">
      <motion.div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {boardForCurrentProject.project.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Kanban Board
            {isCompanyViewer
              ? ` • ${formatCompanySubroleLabel(viewerSubrole ?? "trainee")} access`
              : " • Assigned workspace"}
          </p>
        </div>
      </motion.div>

      <div className="flex-1 min-h-0 overflow-auto pb-4 hide-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 min-w-max snap-x snap-mandatory">
            <SortableContext
              items={boardForCurrentProject.columns.map((col) => col.id)}
            >
              {boardForCurrentProject.columns.map((column) => {
                const columnTasks = boardForCurrentProject.tasks
                  .filter((task) => task.status === column.id)
                  // Filter tasks based on user role
                  .filter((task) => {
                    // Owner, Admin, and Manager can see all tasks
                    if (
                      viewerSubrole === "owner" ||
                      viewerSubrole === "admin" ||
                      viewerSubrole === "manager"
                    ) {
                      return true;
                    }
                    
                    // Everyone else (trainees and normal users) ONLY see tasks assigned to them
                    if (!task.assigned_to) return false;
                    const activeId = String((viewerProfile as any)?._id ?? "").trim().toLowerCase();
                    const activeEmail = String((viewerProfile as any)?.email ?? "").trim().toLowerCase();
                    return String(task.assigned_to)
                      .split(",")
                      .map((id) => id.trim().toLowerCase())
                      .some((id) => id === activeId || (activeEmail && id === activeEmail));
                  })
                  .map(transformBoardTaskToTask);

                return (
                  <ColumnContainer
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    project_id={project_id}
                    isStudent={isStudentMode}
                    basePath="user"
                    canManageBoardStructure={canManageBoardStructure}
                    canManageTaskActions={canManageTaskActions}
                    canUpdateTaskStatus={canUpdateTaskStatus}
                    canDragTask={canDragTask}
                    traineeReviewOnly={isCompanyTrainee}
                    isDragOver={activeId ? overColumnId === column.id : false}
                  />
                );
              })}
            </SortableContext>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="opacity-60">
                <KanbanCard
                  task={transformBoardTaskToTask(activeTask)}
                  project_id={project_id}
                  isStudent={isStudentMode}
                  basePath="user"
                  canManageTaskActions={canManageTaskActions}
                  canUpdateTaskStatus={canUpdateTaskStatus}
                  canDragTask={canDragTask}
                  traineeReviewOnly={isCompanyTrainee}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
