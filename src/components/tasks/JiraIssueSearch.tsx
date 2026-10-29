"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Search, ExternalLink, Link2, Unlink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import toast from "react-hot-toast";

interface JiraIssue {
  jira_issue_key: string;
  summary: string;
  status: string;
  priority: string;
  issue_type: string;
  jira_url: string;
  project_key?: string;
  assignee?: string;
}

interface JiraIssueSearchProps {
  taskId: string;
  currentIssueKey?: string | null;
  currentIssueUrl?: string | null;
  currentIssueSummary?: string | null;
  projectKey?: string;
  onLinked?: (issue: JiraIssue) => void;
  onUnlinked?: () => void;
}

export function JiraIssueSearch({
  taskId,
  currentIssueKey,
  currentIssueUrl,
  currentIssueSummary,
  projectKey,
  onLinked,
  onUnlinked,
}: JiraIssueSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<JiraIssue[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const searchIssues = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (projectKey) {
          params.set("project_key", projectKey);
        }

        const response = await fetch(`/api/jira/search?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to search Jira");
        }

        const data = await response.json();
        setSearchResults(data.issues || []);
      } catch (err) {
        console.error("Error searching Jira:", err);
        toast.error("Failed to search Jira issues");
      } finally {
        setIsSearching(false);
      }
    },
    [projectKey]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchIssues(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchIssues]);

  const handleLink = async (issue: JiraIssue) => {
    setIsLinking(true);
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

      toast.success(`Linked ${issue.jira_issue_key}`);
      setIsOpen(false);
      onLinked?.(issue);
    } catch (err) {
      console.error("Error linking Jira issue:", err);
      toast.error("Failed to link Jira issue");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    setIsLinking(true);
    try {
      const response = await fetch("/api/jira/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!response.ok) {
        throw new Error("Failed to unlink Jira issue");
      }

      toast.success("Unlinked Jira issue");
      onUnlinked?.();
    } catch (err) {
      console.error("Error unlinking Jira issue:", err);
      toast.error("Failed to unlink Jira issue");
    } finally {
      setIsLinking(false);
    }
  };

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

  if (currentIssueKey) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {currentIssueKey}
            </span>
            {currentIssueUrl && (
              <a
                href={currentIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {currentIssueSummary && (
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 truncate">
              {currentIssueSummary}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUnlink}
          disabled={isLinking}
          className="h-8 px-2 text-blue-600 hover:text-red-600 dark:text-blue-400 dark:hover:text-red-400"
        >
          {isLinking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Unlink className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" />
          Link Jira Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Jira Issue</DialogTitle>
          <DialogDescription>
            Search for a Jira issue to link to this task.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by issue key or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {searchResults.map((issue) => (
                <div
                  key={issue.jira_issue_key}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleLink(issue)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{issue.jira_issue_key}</span>
                      <Badge variant="secondary" className={getPriorityColor(issue.priority)}>
                        {issue.priority}
                      </Badge>
                      {issue.issue_type && (
                        <Badge variant="outline">{issue.issue_type}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {issue.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {issue.status && (
                      <Badge variant="secondary">{issue.status}</Badge>
                    )}
                    <a
                      href={issue.jira_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No issues found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
