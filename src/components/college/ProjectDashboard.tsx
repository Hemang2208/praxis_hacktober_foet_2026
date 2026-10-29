import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Clock, 
  GitBranch, 
  TrendingUp, 
  Code,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useProjectData } from '@/hooks/useProjectData';
import { toast } from 'react-hot-toast';

interface ProjectDashboardProps {
  project_id: string;
}

export function ProjectDashboard({ project_id }: ProjectDashboardProps) {
  const { 
    dashboard, 
    summary, 
    statistics, 
    commits,
    fetchDashboard, 
    fetchSummary, 
    fetchStatistics,
    fetchCommits,
    loading, 
    error 
  } = useProjectData();

  const [refreshing, setRefreshing] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchDashboard(project_id),
        fetchSummary(project_id),
        fetchStatistics(project_id),
        fetchCommits(project_id, 10)
      ]);
    } catch {
      console.error('Error loading dashboard data');
      toast.error('Failed to load dashboard data');
    }
  }, [project_id, fetchDashboard, fetchSummary, fetchStatistics, fetchCommits]);

  useEffect(() => {
    if (project_id) {
      loadAllData();
    }
  }, [project_id, loadAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
      toast.success('Dashboard refreshed successfully');
    } catch {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to load dashboard</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadAllData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of project progress and metrics
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          {refreshing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.completion_percentage}%</div>
              <Progress value={summary.completion_percentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_tasks}</div>
              <p className="text-xs text-muted-foreground">Active tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commits</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_commits}</div>
              <p className="text-xs text-muted-foreground">Total commits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.hours_spent}</div>
              <p className="text-xs text-muted-foreground">
                of {summary.estimated_hours} estimated
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Dashboard */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {dashboard && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Distribution</CardTitle>
                  <CardDescription>Tasks by status and priority</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">By Status</h4>
                    <div className="space-y-2">
                      {Object.entries(dashboard.task_distribution.by_status).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <Badge variant="outline" className="capitalize">
                            {status.replace('_', ' ')}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">By Priority</h4>
                    <div className="space-y-2">
                      {Object.entries(dashboard.task_distribution.by_priority).map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <Badge 
                            variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {priority}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Progress</CardTitle>
                  <CardDescription>Latest project updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.recent_progress.slice(0, 5).map((progress) => (
                      <div key={progress.id} className="flex items-start gap-3 p-2 rounded border">
                        <TrendingUp className="h-4 w-4 mt-1 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{progress.task_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {progress.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={progress.progress_percentage} className="flex-1 h-1" />
                            <span className="text-xs">{progress.progress_percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="commits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Commits</CardTitle>
              <CardDescription>Latest code contributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commits.slice(0, 10).map((commit) => (
                  <div key={commit.id} className="flex items-start gap-3 p-3 rounded border">
                    <Code className="h-4 w-4 mt-1 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{commit.message}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{commit.author}</span>
                        <span>{formatDate(commit.timestamp)}</span>
                        <span className="text-green-600">+{commit.additions}</span>
                        <span className="text-red-600">-{commit.deletions}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Tasks:</span>
                    <span className="font-medium">{statistics.total_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-medium text-green-600">{statistics.completed_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Progress:</span>
                    <span className="font-medium text-blue-600">{statistics.in_progress_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-medium text-gray-600">{statistics.pending_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overdue:</span>
                    <span className="font-medium text-red-600">{statistics.overdue_tasks}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Time Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Estimated Hours:</span>
                    <span className="font-medium">{statistics.total_estimated_hours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Hours:</span>
                    <span className="font-medium">{statistics.total_actual_hours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efficiency:</span>
                    <span className="font-medium">
                      {statistics.total_estimated_hours > 0 
                        ? Math.round((statistics.total_actual_hours / statistics.total_estimated_hours) * 100)
                        : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Priority Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>High Priority:</span>
                    <Badge variant="destructive">{statistics.high_priority_tasks}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Medium Priority:</span>
                    <Badge variant="default">{statistics.medium_priority_tasks}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Priority:</span>
                    <Badge variant="secondary">{statistics.low_priority_tasks}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {dashboard && (
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>Complete list of project tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge 
                          variant={
                            task.priority === 'high' ? 'destructive' : 
                            task.priority === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectDashboard;