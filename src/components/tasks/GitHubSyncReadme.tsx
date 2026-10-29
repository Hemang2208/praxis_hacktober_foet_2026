import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, GitPullRequest, Code } from 'lucide-react';

export function GitHubSyncReadme() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">GitHub Commits Sync Integration</h1>
        <p className="text-muted-foreground">
          Complete integration for syncing GitHub commits with project tasks
        </p>
      </div>

      {/* API Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Endpoint
          </CardTitle>
          <CardDescription>
            The sync commits endpoint is now available
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            <div className="text-green-600 font-semibold">POST</div>
            <div>/api/v1/projects/{`{project_id}`}/sync-commits</div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="space-y-1 text-sm">
              <li><Badge variant="outline">username</Badge> - GitHub username (required)</li>
              <li><Badge variant="outline">repo</Badge> - Repository name (required)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Example Usage:</h4>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              {`POST /api/v1/projects/507f1f77bcf86cd799439011/sync-commits?username=octocat&repo=Hello-World`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Components Created */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Components Created
          </CardTitle>
          <CardDescription>
            New React components for GitHub integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">TaskGitHubTab</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Complete GitHub commits sync interface with repository configuration and commit display
              </p>
              <Badge variant="secondary">src/components/tasks/task-github-tab.tsx</Badge>
            </div>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">TaskGitIntegration</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Combined component with tabs for both GitHub and PR management
              </p>
              <Badge variant="secondary">src/components/tasks/task-git-integration.tsx</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hook Created */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Custom Hook
          </CardTitle>
          <CardDescription>
            React hook for managing GitHub sync operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">useSyncCommits</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Provides syncCommits() and getCommits() functions with loading states and error handling
            </p>
            <Badge variant="secondary">src/hooks/useSyncCommits.ts</Badge>
            
            <div className="mt-4 bg-muted p-4 rounded-lg font-mono text-sm">
              {`const { syncCommits, getCommits, loading, error, data } = useSyncCommits();`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" />
            Integration Status
          </CardTitle>
          <CardDescription>
            Current integration with existing systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">GitHub Commits Sync</h4>
                <p className="text-sm text-muted-foreground">
                  ✅ API endpoint integrated with FastAPI backend<br/>
                  ✅ React components created<br/>
                  ✅ Added to task detail tabs
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Pull Request Integration</h4>
                <p className="text-sm text-muted-foreground">
                  ✅ Already exists in the system<br/>
                  ✅ Available in task details<br/>
                  ✅ Integrated with existing PR API
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Task Detail Integration</CardTitle>
          <CardDescription>
            GitHub and PR tabs have been added to the task detail view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              The task detail page now includes 6 tabs:
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              <Badge variant="outline">Details</Badge>
              <Badge variant="outline">Notes</Badge>
              <Badge variant="outline">Sub-Tasks</Badge>
              <Badge variant="outline">GitHub</Badge>
              <Badge variant="outline">PR</Badge>
              <Badge variant="outline">Activity</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
          <CardDescription>
            Steps to sync GitHub commits with your projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">1</span>
              <span>Open any task detail page</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">2</span>
              <span>Click on the &quot;GitHub&quot; tab</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">3</span>
              <span>Enter GitHub username and repository name</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">4</span>
              <span>Click &quot;Sync Commits&quot; to fetch and display commit history</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">5</span>
              <span>Use the &quot;PR&quot; tab to manage pull requests (existing functionality)</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          🎉 GitHub Commits Sync integration is now complete and ready to use!
        </p>
      </div>
    </div>
  );
}

export default GitHubSyncReadme;