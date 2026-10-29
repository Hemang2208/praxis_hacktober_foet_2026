"use client";

import { useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { KanbanCard } from "./kanban-card";

import { Task } from "@/lib/store";

interface SortableKanbanCardProps {
  task: Task;
  project_id: string;
}

export function SortableKanbanCard({ task, project_id }: SortableKanbanCardProps) {
  const {   
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: task.id });

  const dragTransform = transform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1 };

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      animate={{
        x: dragTransform.x,
        y: dragTransform.y,
        scaleX: dragTransform.scaleX ?? 1,
        scaleY: dragTransform.scaleY ?? 1,
        opacity: isDragging ? 0.4 : 1,
      }}
      transition={{ type: "tween", duration: 0 }}
    >
      <KanbanCard task={task} project_id={project_id} />
    </motion.div>
  );
}
