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
import { fetchTasksByProject, updateTask } from "@/redux/slice/task.slice";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { Task } from "@/lib/store";
import useUserProfile from "@/hooks/useUserProfile";
import { getViewerCompanySubrole } from "@/lib/company-rbac";
import {
  normalizeTaskWorkflowStatus,
  canTransitionWorkflowStatus,
} from "@/lib/taskWorkflow";

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
});

// Column container component to properly use the useDroppable hook
function ColumnContainer({
  column,
  tasks,
  project_id,
  basePath,
  canManageBoardStructure,
  canManageTaskActions,
  canUpdateTaskStatus,
  canDragTask,
  isDragOver,
  isAdminOrOwner,
}: {
  column: BoardColumn;
  tasks: Task[];
  project_id: string;
  basePath?: string;
  canManageBoardStructure?: boolean;
  canManageTaskActions?: boolean;
  canUpdateTaskStatus?: boolean;
  canDragTask?: boolean;
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
        basePath={basePath}
        canManageBoardStructure={canManageBoardStructure}
        canManageTaskActions={canManageTaskActions}
        canUpdateTaskStatus={canUpdateTaskStatus}
        canDragTask={canDragTask}
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
  const { mongoUser } = useUserProfile();

  const pendingStatusRef = React.useRef<Record<string, string>>({});

  const viewerRole = String((mongoUser as any)?.role ?? "").toLowerCase();
  const companySubrole = React.useMemo(
    () => getViewerCompanySubrole(mongoUser as any),
    [mongoUser],
  );
  const canManageBoardStructure =
    viewerRole === "college" ||
    (viewerRole === "company" &&
      (companySubrole === "owner" || companySubrole === "admin"));
  const canManageTaskActions = canManageBoardStructure;
  const canUpdateTaskStatus =
    viewerRole === "college" ||
    (viewerRole === "company" &&
      (companySubrole === "owner" || companySubrole === "admin"));
  const canDragTask = canUpdateTaskStatus;

  const { projectBoard, loading, error } = useAppSelector(
    (state) => state.project,
  );

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
    setActiveId(event.active.id as string);
    setOverColumnId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !projectBoard || !canUpdateTaskStatus) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = projectBoard.tasks.find((task) => task.id === activeId);
    if (!activeTask) return;

    // Resolve which column we're currently over.
    // When a column already has tasks, `over.id` is often a task id (not the column id).
    const overColumn = projectBoard.columns.find((col) => col.id === overId);
    const overTask = overColumn
      ? null
      : projectBoard.tasks.find((task) => task.id === overId);
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
        .then(() => {
          // Keep task slice synchronized with board drag-and-drop updates.
          return dispatch(
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
          ).unwrap();
        })
        .then(() => dispatch(fetchTasksByProject(project_id)).unwrap())
        .catch((err) => {
          const message =
            typeof err === "string"
              ? err
              : err instanceof Error
                ? err.message
                : "Failed to update task status";
          console.warn("Failed to update board status:", message);
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
    activeId && projectBoard
      ? projectBoard.tasks.find((task) => task.id === activeId)
      : null;

  if (loading.fetchBoard) {
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

  if (error.fetchBoard || !projectBoard) {
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
          <h1 className="text-3xl font-bold">{projectBoard.project.title}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Kanban Board
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
            <SortableContext items={projectBoard.columns.map((col) => col.id)}>
              {projectBoard.columns.map((column) => {
                const columnTasks = projectBoard.tasks
                  .filter((task) => task.status === column.id)
                  .map(transformBoardTaskToTask);

                return (
                  <ColumnContainer
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    project_id={project_id}
                    basePath="dashboard"
                    canManageBoardStructure={canManageBoardStructure}
                    canManageTaskActions={canManageTaskActions}
                    canUpdateTaskStatus={canUpdateTaskStatus}
                    canDragTask={canDragTask}
                    isDragOver={activeId ? overColumnId === column.id : false}
                    isAdminOrOwner={canManageBoardStructure}
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
                  basePath="dashboard"
                  canManageTaskActions={canManageTaskActions}
                  canUpdateTaskStatus={canUpdateTaskStatus}
                  canDragTask={canDragTask}
                  isAdminOrOwner={canManageBoardStructure}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
