"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ExternalLink,
  RefreshCw,
  Search,
  Link2,
  Unlink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface JiraIssue {
  jira_issue_key: string;
  summary: string;
  status: string;
  priority: string;
  issue_type: string;
  assignee: string;
  reporter: string;
  labels: string[];
  sprint: string;
  jira_url: string;
  created_at: string;
  updated_at: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

interface TaskJiraIntegrationProps {
  taskId: string;
  projectKey?: string;
  currentIssueKey?: string | null;
  currentIssueUrl?: string | null;
  currentIssueSummary?: string | null;
  onLinked?: (issue: JiraIssue) => void;
  onUnlinked?: () => void;
}

export function TaskJiraIntegration({
  taskId,
  projectKey,
  currentIssueKey,
  currentIssueUrl,
  currentIssueSummary,
  onLinked,
  onUnlinked,
}: TaskJiraIntegrationProps) {
  const [activeTab, setActiveTab] = useState("issues");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(projectKey || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [linkedIssueKey, setLinkedIssueKey] = useState<string | null>(
    currentIssueKey || null
  );
  const [linkedIssueUrl, setLinkedIssueUrl] = useState<string | null>(
    currentIssueUrl || null
  );
  const [linkedIssueSummary, setLinkedIssueSummary] = useState<string | null>(
    currentIssueSummary || null
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchIssues();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/jira/projects");
      if (!response.ok) {
        throw new Error("Failed to fetch Jira projects");
      }
      const data = await response.json();
      setProjects(data.projects || []);
      if (data.projects?.length > 0 && !selectedProject) {
        setSelectedProject(data.projects[0].key);
      }
    } catch (err) {
      console.error("Error fetching Jira projects:", err);
    }
  };

  const fetchIssues = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        project_key: selectedProject,
        max_results: "50",
      });

      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/jira/issues?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Jira issues");
      }

      const data = await response.json();
      setIssues(data.issues || []);
    } catch (err) {
      console.error("Error fetching Jira issues:", err);
      toast.error("Failed to fetch Jira issues");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_key: selectedProject }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync Jira issues");
      }

      const data = await response.json();
      toast.success(`Synced ${data.synced} issues from Jira`);
      fetchIssues();
    } catch (err) {
      console.error("Error syncing Jira issues:", err);
      toast.error("Failed to sync Jira issues");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLink = async (issue: JiraIssue) => {
    try {
      const response = await fetch("/api/jira/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          jira_issue_key: issue.jira_issue_key,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to link Jira issue");
      }

      setLinkedIssueKey(issue.jira_issue_key);
      setLinkedIssueUrl(issue.jira_url);
      setLinkedIssueSummary(issue.summary);
      toast.success(`Linked ${issue.jira_issue_key}`);
      onLinked?.(issue);
    } catch (err) {
      console.error("Error linking Jira issue:", err);
      toast.error("Failed to link Jira issue");
    }
  };

  const handleUnlink = async () => {
    try {
      const response = await fetch("/api/jira/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!response.ok) {
        throw new Error("Failed to unlink Jira issue");
      }

      setLinkedIssueKey(null);
      setLinkedIssueUrl(null);
      setLinkedIssueSummary(null);
      toast.success("Unlinked Jira issue");
      onUnlinked?.();
    } catch (err) {
      console.error("Error unlinking Jira issue:", err);
      toast.error("Failed to unlink Jira issue");
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (statusFilter === "all") return true;
    return issue.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "highest":
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
      case "lowest":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "done":
      case "closed":
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in progress":
      case "in review":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "to do":
      case "open":
      case "new":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Jira Integration
          </CardTitle>
          <CardDescription>
            Link this task to a Jira issue for tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="issues" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Browse Issues
              </TabsTrigger>
              <TabsTrigger value="linked" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Linked Issue
              </TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="mt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.key} value={project.key}>
                        {project.name} ({project.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchIssues()}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="to do">To Do</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing || !selectedProject}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedProject
                    ? "No issues found. Try syncing from Jira."
                    : "Select a project to view issues."}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue) => (
                        <TableRow key={issue.jira_issue_key}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {issue.jira_issue_key}
                              {linkedIssueKey === issue.jira_issue_key && (
                                <Badge variant="secondary" className="text-xs">
                                  Linked
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {issue.summary}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getStatusColor(issue.status)}
                            >
                              {issue.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getPriorityColor(issue.priority)}
                            >
                              {issue.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{issue.issue_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <a
                                href={issue.jira_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              {linkedIssueKey === issue.jira_issue_key ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleUnlink}
                                  className="h-8 px-2 text-red-600 hover:text-red-700"
                                >
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLink(issue)}
                                  className="h-8 px-2"
                                >
                                  <Link2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="linked" className="mt-6">
              {linkedIssueKey ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {linkedIssueKey}
                        </span>
                        {linkedIssueUrl && (
                          <a
                            href={linkedIssueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      {linkedIssueSummary && (
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {linkedIssueSummary}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnlink}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Unlink
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No Jira issue linked to this task.</p>
                  <p className="text-sm mt-1">
                    Go to &quot;Browse Issues&quot; tab to link an issue.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default TaskJiraIntegration;
