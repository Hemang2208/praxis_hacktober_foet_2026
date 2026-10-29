// "use client";

// import * as React from "react";
// import { Calendar, Flag } from "lucide-react";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Badge } from "@/components/ui/badge";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { type Task, useTaskStore } from "@/lib/store";
// import Image from "next/image";
// import { formatDate } from "@/lib/formatDate";
// import AssignedUser from "@/components/tasks/AssignedUser";
// import toast from "react-hot-toast";
// import useUserProfile from "@/hooks/useUserProfile";
// import { extractGitHubUsername } from "@/lib/github";
// import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";

// interface TaskDetailsTabProps {
//   task: Task;
// }

// export function TaskDetailsTab({ task }: TaskDetailsTabProps) {
//   const { updateTask } = useTaskStore();
//   const [isEditing, setIsEditing] = React.useState(false);
//   const [editedTask, setEditedTask] = React.useState({
//     title: task.title,
//     description: task.description,
//     priority: task.priority,
//     status: task.status,
//     due_date: task.due_date,
//   });

//   const handleSave = () => {
//     updateTask(task.id, editedTask);
//     setIsEditing(false);
//   };

//   const handleCancel = () => {
//     setEditedTask({
//       title: task.title,
//       description: task.description,
//       priority: task.priority,
//       status: task.status,
//       due_date: task.due_date,
//     });
//     setIsEditing(false);
//   };

//   return (
//     <div className="p-6 space-y-6">
//       {/* Edit Controls */}
//       <div className="flex items-center justify-between">
//         <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
//           Task Details
//         </h3>
//         {!isEditing ? (
//           <Button onClick={() => setIsEditing(true)} size="sm">
//             Edit Task
//           </Button>
//         ) : (
//           <div className="flex gap-2">
//             <Button onClick={handleSave} size="sm">
//               Save
//             </Button>
//             <Button onClick={handleCancel} variant="outline" size="sm">
//               Cancel
//             </Button>
//           </div>
//         )}
//       </div>

//       {/* Task Title */}
//       <div className="space-y-2">
//         <Label htmlFor="title">Title</Label>
//         {isEditing ? (
//           <Input
//             id="title"
//             value={editedTask.title}
//             onChange={(e) =>
//               setEditedTask({ ...editedTask, title: e.target.value })
//             }
//           />
//         ) : (
//           <div className="p-2 text-slate-900 dark:text-slate-100 font-medium">
//             {task.title}
//           </div>
//         )}
//       </div>

//       {/* Task Description */}
//       <div className="space-y-2">
//         <Label htmlFor="description">Description</Label>
//         {isEditing ? (
//           <Textarea
//             id="description"
//             value={editedTask.description}
//             onChange={(e) =>
//               setEditedTask({ ...editedTask, description: e.target.value })
//             }
//             rows={4}
//           />
//         ) : (
//           <div className="p-2 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
//             {task.description}
//           </div>
//         )}
//       </div>

//       {/* Task Properties */}
//       <div className="grid grid-cols-2 gap-4">
//         {/* Status */}
//         <div className="space-y-2">
//           <Label>Status</Label>
//           {isEditing ? (
//             <Select
//               value={editedTask.status}
//               onValueChange={(value) =>
//                 setEditedTask({ ...editedTask, status: value })
//               }
//             >
//               <SelectTrigger>
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="Backlog">Backlog</SelectItem>
//                 <SelectItem value="In Progress">In Progress</SelectItem>
//                 <SelectItem value="Review">Review</SelectItem>
//                 <SelectItem value="Done">Done</SelectItem>
//               </SelectContent>
//             </Select>
//           ) : (
//             <Badge variant="outline" className="w-fit">
//               {task.status}
//             </Badge>
//           )}
//         </div>

