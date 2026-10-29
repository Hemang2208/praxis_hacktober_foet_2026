import { useTaskStore } from "./store";
import { Task } from "./store";

export function useTask(task_id: string): Task | undefined {
  const { tasks } = useTaskStore();
  return tasks.find((task) => task.id === task_id);
}
