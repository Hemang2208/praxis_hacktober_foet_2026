import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";

// Agent-only updater for task progress
// This function calls the planner/task-mgmt agent directly and will throw on non-OK responses.
export type ExternalTaskProgressProjectUpdate = {
  project_id: string;
  progress: number;
  status: string;
  total_tasks?: number;
  completed_tasks?: number;
};

export type ExternalTaskProgressResponse = {
  message?: string;
  task_id?: string;
  task_status?: string;
  project?: ExternalTaskProgressProjectUpdate | null;
};

export async function updateExternalTaskProgress(
  task_id: string,
  _progress: number,
  options?: { status?: string; hours_worked?: number; notes?: string },
): Promise<ExternalTaskProgressResponse> {
  const res = await queueAwareFetch(
    `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(
      task_id,
    )}/progress`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: task_id,
        status: options?.status,
        hours_worked: options?.hours_worked ?? 0,
        notes: options?.notes,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Agent progress update failed: ${res.status} ${res.statusText} - ${text}`,
    );
    const errWithMeta = err as Error & { status?: number; body?: string };
    errWithMeta.status = res.status;
    errWithMeta.body = text;
    throw errWithMeta;
  }

  // Prefer JSON result since the agent now returns computed project updates.
  const json = (await res.json().catch(() => ({}))) as ExternalTaskProgressResponse;

  if (isQueueResponse(json)) {
    throw new Error("Progress update is still processing");
  }

  return json;
}
