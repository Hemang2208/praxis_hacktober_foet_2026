import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';
import { RootState, AppDispatch } from '@/redux/store';

export const useTasks = () => {
  const dispatch = useDispatch<AppDispatch>();
  const taskState = useSelector((state: RootState) => state.task);

  // Memoized selectors for filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...taskState.tasks];

    // Apply status filter
    if (taskState.ui.filter_status) {
      filtered = filtered.filter(task => task.status === taskState.ui.filter_status);
    }

    // Apply priority filter
    if (taskState.ui.filter_priority) {
      filtered = filtered.filter(task => task.priority === taskState.ui.filter_priority);
    }

    // Apply project filter
    if (taskState.ui.filter_project) {
      filtered = filtered.filter(task => task.project_id === taskState.ui.filter_project);
    }

    // Apply search query
    if (taskState.ui.search_query) {
      const query = taskState.ui.search_query.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { sort_by, sort_order } = taskState.ui;
      let comparison = 0;

      switch (sort_by) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = 0;
      }

      return sort_order === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [taskState.tasks, taskState.ui]);

  // Tasks grouped by status for Kanban view
  const tasksByStatus = useMemo(() => {
    const filtered = filteredTasks;
    return {
      todo: filtered.filter(task => task.status === 'todo'),
      'in-progress': filtered.filter(task => task.status === 'in-progress'),
      completed: filtered.filter(task => task.status === 'completed'),
      blocked: filtered.filter(task => task.status === 'blocked'),
    };
  }, [filteredTasks]);

  // Tasks grouped by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, typeof taskState.tasks> = {};
    taskState.tasks.forEach(task => {
      if (!grouped[task.project_id]) {
        grouped[task.project_id] = [];
      }
      grouped[task.project_id].push(task);
    });
    return grouped;
  }, [taskState]);

  // Task statistics
  const taskStats = useMemo(() => {
    const total = taskState.tasks.length;
    const completed = taskState.tasks.filter(t => t.status === 'completed').length;
    const inProgress = taskState.tasks.filter(t => t.status === 'in-progress').length;
    const todo = taskState.tasks.filter(t => t.status === 'todo').length;
    const blocked = taskState.tasks.filter(t => t.status === 'blocked').length;

    // Overdue tasks
    const now = new Date();
    const overdue = taskState.tasks.filter(t => 
      t.due_date && 
      new Date(t.due_date) < now && 
      t.status !== 'completed'
    ).length;

    // High priority tasks
    const highPriority = taskState.tasks.filter(t => 
      t.priority === 'high' || t.priority === 'critical'
    ).length;

    return {
      total,
      completed,
      inProgress,
      todo,
      blocked,
      overdue,
      highPriority,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [taskState.tasks]);

  // Get tasks for a specific project
  const getTasksForProject = (project_id: string) => {
    return taskState.tasks.filter(task => task.project_id === project_id);
  };

  // Get overdue tasks
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return taskState.tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < now && 
      task.status !== 'completed'
    );
  }, [taskState.tasks]);

  // Get upcoming tasks (due in next 7 days)
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return taskState.tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) >= now && 
      new Date(task.due_date) <= nextWeek &&
      task.status !== 'completed'
    );
  }, [taskState.tasks]);

  return {
    // Data
    tasks: taskState.tasks,
    filteredTasks,
    currentTask: taskState.currentTask,
    tasksByStatus,
    tasksByProject,
    taskStats,
    overdueTasks,
    upcomingTasks,

    // Loading states
    loading: taskState.loading,

    // Error states
    error: taskState.error,

    // UI state
    ui: taskState.ui,

    // Helper functions
    getTasksForProject,

    // Dispatch for actions
    dispatch,
  };
};

export default useTasks;
