import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  GitPullRequest,
  ExternalLink,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { PLANNER_AGENT_URL } from "@/utils/API_URL";
import { convertToGitHubWebUrl, validateGitHubPRUrl } from "@/lib/github";
import { normalizeTaskWorkflowStatus } from "@/lib/taskWorkflow";

interface pull_request {
  id: string;
  title: string;
  description: string;
  url: string;
  branch: string;
  status: "open" | "closed" | "merged";
  created_at: string;
  author: string;
  comments_count: number;
}

interface TaskPRTabProps {
  task_id: string;
  project_id: string;
  taskStatus?: string;
  subTasks?: Array<{ completed?: boolean; is_deleted?: boolean }>;
  isAdminOrOwner?: boolean;
  linkedPR?: any;
  onAcceptPR?: () => void;
  onRejectPR?: () => void;
  onPRSubmitted?: () => void;
}

export function TaskPRTab({
  task_id,
  project_id,
  taskStatus,
  subTasks = [],
  isAdminOrOwner = false,
  linkedPR,
  onAcceptPR,
  onRejectPR,
  onPRSubmitted,
}: TaskPRTabProps) {
  const [prUrl, setPrUrl] = useState("");
  const [prBranch, setPrBranch] = useState("");
  const [prDescription, setPrDescription] = useState("");
  const [pull_requests, setpull_requests] = useState<pull_request[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectRepo, setProjectRepo] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<{
    status: "idle" | "valid" | "invalid";
    message: string;
  }>({
    status: "idle",
    message: "",
  });
  const [isEditingPR, setIsEditingPR] = useState(false);
  const [editPrUrl, setEditPrUrl] = useState("");
  const [editPrBranch, setEditPrBranch] = useState("");
  const [editPrDescription, setEditPrDescription] = useState("");
  const [editUrlValidation, setEditUrlValidation] = useState<{
    status: "idle" | "valid" | "invalid";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

  const visibleSubTasks = Array.isArray(subTasks)
    ? subTasks.filter((st) => !st?.is_deleted)
    : [];
  const completedVisibleSubTasks = visibleSubTasks.filter((st) =>
    Boolean(st?.completed),
  ).length;
  const allSubTasksCompleted =
    visibleSubTasks.length === 0 ||
    completedVisibleSubTasks === visibleSubTasks.length;
  const isProgressState =
    normalizeTaskWorkflowStatus(taskStatus) === "in-progress";
  const canRevealSubmitPR = isProgressState && allSubTasksCompleted;

  const normalizeRepoIdentifier = (value: string | null | undefined) => {
    if (!value) return "";
    const trimmed = value.trim().replace(/\.git$/i, "");
    const repoMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (repoMatch) {
      return `${repoMatch[1]}/${repoMatch[2]}`.toLowerCase();
    }
    const shorthandMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
    if (shorthandMatch) {
      return `${shorthandMatch[1]}/${shorthandMatch[2]}`.toLowerCase();
    }
    return trimmed.toLowerCase();
  };

  const handleValidateUrl = () => {
    const trimmed = prUrl.trim();
    if (!trimmed) {
      setUrlValidation({
        status: "invalid",
        message: "Please enter a GitHub pull request URL.",
      });
      return false;
    }

    const validation = validateGitHubPRUrl(trimmed);
    if (!validation.isValid || !validation.owner || !validation.repo) {
      setUrlValidation({
        status: "invalid",
        message: validation.error || "Invalid GitHub pull request URL.",
      });
      return false;
    }

    if (
      projectRepo &&
      normalizeRepoIdentifier(`${validation.owner}/${validation.repo}`) !==
        normalizeRepoIdentifier(projectRepo)
    ) {
      setUrlValidation({
        status: "invalid",
        message: `Use a PR from the linked repository: ${projectRepo}`,
      });
      return false;
    }

    setUrlValidation({
      status: "valid",
      message: "URL is valid.",
    });
    return true;
  };

  const handleValidateEditUrl = () => {
    const trimmed = editPrUrl.trim();
    if (!trimmed) {
      setEditUrlValidation({
        status: "invalid",
        message: "Please enter a GitHub pull request URL.",
      });
      return false;
    }

    const validation = validateGitHubPRUrl(trimmed);
    if (!validation.isValid || !validation.owner || !validation.repo) {
      setEditUrlValidation({
        status: "invalid",
        message: validation.error || "Invalid GitHub pull request URL.",
      });
      return false;
    }

    if (
      projectRepo &&
      normalizeRepoIdentifier(`${validation.owner}/${validation.repo}`) !==
        normalizeRepoIdentifier(projectRepo)
    ) {
      setEditUrlValidation({
        status: "invalid",
        message: `Use a PR from the linked repository: ${projectRepo}`,
      });
      return false;
    }

    setEditUrlValidation({
      status: "valid",
      message: "URL is valid.",
    });
    return true;
  };

  const startEditPR = () => {
    if (linkedPR && linkedPR.pull_request) {
      setEditPrUrl(linkedPR.pull_request.url || "");
      setEditPrBranch(linkedPR.pull_request.branch || "");
      setEditPrDescription(linkedPR.pull_request.description || "");
      setEditUrlValidation({ status: "idle", message: "" });
      setIsEditingPR(true);
    }
  };

  const handleUpdatePR = async () => {
    if (!editPrUrl.trim() || !editPrBranch.trim()) {
      toast.error("Please enter both PR URL and branch name");
      return;
    }

    if (!handleValidateEditUrl()) {
      toast.error("Please verify the PR URL first.");
      return;
    }

    const normalizedUrl =
      convertToGitHubWebUrl(editPrUrl.trim()) || editPrUrl.trim();

    try {
      setLoading(true);
      const response = await fetch(`/api/task/${encodeURIComponent(task_id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linked_pr_id: normalizedUrl,
          pr_details: {
            url: normalizedUrl,
            branch: editPrBranch.trim(),
            status: "open",
            body: editPrDescription.trim(),
          },
          feedback_status: "pending",
        }),
      });

      const data = await response.json();

      if (response.ok && !data?.error) {
        toast.success("Pull request updated successfully!");
        setIsEditingPR(false);
        fetchpull_requests(); // Refresh the list
        onPRSubmitted?.();
      } else {
        toast.error(data.error || "Failed to update pull request");
      }
    } catch (error) {
      console.error("Error updating pull request:", error);
      toast.error("Failed to update pull request");
    } finally {
      setLoading(false);
    }
  };

  const fetchpull_requests = useCallback(async () => {
    try {
      setLoading(true);
      // Use both task_id and project_id in the API call
      const response = await fetch(
        `/api/pull-request?task_id=${task_id}&project_id=${project_id}`,
      );
      const data = await response.json();

      if (data.success) {
        // Map backend objects to our pull_request interface
        const mappedPrs = (data.prs || []).map((pr: any) => ({
          id: pr._id,
          title:
            pr.pull_request?.title ||
            pr.pull_request?.url.split("/").pop() ||
            "Untitled PR",
          description: pr.pull_request?.description || "",
          url: pr.pull_request?.url || "",
          branch: pr.pull_request?.branch || "main",
          status: pr.pull_request?.status || "open",
          created_at: pr.submitted_at || new Date().toISOString(),
          author: pr.user_id?.full_name || "Unknown User",
          comments_count: 0,
        }));
        setpull_requests(mappedPrs);
      }
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      toast.error("Failed to fetch pull requests");
    } finally {
      setLoading(false);
    }
  }, [task_id, project_id]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get(
          `${PLANNER_AGENT_URL}/projects/${project_id}`,
        );
        const p = res.data.project || res.data;
        if (p?.github_repository) {
          setProjectRepo(p.github_repository);
        }
      } catch (err) {
        console.error("Failed to fetch project for PR tab", err);
      }
    };
    fetchProject();
    fetchpull_requests();
  }, [fetchpull_requests, project_id]);

  const handleSubmitPR = async () => {
    if (!prUrl.trim() || !prBranch.trim()) {
      toast.error("Please enter both PR URL and branch name");
      return;
    }

    if (!handleValidateUrl()) {
      toast.error("Please verify the PR URL first.");
      return;
    }

    const normalizedUrl = convertToGitHubWebUrl(prUrl.trim()) || prUrl.trim();

    try {
      setLoading(true);
      const response = await fetch(`/api/task/${encodeURIComponent(task_id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linked_pr_id: normalizedUrl,
          pr_details: {
            url: normalizedUrl,
            branch: prBranch.trim(),
            status: "open",
            body: prDescription.trim(),
          },
          status: "in-progress",
          feedback_status: "pending",
        }),
      });

      const data = await response.json();

      if (response.ok && !data?.error) {
        toast.success(
          "Pull request linked. Code review started; task will move to Submitted once review is ready.",
        );
        setPrUrl("");
        setPrBranch("");
        setPrDescription("");
        setUrlValidation({ status: "idle", message: "" });
        fetchpull_requests(); // Refresh the list
        onPRSubmitted?.();
      } else {
        toast.error(data.error || "Failed to submit pull request");
      }
    } catch (error) {
      console.error("Error submitting pull request:", error);
      toast.error("Failed to submit pull request");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "merged":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // For admin/owner, show the approval interface instead of submission form
  if (isAdminOrOwner) {
    return (
      <div className="p-6 space-y-6">
        {linkedPR ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5" />
                Linked Pull Request
              </CardTitle>
              <CardDescription>
                Review and approve or reject the submitted pull request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={getStatusColor(
                          linkedPR.pull_request?.status || "open",
                        )}
                      >
                        {(
                          linkedPR.pull_request?.status || "open"
                        ).toUpperCase()}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-foreground mb-2">
                      <a
                        href={linkedPR.pull_request?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {linkedPR.pull_request?.title ||
                          linkedPR.pull_request?.url}
                      </a>
                    </h4>
                    {linkedPR.pull_request?.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {linkedPR.pull_request?.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {linkedPR.pull_request?.branch && (
                        <div className="flex items-center gap-1">
                          <GitPullRequest className="h-3 w-3" />
                          {linkedPR.pull_request?.branch}
                        </div>
                      )}
                      {linkedPR.submitted_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(linkedPR.submitted_at)}
                        </div>
                      )}
                      {linkedPR.user_id && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {typeof linkedPR.user_id === "object"
                            ? linkedPR.user_id?.full_name || "Unknown"
                            : linkedPR.user_id}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a
                      href={linkedPR.pull_request?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open pull request in GitHub"
                      title="Open pull request in GitHub"
                    >
                      <span className="sr-only">Open pull request</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Accept/Reject Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={onAcceptPR}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Accept
                </Button>
                <Button
                  onClick={onRejectPR}
                  variant="destructive"
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Pull Request Linked
              </h3>
              <p className="text-sm text-muted-foreground">
                Waiting for the team member to submit a pull request for review.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Show linked PR display with edit option when PR is linked */}
      {linkedPR && !isEditingPR && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5" />
                Linked Pull Request
              </CardTitle>
              <CardDescription>
                Your submitted pull request for code review
              </CardDescription>
            </div>
            {taskStatus !== "completed" && (
              <Button
                onClick={startEditPR}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Edit PR
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      className={getStatusColor(
                        linkedPR.pull_request?.status || "open",
                      )}
                    >
                      {(linkedPR.pull_request?.status || "open").toUpperCase()}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-foreground mb-2">
                    <a
                      href={linkedPR.pull_request?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {linkedPR.pull_request?.title ||
                        linkedPR.pull_request?.url}
                    </a>
                  </h4>
                  {linkedPR.pull_request?.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {linkedPR.pull_request?.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {linkedPR.pull_request?.branch && (
                      <div className="flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" />
                        {linkedPR.pull_request?.branch}
                      </div>
                    )}
                    {linkedPR.submitted_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(linkedPR.submitted_at)}
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <a
                    href={linkedPR.pull_request?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open pull request in GitHub"
                    title="Open pull request in GitHub"
                  >
                    <span className="sr-only">Open pull request</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit PR Form */}
      {isEditingPR && linkedPR && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              Edit Pull Request
            </CardTitle>
            <CardDescription>Update your pull request details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pr-url">Pull Request URL</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-pr-url"
                  placeholder="https://github.com/username/repo/pull/123"
                  value={editPrUrl}
                  onChange={(e) => {
                    setEditPrUrl(e.target.value);
                    setEditUrlValidation({ status: "idle", message: "" });
                  }}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidateEditUrl}
                  disabled={loading || !editPrUrl.trim()}
                >
                  Check URL
                </Button>
              </div>
              {editUrlValidation.status !== "idle" && (
                <p
                  className={`text-sm font-medium ${
                    editUrlValidation.status === "valid"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {editUrlValidation.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pr-branch">Branch Name</Label>
              <Input
                id="edit-pr-branch"
                placeholder="feature/task-implementation"
                value={editPrBranch}
                onChange={(e) => setEditPrBranch(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pr-description">
                Description (Optional)
              </Label>
              <Textarea
                id="edit-pr-description"
                placeholder="Brief description of the changes made..."
                value={editPrDescription}
                onChange={(e) => setEditPrDescription(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleUpdatePR}
                disabled={
                  loading ||
                  !editPrUrl.trim() ||
                  !editPrBranch.trim() ||
                  editUrlValidation.status !== "valid"
                }
              >
                {loading ? "Updating..." : "Save Changes"}
              </Button>
              <Button
                onClick={() => setIsEditingPR(false)}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit New PR - only show if no PR linked yet */}
      {!linkedPR && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              Submit Pull Request
            </CardTitle>
            <CardDescription>
              Link your code contribution to this task by submitting a pull
              request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canRevealSubmitPR && (
              <div className="text-sm border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-3 rounded-md">
                {isProgressState
                  ? `Complete all subtasks (${completedVisibleSubTasks}/${visibleSubTasks.length}) to unlock PR submission.`
                  : "PR submission is available only when the task is in Progress."}
              </div>
            )}
            {projectRepo && (
              <div className="text-sm border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-3 rounded-md mb-4 flex items-center gap-2">
                <GitPullRequest className="h-4 w-4" />
                <span>
                  You must submit a pull request from the linked repository:{" "}
                  <strong>{projectRepo}</strong>
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pr-url">Pull Request URL</Label>
              <div className="flex gap-2">
                <Input
                  id="pr-url"
                  placeholder="https://github.com/username/repo/pull/123"
                  value={prUrl}
                  onChange={(e) => {
                    setPrUrl(e.target.value);
                    setUrlValidation({ status: "idle", message: "" });
                  }}
                  disabled={loading || !canRevealSubmitPR}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidateUrl}
                  disabled={loading || !prUrl.trim() || !canRevealSubmitPR}
                >
                  Check URL
                </Button>
              </div>
              {urlValidation.status !== "idle" && (
                <p
                  className={`text-sm font-medium ${
                    urlValidation.status === "valid"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {urlValidation.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-branch">Branch Name</Label>
              <Input
                id="pr-branch"
                placeholder="feature/task-implementation"
                value={prBranch}
                onChange={(e) => setPrBranch(e.target.value)}
                disabled={loading || !canRevealSubmitPR}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-description">Description (Optional)</Label>
              <Textarea
                id="pr-description"
                placeholder="Brief description of the changes made..."
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                disabled={loading || !canRevealSubmitPR}
                rows={3}
              />
            </div>
            <Button
              onClick={handleSubmitPR}
              disabled={
                loading ||
                !canRevealSubmitPR ||
                !prUrl.trim() ||
                !prBranch.trim() ||
                urlValidation.status !== "valid"
              }
            >
              {loading ? "Submitting..." : "Submit Pull Request"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pull Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Pull Requests</CardTitle>
          <CardDescription>
            All pull requests associated with this task
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && pull_requests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading pull requests...</p>
            </div>
          ) : pull_requests.length === 0 ? (
            <div className="text-center py-8">
              <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pull requests yet</h3>
              <p className="text-sm text-muted-foreground">
                Submit your first pull request to start tracking your code
                contributions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pull_requests.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getStatusColor(pr.status)}>
                        {pr.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        #{pr.id.substring(0, 8)}
                      </span>
                    </div>
                    <h4 className="font-medium text-foreground mb-1 line-clamp-1">
                      {pr.title}
                    </h4>
                    {pr.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {pr.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {pr.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(pr.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {pr.comments_count} comments
                      </div>
                      <div className="flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" />
                        {pr.branch}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open pull request in GitHub"
                      title="Open pull request in GitHub"
                    >
                      <span className="sr-only">Open pull request</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TaskPRTab;