//         {/* Priority */}
//         <div className="space-y-2">
//           <Label>Priority</Label>
//           {isEditing ? (
//             <Select
//               value={editedTask.priority}
//               onValueChange={(value) =>
//                 setEditedTask({
//                   ...editedTask,
//                   priority: value as "high" | "medium" | "low",
//                 })
//               }
//             >
//               <SelectTrigger>
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="high">High</SelectItem>
//                 <SelectItem value="medium">Medium</SelectItem>
//                 <SelectItem value="low">Low</SelectItem>
//               </SelectContent>
//             </Select>
//           ) : (
//             <Badge variant="outline" className="w-fit">
//               <Flag className="mr-1 h-3 w-3" />
//               {task.priority}
//             </Badge>
//           )}
//         </div>
//       </div>

//       {/* Due Date */}
//       <div className="space-y-2">
//         <Label htmlFor="due_date">Due Date</Label>
//         {isEditing ? (
//           <Input
//             id="due_date"
//             type="date"
//             value={editedTask.due_date}
//             onChange={(e) =>
//               setEditedTask({ ...editedTask, due_date: e.target.value })
//             }
//           />
//         ) : (
//           <div className="flex items-center gap-2 p-2">
//             <Calendar className="h-4 w-4 text-slate-400" />
//             <span className="text-slate-600">{formatDate(task.due_date)}</span>
//           </div>
//         )}
//       </div>

//       {/* Assignee */}
//       <div className="space-y-2">
//         <Label>Assignee</Label>
//         <div className="flex items-center gap-3 p-2">
//           <Image
//             src={task?.assignee?.avatar || "https://placehold.co/30/svg"}
//             alt={task?.assignee?.name}
//             className="h-8 w-8 rounded-full"
//             fill
//           />
//           <span className="text-slate-900 dark:text-slate-100">
//             {task?.assignee?.name}
//           </span>
//         </div>
//       </div>

//       {/* Tags */}
//       <div className="space-y-2">
//         <Label>Tags</Label>
//         <div className="flex flex-wrap gap-2">
//           {task?.tags?.map((tag) => (
//             <Badge key={tag} variant="secondary">
//               {tag}
//             </Badge>
//           ))}
//         </div>
//       </div>

//       {/* Metadata */}
//       <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
//         <div className="grid grid-cols-2 gap-4 text-sm">
//           <div>
//             <span className="text-slate-500">Created:</span>
//             <div>{new Date(task.created_at).toLocaleDateString()}</div>
//           </div>
//           {task.completed_at && (
//             <div>
//               <span className="text-slate-500">Completed:</span>
//               <div>{new Date(task.completed_at).toLocaleDateString()}</div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import * as React from "react";
import { Calendar, Flag, GitBranch, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Task } from "@/lib/store";
import { formatDate } from "@/lib/formatDate";
import AssignedUser from "@/components/tasks/AssignedUser";
import toast from "react-hot-toast";
import useUserProfile from "@/hooks/useUserProfile";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";
import { extractGitHubUsername } from "@/lib/github";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { useAppDispatch } from "@/redux/hooks";
import { fetchTaskById } from "@/redux/slice/task.slice";
import { fetchProjectBoard } from "@/redux/slice/project.slice";
import { invalidatePageCache, invalidateDetailItemCache } from "@/redux/slice/cache.slice";

interface TaskDetailsTabProps {
  task: Task;
  isStudent?: boolean;
}

