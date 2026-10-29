import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Clock, User, ExternalLink, RefreshCw, Github } from 'lucide-react';
import { useSyncCommits } from '@/hooks/useSyncCommits';
import { toast } from 'react-hot-toast';

interface TaskGitHubTabProps {
  project_id: string;
}

export function TaskGitHubTab({ project_id }: TaskGitHubTabProps) {
  const [username, setUsername] = useState('');
  const [repo, setRepo] = useState('');
  const { syncCommits, getCommits, loading, error, data } = useSyncCommits();

  useEffect(() => {
    // Load existing commits when component mounts
    if (project_id) {
      getCommits(project_id).catch(console.error);
    }
  }, [project_id, getCommits]);

  const handleSyncCommits = async () => {
    if (!username.trim() || !repo.trim()) {
      toast.error('Please enter both username and repository name');
      return;
    }

    try {
      await syncCommits(project_id, username.trim(), repo.trim());
      toast.success('GitHub commits synchronized successfully!');
    } catch (err) {
      toast.error(error || 'Failed to sync commits');
      console.error('Sync error:', err);
    }
  };

  const handleRefreshCommits = async () => {
    if (!data?.data?.repository) {
      toast.error('No repository configured. Please sync first.');
      return;
    }

    const [repoUsername, repoName] = data.data.repository.split('/');
    try {
      await syncCommits(project_id, repoUsername, repoName);
      toast.success('Commits refreshed successfully!');
    } catch (err) {
      toast.error('Failed to refresh commits');
      console.error('Refresh error:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Repository Sync
          </CardTitle>
          <CardDescription>
            Connect this task to a GitHub repository to track commits and development progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">GitHub Username</Label>
              <Input
                id="username"
                placeholder="e.g., octocat"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo">Repository Name</Label>
              <Input
                id="repo"
                placeholder="e.g., Hello-World"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSyncCommits} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Sync Commits
                </>
              )}
            </Button>
            {data?.data?.repository && (
              <Button variant="outline" onClick={handleRefreshCommits} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Repository Status */}
      {data?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Repository Status</span>
              <Badge variant="secondary">{data.data.commitsCount} commits</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Repository:</span>
                <p className="font-mono">{data.data.repository || 'Not set'}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Last Sync:</span>
                <p>{data.data.lastSync ? formatDate(data.data.lastSync) : 'Never'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Commits List */}
      {data?.data?.commits && data.data.commits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Commits</CardTitle>
            <CardDescription>
              Latest commits{data.data.repository ? ` from ${data.data.repository}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.data.commits.slice(0, 10).map((commit) => (
                <div
                  key={commit._id || commit.commit_sha}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {String(commit.commit_sha || '').substring(0, 7)}
                      </span>
                      {commit.repo && commit.username ? (
                        <Badge variant="outline" className="text-xs">
                          <GitBranch className="h-3 w-3 mr-1" />
                          {commit.username}/{commit.repo}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                      {commit.message || commit.commit_sha}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {commit.author || 'Unknown'}
                      </div>
                      {commit.timestamp ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(commit.timestamp)}
                        </div>
                      ) : null}
                      {typeof commit.additions === 'number' && typeof commit.deletions === 'number' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">+{commit.additions}</span>
                          <span className="text-red-600">-{commit.deletions}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {commit.url ? (
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open commit in GitHub"
                        title="Open commit in GitHub"
                      >
                        <span className="sr-only">Open commit</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            {data.data.commits.length > 10 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Showing 10 of {data.data.commits.length} commits
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {data?.data && data.data.commits.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Github className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No commits found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The repository doesn&apos;t have any commits yet, or there was an issue fetching them.
            </p>
            <Button variant="outline" onClick={handleRefreshCommits} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TaskGitHubTab;