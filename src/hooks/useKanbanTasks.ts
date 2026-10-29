import { useState, useEffect } from 'react';
import { TASK_MGMT_AGENT_URL } from '@/utils/API_URL';

export interface TaskData {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string;
  tags?: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  title: string;
  status: 'todo' | 'in-progress' | 'completed' | 'blocked';
  color: string;
  tasks: TaskData[];
}

interface UseKanbanTasksReturn {
  columns: KanbanColumn[];
  loading: boolean;
  error: string | null;
}

const statusConfig = {
  todo: { title: 'To Do', color: 'bg-slate-100' },
  'in-progress': { title: 'In Progress', color: 'bg-blue-100' },
  completed: { title: 'Done', color: 'bg-green-100' },
  blocked: { title: 'Blocked', color: 'bg-red-100' },
};

export function useKanbanTasks(): UseKanbanTasksReturn {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKanbanTasks() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${TASK_MGMT_AGENT_URL}/tasks`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }

        const data = await response.json();
        const allTasks: TaskData[] = data.tasks || [];

        // Organize tasks by status
        const kanbanColumns: KanbanColumn[] = (
          Object.entries(statusConfig) as [string, { title: string; color: string }][]
        ).map(([status, config]) => ({
          title: config.title,
          status: status as 'todo' | 'in-progress' | 'completed' | 'blocked',
          color: config.color,
          tasks: allTasks.filter(task => task.status === status),
        }));

        setColumns(kanbanColumns);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
        console.error('Error fetching kanban tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKanbanTasks();
  }, []);

  return { columns, loading, error };
}
