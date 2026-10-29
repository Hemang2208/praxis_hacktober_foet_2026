import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, GitPullRequest } from 'lucide-react';
import { TaskGitHubTab } from './task-github-tab';

interface TaskGitIntegrationProps {
  project_id: string;
}

export function TaskGitIntegration({ project_id }: TaskGitIntegrationProps) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Git Integration
          </CardTitle>
          <CardDescription>
            Manage GitHub commits and pull requests for this task
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="github" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="github" className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub Commits
              </TabsTrigger>
              <TabsTrigger value="pr" className="flex items-center gap-2">
                <GitPullRequest className="h-4 w-4" />
                Pull Requests
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="github" className="mt-6">
              <TaskGitHubTab project_id={project_id} />
            </TabsContent>
            
            <TabsContent value="pr" className="mt-6">
              <div className="text-center py-8">
                <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Pull Request Integration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pull request functionality is already integrated into the existing task system.
                  You can link pull requests directly when viewing task details.
                </p>
                <div className="text-xs text-muted-foreground">
                  To submit a pull request, use the existing PR submission feature in the task details.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default TaskGitIntegration;