import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchTaskById } from "@/redux/slice/task.slice";
import {
  selectDetailItemCache,
  markDetailItemFetched,
} from "@/redux/slice/cache.slice";

/**
 * Fetch task by ID with session cache.
 * Shows Redux data immediately; refetches only when cache is invalid or task is missing.
 */
export function useTaskById(id: string) {
  const dispatch = useAppDispatch();
  const task = useAppSelector((state) =>
    state.task.currentTask?._id === id
      ? state.task.currentTask
      : state.task.tasks.find((t) => t._id === id),
  );
  const loading = useAppSelector((state) => state.task.loading.fetchTasks);
  const error = useAppSelector((state) => state.task.error.fetchTasks);

  const cacheState = useAppSelector((state) =>
    selectDetailItemCache(state, "tasks", id),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;

  useEffect(() => {
    if (!id) return;

    if (isCacheValid && task) {
      return;
    }

    if (loading) {
      return;
    }

    void dispatch(fetchTaskById(id)).then(() => {
      dispatch(markDetailItemFetched({ resource: "tasks", id }));
    });
  }, [id, isCacheValid, task, loading, dispatch]);

  return {
    task: task || null,
    loading: loading && !task,
    error,
    isCached: isCacheValid && !!task,
  };
}
