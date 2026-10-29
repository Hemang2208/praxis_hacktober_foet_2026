import dbConnect from "../../src/lib/dbConnect";
import Task from "../../src/models/Task";
import { emit_notification_event } from "../../src/lib/notificationEvents";
import { inngest } from "../client";

export const onTaskDueSoon = inngest.createFunction(
  {
    id: "task-due-soon",
    name: "Check Tasks Due Soon",
    retries: 1,
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const results: { taskId: string; notified: boolean; window: string }[] = [];

    await step.run("check-and-notify-due-tasks", async () => {
      await dbConnect();

      const now = new Date();

      // 1. Check Due Soon Windows (Non-overlapping to prevent duplicate emails)
      // - 1h window: due between now and now + 1h
      // - 12h window: due between now + 1h and now + 12h
      // - 24h window: due between now + 12h and now + 24h
      const windows = [
        {
          label: "1h",
          start: now,
          end: new Date(now.getTime() + 60 * 60 * 1000),
          title: "Very Soon",
          messageSuffix: "within the hour"
        },
        {
          label: "12h",
          start: new Date(now.getTime() + 60 * 60 * 1000),
          end: new Date(now.getTime() + 12 * 60 * 60 * 1000),
          title: "in 12 hours",
          messageSuffix: "in approximately 12 hours"
        },
        {
          label: "24h",
          start: new Date(now.getTime() + 12 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          title: "in 24 hours",
          messageSuffix: "in approximately 24 hours"
        }
      ];

      for (const w of windows) {
        const tasks = await Task.find({
          due_date: { $gte: w.start, $lt: w.end },
          status: { $nin: ["completed", "cancelled", "archived"] },
          assigned_to: { $exists: true, $ne: null },
        })
          .select("_id title due_date assigned_to project_id")
          .lean();

        for (const task of tasks) {
          const assigneeId = task.assigned_to ? String(task.assigned_to) : null;
          if (!assigneeId) continue;

          try {
            await emit_notification_event({
              user_id: assigneeId,
              event_type: "TASK_DUE_SOON",
              title: `Task Due ${w.title}`,
              message: `Task "${task.title || "Untitled"}" is due ${w.messageSuffix}`,
              category: "tasks",
              priority: w.label === "1h" ? "high" : "medium",
              event_key: `TASK_DUE_SOON:${String(task._id)}:${w.label}`,
              metadata: {
                task_id: task._id,
                task_title: task.title || "Task",
                project_id: task.project_id,
                due_date: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
              },
            });
            results.push({ taskId: String(task._id), notified: true, window: w.label });
          } catch (err) {
            console.error(`[TASK_DUE_SOON] Failed to notify task ${task._id}:`, err);
            results.push({ taskId: String(task._id), notified: false, window: w.label });
          }
        }
      }

      // 2. Check Overdue Tasks (Due date in the past, not completed/cancelled/archived)
      const overdueTasks = await Task.find({
        due_date: { $lt: now },
        status: { $nin: ["completed", "cancelled", "archived"] },
        assigned_to: { $exists: true, $ne: null },
      })
        .select("_id title due_date assigned_to project_id")
        .lean();

      for (const task of overdueTasks) {
        const assigneeId = task.assigned_to ? String(task.assigned_to) : null;
        if (!assigneeId) continue;

        try {
          await emit_notification_event({
            user_id: assigneeId,
            event_type: "TASK_OVERDUE",
            title: "Task Overdue",
            message: `Task "${task.title || "Untitled"}" is currently overdue. Please prioritize and complete it.`,
            category: "tasks",
            priority: "high",
            event_key: `TASK_OVERDUE:${String(task._id)}`,
            metadata: {
              task_id: task._id,
              task_title: task.title || "Task",
              project_id: task.project_id,
              due_date: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
            },
          });
          results.push({ taskId: String(task._id), notified: true, window: "overdue" });
        } catch (err) {
          console.error(`[TASK_OVERDUE] Failed to notify task ${task._id}:`, err);
          results.push({ taskId: String(task._id), notified: false, window: "overdue" });
        }
      }

      return { checked: true, totalNotifications: results.length };
    });

    return { results };
  },
);