export function TaskDetailsTab({
  task: initialTask,
  isStudent,
}: TaskDetailsTabProps) {
  const [task, setTask] = React.useState<Task>(initialTask);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const { mongoUser } = useUserProfile();
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const taskToEditable = React.useCallback(
    (t: Task) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      status:
        t.status === "submitted" || t.status === "review"
          ? "Submitted"
          : t.status,
      due_date:
        typeof t.due_date === "string"
          ? formatDate(t.due_date)
          : typeof (t as any).due_date === "string"
            ? formatDate((t as any).due_date)
            : t.due_date instanceof Date
              ? t.due_date.toISOString().split("T")[0]
              : "",
    }),
    [],
  );

  const [editedTask, setEditedTask] = React.useState({
    ...taskToEditable(initialTask),
  });

  React.useEffect(() => {
    if (isEditing) return;
    setEditedTask(taskToEditable(task));
  }, [task, isEditing, taskToEditable]);

  const handleSave = async () => {
    if (!task?.id) return;

    setIsSaving(true);
    const loadingId = toast.loading("Saving changes...");
    try {
      const updates: Record<string, unknown> = {
        title: editedTask.title,
        description: editedTask.description,
        priority: editedTask.priority,
        status: editedTask.status,
      };

      if (editedTask.due_date) {
        updates.due_date = new Date(editedTask.due_date).toISOString();
      }

      const response = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as any;
        throw new Error(err?.detail || err?.message || "Failed to update task");
      }

      const payload = (await response.json().catch(() => ({}))) as any;
      const updated = payload?.task ?? payload;

      const due_date = updated?.due_date
        ? new Date(String(updated.due_date)).toISOString()
        : editedTask.due_date
          ? new Date(editedTask.due_date).toISOString()
          : task.due_date;

      setTask((prev) => ({
        ...prev,
        title: editedTask.title,
        description: editedTask.description,
        priority: editedTask.priority,
        status: editedTask.status,
        due_date,
        updated_at:
          updated?.updated_at ?? updated?.updated_at ?? prev.updated_at,
      }));

      // Dispatch updates to Redux and invalidate caches to trigger UI re-renders immediately
      try {
        const pId = resolveproject_id(task);
        if (pId) {
          void dispatch(fetchProjectBoard(pId));
        }
      } catch (err) {
        console.warn("Failed to refetch project board", err);
      }

      try {
        void dispatch(fetchTaskById(task.id || (task as any)._id));
      } catch (err) {
        console.warn("Failed to refetch task details", err);
      }

      try {
        dispatch(invalidatePageCache({ resource: "tasks" }));
        dispatch(
          invalidateDetailItemCache({
            resource: "tasks",
            id: task.id || (task as any)._id,
          }),
        );
      } catch (err) {
        console.warn("Failed to invalidate cache", err);
      }

      toast.success("Task updated", { id: loadingId });
      setIsEditing(false);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("handleSave error", e);
      toast.error(errMsg, { id: loadingId });
    } finally {
      setIsSaving(false);
      try {
        toast.dismiss(loadingId);
      } catch {}
    }
  };

  const handleCancel = () => {
    setEditedTask(taskToEditable(task));
    setIsEditing(false);
  };

  // Try to extract owner/repo from common GitHub URLs (api.github.com or github.com)
  const extractOwnerRepoFromUrl = (
    url?: string,
  ): { owner: string; repo: string } | null => {
    if (!url || typeof url !== "string") return null;
    try {
      // api.github.com/repos/:owner/:repo/...(issues|pulls)
      const apiMatch = url.match(
        /api\.github\.com\/repos\/([^\/]+)\/([^\/]+)/i,
      );
      if (apiMatch) return { owner: apiMatch[1], repo: apiMatch[2] };

      // github.com/:owner/:repo/(pull|issues|blob|tree)
      const webMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
      if (webMatch) return { owner: webMatch[1], repo: webMatch[2] };
    } catch {}
    return null;
  };

  // Robustly resolve a project id from a task object that may have different shapes
  const resolveproject_id = (t: unknown): string | undefined => {
    if (!t || typeof t !== "object") return undefined;
    const obj = t as Record<string, unknown>;
    // common fields used across codebase/backends
    if (
      obj.project_id &&
      (typeof obj.project_id === "string" || typeof obj.project_id === "number")
    )
      return String(obj.project_id);
    if (
      obj.project_id &&
      (typeof obj.project_id === "string" || typeof obj.project_id === "number")
    )
      return String(obj.project_id);
    if (
      obj.project &&
      (typeof obj.project === "string" || typeof obj.project === "number")
    )
      return String(obj.project);
    // nested project object { _id: '...' } or { id: '...' }
    if (obj.project && typeof obj.project === "object") {
      const p = obj.project as Record<string, unknown>;
      if (p._id && (typeof p._id === "string" || typeof p._id === "number"))
        return String(p._id);
      if (p.id && (typeof p.id === "string" || typeof p.id === "number"))
        return String(p.id);
    }
    // fallback: task._id used as project id in some payloads (unlikely but safe)
    if (obj._id && (typeof obj._id === "string" || typeof obj._id === "number"))
      return String(obj._id);
    return undefined;
  };

  const handleSyncCommits = async () => {
    if (syncing) return;
    const project_id = resolveproject_id(task);
    if (!project_id) {
      toast.error(
        "Project ID not available on this task. Ensure the task is linked to a project (project_id/project_id).\nIf you think this is an error, open the task and set its project.",
      );
      return;
    }

    // Try to infer from linked pull request URL
    let owner: string | undefined;
    let repo: string | undefined;
    // First try to use the logged-in user's configured GitHub username (student setup)
    try {
      const configured = mongoUser?.socialLinks?.github;
      const fromProfile = configured ? extractGitHubUsername(configured) : null;
      if (fromProfile) {
        owner = fromProfile;
      }
    } catch {}

    try {
      const linked = (task as unknown as { linked_pull_request?: unknown })
        .linked_pull_request as unknown;
      if (linked && typeof linked === "object" && linked !== null) {
        const lp = linked as Record<string, unknown>;
        const pr = lp.pull_request as Record<string, unknown> | undefined;
        if (pr && typeof pr.url === "string") {
          const parsed = extractOwnerRepoFromUrl(pr.url);
          if (parsed) {
            owner = parsed.owner;
            repo = parsed.repo;
          }
        }
        if ((!owner || !repo) && pr && typeof pr.html_url === "string") {
          const parsed = extractOwnerRepoFromUrl(pr.html_url);
          if (parsed) {
            owner = parsed.owner;
            repo = parsed.repo;
          }
        }
      }
    } catch {
      // ignore
    }

    // If owner still missing, prompt the user for username (fallback)
    if (!owner) {
      owner = window.prompt(
        "Enter repository owner / GitHub username (e.g. octocat)",
      );
    }

    // NOTE: Do NOT prompt for repository name here. If `repo` is undefined
    // we will treat that as an instruction to sync all repositories for the
    // specified username (the backend should support this behavior).

    // Backend requires `repo` as a query param; prompt if we couldn't infer it.
    if (!repo) {
      repo = window.prompt("Enter repository name (e.g. my-repo)") || undefined;
    }

    if (!owner || !repo) {
      toast.error("Sync aborted: missing GitHub username or repository");
      return;
    }

    setSyncing(true);
    const loadingId = toast.loading("Syncing commits...");

    try {
      // Backend endpoint validates `username` and `repo` as required query params.
      const url = `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(String(project_id))}/sync-commits?username=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;

      const res = await queueAwareFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        let errText = `Sync failed: ${res.status}`;
        try {
          const raw = await res.text().catch(() => "");
          try {
            const j = JSON.parse(raw);
            errText =
              (j as any)?.detail ||
              (j as any)?.message ||
              JSON.stringify(j) ||
              errText;
          } catch {
            errText = raw || errText;
          }
        } catch {}
        toast.error(errText, { id: loadingId });
        return;
      }

      const body = await res.json().catch(() => null);

      if (isQueueResponse(body)) {
        toast.success("Sync is in progress. Please wait a moment and refresh.", { id: loadingId });
        return;
      }

      const msg =
        body && typeof body === "object" && (body as any)?.message
          ? String((body as any).message)
          : "Sync complete";
      toast.success(msg, { id: loadingId });

      // Allow project pages to refresh synced commits immediately.
      try {
        window.dispatchEvent(
          new CustomEvent("kiyo:project-commits-synced", {
            detail: { project_id: String(project_id) },
          }),
        );
      } catch {}
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Sync failed: ${errMsg}`, { id: loadingId });
    } finally {
      setSyncing(false);
    }
  };

  // Commit selection dialog state
  const [isCommitDialogOpen, setIsCommitDialogOpen] = React.useState(false);
  const [repos, setRepos] = React.useState<
    Array<{ name: string; full_name?: string }>
  >([]);
  const [loadingRepos, setLoadingRepos] = React.useState(false);
  const [loadingCommitsFor, setLoadingCommitsFor] = React.useState<
    string | null
  >(null);
  const [repoCommits, setRepoCommits] = React.useState<
    Record<
      string,
      Array<{ sha: string; message: string; author?: string; date?: string }>
    >
  >({});
  const [selectedShas, setSelectedShas] = React.useState<
    Record<string, Set<string>>
  >({});
  const [lastGitHubRequestUrl, setLastGitHubRequestUrl] = React.useState<
    string | null
  >(null);
  const [lastGitHubRequestError, setLastGitHubRequestError] = React.useState<
    string | null
  >(null);

  const openCommitDialog = async () => {
    // Prefill owner from profile or parse PR
    let owner = mongoUser?.socialLinks?.github
      ? extractGitHubUsername(mongoUser.socialLinks.github)
      : undefined;
    if (!owner) {
      // try parse from linked PR
      try {
        const linked = (task as unknown as { linked_pull_request?: unknown })
          .linked_pull_request as unknown;
        if (linked && typeof linked === "object") {
          const lp = linked as Record<string, unknown>;
          const pr = lp.pull_request as Record<string, unknown> | undefined;
          const url =
            typeof pr?.html_url === "string"
              ? pr.html_url
              : typeof pr?.url === "string"
                ? pr.url
                : typeof lp["url"] === "string"
                  ? (lp["url"] as string)
                  : undefined;
          const parsed = extractOwnerRepoFromUrl(
            typeof url === "string" ? url : undefined,
          );
          if (parsed) owner = parsed.owner;
        }
      } catch {}
    }

    if (!owner) {
      console.debug(
        "openCommitDialog: mongoUser.socialLinks.github =",
        mongoUser?.socialLinks?.github,
      );
      toast.error(
        `GitHub username not found in profile or task. Please set up GitHub in your profile. Found: ${mongoUser?.socialLinks?.github ?? "none"}`,
      );
      return;
    }

    // compute expected URL and show immediately
    const expectedUrl = `/api/github/user?username=${encodeURIComponent(owner)}`;
    setLastGitHubRequestUrl(expectedUrl);
    setLastGitHubRequestError(null);
    setLoadingRepos(true);
    setIsCommitDialogOpen(true);

    const fetchRepos = async (ownerToFetch: string) => {
      try {
        setLastGitHubRequestError(null);
        const url = `/api/github/user?username=${encodeURIComponent(ownerToFetch)}`;
        setLastGitHubRequestUrl(url);
        console.debug("Fetching GitHub user URL:", url);
        const res = await fetch(url);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          console.error("GitHub user API error", res.status, errJson);
          const errMsg = errJson.error || `HTTP ${res.status}`;
          setLastGitHubRequestError(errMsg);
          throw new Error(errMsg);
        }
        const data = await res.json();
        const list = Array.isArray(data.repositories)
          ? data.repositories
          : data.repos || data.repositories || [];
        const normalized = (list as unknown[]).map((r) => {
          const obj = r as Record<string, unknown>;
          const name = String(obj.name ?? obj.repo ?? "");
          const full_name = String(
            obj.full_name ?? obj.full_name ?? `${ownerToFetch}/${name}`,
          );
          return { name, full_name };
        });
        setRepos(normalized);
      } catch (err) {
        console.error("Failed to load repos for commit selection", err);
        setLastGitHubRequestError(
          err instanceof Error ? err.message : String(err),
        );
        toast.error(
          "Failed to load repositories for this user. Check console for details",
        );
      } finally {
        setLoadingRepos(false);
      }
    };

    // Trigger initial fetch
    fetchRepos(owner).catch(() => {});
  };

  const loadCommitsForRepo = async (repoName: string) => {
    const owner = mongoUser?.socialLinks?.github
      ? extractGitHubUsername(mongoUser.socialLinks.github)
      : undefined;
    if (!owner) {
      toast.error("GitHub username not configured");
      return;
    }
    setLoadingCommitsFor(repoName);
    try {
      const res = await fetch(
        `/api/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&per_page=30`,
      );
      if (!res.ok) throw new Error("Failed to fetch commits");
      const data = await res.json();
      const commits = Array.isArray(data) ? data : data.commits || [];
      const normalized = (commits as unknown[]).map((c) => {
        const obj = c as Record<string, unknown>;
        const sha = String(
          obj.sha ?? obj.id ?? (obj.tree as Record<string, unknown>)?.sha ?? "",
        );
        const commitObj = obj.commit as Record<string, unknown> | undefined;
        const commitAuthor = commitObj?.author as
          | Record<string, unknown>
          | undefined;
        const commitCommitter = commitObj?.committer as
          | Record<string, unknown>
          | undefined;
        const message = String(commitObj?.message ?? obj.message ?? "");
        const author = String(
          commitAuthor?.name ??
            (obj.author as Record<string, unknown>)?.login ??
            "",
        );
        const date = String(commitAuthor?.date ?? commitCommitter?.date ?? "");
        return { sha, message, author, date };
      });
      setRepoCommits((prev) => ({ ...prev, [repoName]: normalized }));
      setSelectedShas((prev) => ({ ...prev, [repoName]: new Set<string>() }));
    } catch (e) {
      console.error("Failed to load commits for", repoName, e);
      toast.error(`Failed to load commits for ${repoName}`);
    } finally {
      setLoadingCommitsFor(null);
    }
  };

  const toggleCommitSelection = (repoName: string, sha: string) => {
    setSelectedShas((prev) => {
      const copy: Record<string, Set<string>> = { ...prev };
      const existing = prev[repoName] || new Set<string>();
      const nextSet = new Set<string>(existing);
      if (nextSet.has(sha)) nextSet.delete(sha);
      else nextSet.add(sha);
      copy[repoName] = nextSet;
      console.debug("toggleCommitSelection", {
        repoName,
        sha,
        nextSet: Array.from(nextSet),
      });
      return copy;
    });
  };

  const handleSyncSelectedCommits = async () => {
    const project_id = resolveproject_id(task);
    if (!project_id) {
      toast.error(
        "Project ID missing. Please link this task to a project before syncing commits.",
      );
      return;
    }

    // Determine which repos have selected commits. Backend sync is per-repo.
    const owner = mongoUser?.socialLinks?.github
      ? extractGitHubUsername(mongoUser.socialLinks.github)
      : undefined;
    if (!owner) {
      toast.error("GitHub username not configured");
      return;
    }

    const reposToSync = Object.keys(selectedShas).filter((repoName) => {
      const set = selectedShas[repoName];
      return set && set.size > 0;
    });

    if (reposToSync.length === 0) {
      toast.error("Please select at least one commit to sync");
      return;
    }

    const loadingId = toast.loading("Syncing selected commits...");
    try {
      const errors: string[] = [];
      const successMessages: string[] = [];

      for (const repoName of reposToSync) {
        const shas = Array.from(selectedShas[repoName] || []);
        const url = `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(String(project_id))}/sync-selected-commits?username=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}`;
        const res = await queueAwareFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shas }),
        });

        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          let err = `Sync failed for ${repoName}: ${res.status}`;
          try {
            const j = JSON.parse(raw);
            err =
              (j as any)?.detail ||
              (j as any)?.message ||
              JSON.stringify(j) ||
              err;
          } catch {
            err = raw || err;
          }
          errors.push(err);
        } else {
          const body = await res.json().catch(() => null);

          if (isQueueResponse(body)) {
            errors.push(`Sync still processing for ${repoName}`);
            continue;
          }

          const msg =
            body && typeof body === "object" && (body as any)?.message
              ? String((body as any).message)
              : "Sync complete";
          successMessages.push(msg);
        }
      }

      if (errors.length > 0) {
        toast.error(errors[0], { id: loadingId });
        return;
      }

      const finalMessage =
        reposToSync.length === 1
          ? successMessages[0] || "Sync complete"
          : "Sync complete";
      toast.success(finalMessage, { id: loadingId });

      try {
        window.dispatchEvent(
          new CustomEvent("kiyo:project-commits-synced", {
            detail: { project_id: String(project_id) },
          }),
        );
      } catch {}
      setIsCommitDialogOpen(false);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("handleSyncSelectedCommits error", e);
      toast.error(`Failed to sync selected commits: ${errMsg}`, {
        id: loadingId,
      });
    }
  };

  return (
    <div className="px-6 py-8 md:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
          Task Details
        </h3>
        <div className="flex items-center gap-2">
          {!isStudent &&
            (!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm">
                Edit Task
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" disabled={isSaving}>
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            ))}

          {isStudent && (
            <>
              <Dialog
                open={isCommitDialogOpen}
                onOpenChange={(open) => {
                  setIsCommitDialogOpen(open);
                  if (open) {
                    // kick off the repo fetch when the dialog opens
                    void openCommitDialog();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <GitBranch className="mr-2 h-3 w-3" />
                    Sync Commits
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Select commits to sync</DialogTitle>
                    <DialogDescription>
                      Choose commits across your repositories to sync to this
                      project.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 mt-2">
                    {loadingRepos ? (
                      <div className="text-sm text-slate-500">
                        Loading repositories...
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-auto">
                        {repos.length === 0 ? (
                          <div className="text-sm text-slate-500">
                            <div>No repositories found.</div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const redirectPath = task.project_id
                                    ? `/user/projects/${task.project_id}/board/tasks/${task.id}`
                                    : `/user/tasks/${task.id}`;
                                  window.location.href = `/api/github/oauth/start?redirect=${encodeURIComponent(redirectPath)}`;
                                }}
                              >
                                Connect GitHub
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  window.location.href =
                                    "/user/profile/personal";
                                }}
                              >
                                Set GitHub in profile
                              </Button>
                            </div>
                            <div className="mt-3 text-xs text-rose-600">
                              <div>
                                Debug: detected GitHub profile value:{" "}
                                {mongoUser?.socialLinks?.github ?? "none"}
                              </div>
                              <div>
                                Request URL: {lastGitHubRequestUrl ?? "n/a"}
                              </div>
                              {lastGitHubRequestError && (
                                <div>Error: {lastGitHubRequestError}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          repos.map((r) => (
                            <div
                              key={r.full_name || r.name}
                              className="border rounded p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">
                                  {r.full_name || r.name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => loadCommitsForRepo(r.name)}
                                    disabled={loadingCommitsFor === r.name}
                                  >
                                    {loadingCommitsFor === r.name
                                      ? "Loading..."
                                      : "Load commits"}
                                  </Button>
                                </div>
                              </div>

                              {repoCommits[r.name] && (
                                <div className="mt-2 space-y-2">
                                  {repoCommits[r.name].map((c) => (
                                    <label
                                      key={c.sha}
                                      className="flex items-start gap-2"
                                    >
                                      <input
                                        type="checkbox"
                                        data-repo={r.name}
                                        data-sha={c.sha}
                                        checked={Boolean(
                                          selectedShas[r.name] &&
                                          selectedShas[r.name].has(c.sha),
                                        )}
                                        onChange={() =>
                                          toggleCommitSelection(r.name, c.sha)
                                        }
                                        className="mt-1"
                                      />
                                      <div className="text-sm">
                                        <div className="font-medium">
                                          {c.message || c.sha}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {c.author} —{" "}
                                          {c.date
                                            ? new Date(c.date).toLocaleString()
                                            : ""}
                                        </div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {/* selection debug removed */}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCommitDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSyncCommits}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Sync All
                        </>
                      ) : (
                        "Sync All"
                      )}
                    </Button>
                    <Button onClick={handleSyncSelectedCommits}>
                      Sync Selected
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">Title</Label>
        {isEditing ? (
          <Input
            id="title"
            value={editedTask.title}
            onChange={(e) =>
              setEditedTask({ ...editedTask, title: e.target.value })
            }
          />
        ) : (
          <div className="p-2 font-semibold text-sm text-zinc-950 dark:text-[#F5F5F5]">{task.title}</div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">Description</Label>
        {isEditing ? (
          <Textarea
            id="description"
            value={editedTask.description}
            onChange={(e) =>
              setEditedTask({ ...editedTask, description: e.target.value })
            }
            rows={4}
          />
        ) : (
          <div className="p-2 text-sm text-zinc-700 dark:text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">
            {task.description}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">Status</Label>
          {isEditing ? (
            <Select
              value={editedTask.status}
              onValueChange={(value) =>
                setEditedTask({ ...editedTask, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Backlog">Backlog</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
                <SelectItem value="Stuck">Stuck</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="text-xs font-semibold border-zinc-200 dark:border-[#26272B] bg-zinc-100 dark:bg-[#111214] text-zinc-800 dark:text-[#F5F5F5]">{task.status}</Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">Priority</Label>
          {isEditing ? (
            <Select
              value={editedTask.priority}
              onValueChange={(value) =>
                setEditedTask({
                  ...editedTask,
                  priority: value as "high" | "medium" | "low",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="w-fit text-xs font-semibold border-zinc-200 dark:border-[#26272B] bg-zinc-100 dark:bg-[#111214] text-zinc-800 dark:text-[#F5F5F5]">
              <Flag className="mr-1 h-3 w-3" />
              {task.priority}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_date" className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">Due Date</Label>
        {isEditing ? (
          <DatePicker
            value={editedTask.due_date}
            onChange={(val) =>
              setEditedTask({ ...editedTask, due_date: val })
            }
          />
        ) : (
          <div className="flex items-center gap-2 p-2">
            <Calendar className="h-4 w-4 text-zinc-400 dark:text-[#71717A]" />
            <span className="text-sm font-medium text-zinc-700 dark:text-[#A1A1AA]">{formatDate(task.due_date)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">Assignee</Label>
        <div className="flex items-center gap-3 p-2">
          <AssignedUser task_id={task.id} fallback={task.assignee} size="md" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA] uppercase tracking-wider">Tags</Label>
        <div className="flex flex-wrap gap-2">
          {task?.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-zinc-100 dark:bg-[#17181C] text-zinc-800 dark:text-[#F5F5F5] border border-zinc-200 dark:border-[#26272B]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200/60 dark:border-[#1E1F23]">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-500 dark:text-[#71717A]">Created:</span>
            <div className="font-semibold text-zinc-800 dark:text-[#F5F5F5] mt-0.5">
              {(() => {
                const d = new Date(task.created_at as any);
                return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
              })()}
            </div>
          </div>
          {task.completed_at && (
            <div>
              <span className="text-zinc-500 dark:text-[#71717A]">Completed:</span>
              <div className="font-semibold text-zinc-800 dark:text-[#F5F5F5] mt-0.5">
                {(() => {
                  const d = new Date(task.completed_at as any);
                  return Number.isNaN(d.getTime())
                    ? "—"
                    : d.toLocaleDateString();
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
