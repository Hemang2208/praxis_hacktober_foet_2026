"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GitBranch,
  GitCommit,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/redux/hooks";
import { fetchGitHubData, clearGitHubCacheStorage } from "@/redux/slice/github.slice";
import type { GitHubRepository, GitHubCommit } from "@/redux/slice/github.slice";
import type { RootState } from "@/redux/store";
import useUserProfile from "@/hooks/useUserProfile";
import { formatDistanceToNow } from "date-fns";

// Fallback AI feedback data for demo
const ai_feedback = [
  {
    type: "suggestion",
    title: "Code Naming Convention",
    description:
      "Consider using more descriptive variable names in your React components. This will improve code readability.",
    severity: "medium",
    file: "src/components/ProductCard.tsx",
    line: 23,
  },
  {
    type: "improvement",
    title: "Performance Optimization",
    description:
      "Great job implementing memoization! This will significantly improve rendering performance.",
    severity: "positive",
    file: "src/hooks/useProductData.ts",
    line: 15,
  },
  {
    type: "warning",
    title: "Security Concern",
    description:
      "Avoid storing sensitive data in localStorage. Consider using secure HTTP-only cookies instead.",
    severity: "high",
    file: "src/utils/auth.ts",
    line: 45,
  },
];

export function GitHubPage() {

  // Move all hooks to the top
  const { mongoUser, loading, error } = useUserProfile();
  let githubUsername: string | null = null;
  if (mongoUser && mongoUser.socialLinks && mongoUser.socialLinks.github) {
    const match = mongoUser.socialLinks.github.match(/github\.com\/([^/]+)/);
    if (match) {
      githubUsername = match[1];
    }
  } else {
    if (typeof window !== "undefined") {
      try {
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith('github_user='));
        if (cookieValue) {
          const githubUserObj = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
          if (githubUserObj && githubUserObj.login) {
            githubUsername = githubUserObj.login;
          }
        }
      } catch  {
        
      }
    }
  }
  const dispatch = useAppDispatch();
  const githubData = useSelector((state: RootState) => state.github.data);
  const githubLoading = useSelector((state: RootState) => state.github.loading);
  const githubError = useSelector((state: RootState) => state.github.error);

  React.useEffect(() => {
    if (githubUsername) {
      // Only fetch if we don't already have this user's data cached
      if (!githubData.user || githubData.user.login !== githubUsername) {
        dispatch(fetchGitHubData(githubUsername));
      }
    }
  }, [githubUsername, dispatch, githubData.user]);

  // If redirected from OAuth and username is in cookie, trigger fetch
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("code=")) {
      // OAuth redirect handled server-side will set cookie; cookie effect will detect it.
    } else if (!mongoUser && typeof window !== "undefined") {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('github_user='));
      if (cookieValue) {
        const rawValue = cookieValue.split('=')[1];
        let decoded = decodeURIComponent(rawValue);
        // Remove extra quotes if present
        if (decoded.startsWith('"') && decoded.endsWith('"')) {
          decoded = decoded.slice(1, -1);
        }
        // If still not valid JSON, try decoding again
        if (!(decoded.startsWith('{') && decoded.endsWith('}'))) {
          try {
            decoded = decodeURIComponent(decoded);
          } catch {}
        }
        if (decoded.startsWith('{') && decoded.endsWith('}')) {
          try {
            const githubUserObj = JSON.parse(decoded);
            if (githubUserObj && githubUserObj.login) {
              if (!githubData.user || githubData.user.login !== githubUserObj.login) {
                dispatch(fetchGitHubData(githubUserObj.login));
              }
            }
          } catch (err) {
            console.error('Failed to parse github_user cookie:', decoded, err);
          }
        } else {
          console.error('github_user cookie is not valid JSON:', decoded);
        }
      }
    }
  }, [mongoUser, dispatch, githubData.user]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const refetch = async () => {
    if (githubUsername && !isRefreshing) {
      setIsRefreshing(true);
      try {
        // Clear the cache from storage to fetch fresh data
        dispatch(clearGitHubCacheStorage(githubUsername));
        // Fetch new data from the API
        await dispatch(fetchGitHubData(githubUsername));
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "bg-green-100 text-green-700 border-green-200";
      case "good":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "needs-improvement":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "positive":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-slate-500" />;
    }
  };

  const generateCodeQuality = (commit: { message: string; additions: number; deletions: number }) => {
    // Simple quality assessment based on commit message and changes
    const message = commit.message.toLowerCase();
    const hasGoodMessage = message.includes("feat") || message.includes("fix") || message.includes("refactor");
    const changes = commit.additions + commit.deletions;
    if (hasGoodMessage && changes < 100) return "excellent";
    if (hasGoodMessage || changes < 200) return "good";
    return "needs-improvement";
  };

  if (!githubUsername) {
    // Show Connect GitHub button if not connected
    const handleConnectGitHub = () => {
      // Redirect to backend OAuth endpoint with redirect param for college GitHub page
      window.location.href = "/api/github/oauth/start?redirect=/college/github";
    };
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            GitHub Integration
          </h1>
          <p className="text-slate-600 mb-6">
            Connect your GitHub account to view your data and contributions.
          </p>
          <Button
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg"
            onClick={handleConnectGitHub}
          >
            Connect GitHub
          </Button>
        </div>
      </div>
    );
  }

  if (loading || (githubLoading && !githubData.user)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              GitHub Integration
            </h1>
            <p className="text-slate-600 mt-1">
              Loading your GitHub data...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  if (error || githubError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              GitHub Integration
            </h1>
            <p className="text-slate-600 mt-1">
              Track your code contributions and get AI-powered feedback
            </p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-4">
          <Button onClick={refetch} variant="outline" disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  const repoStats = [
    {
      title: "Total Commits",
      value: githubData.stats?.totalCommits?.toString() || "0",
      description: "Across all repositories",
      icon: GitCommit,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Repositories",
      value: githubData.stats?.totalRepos?.toString() || "0",
  description: `${(githubData.repositories || []).filter((r: GitHubRepository) => !r.private).length} public`,
      icon: GitBranch,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Total Stars",
      value: githubData.stats?.totalStars?.toString() || "0",
      description: "Across all repos",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Code Quality",
      value: "85%",
      description: "Overall rating",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={githubData.user?.avatar_url} alt={githubData.user?.name || githubUsername} />
            <AvatarFallback>
              {githubData.user?.name?.charAt(0) || githubUsername?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              GitHub Integration
            </h1>
            <p className="text-slate-600 mt-1">
              Welcome back, {githubData.user?.name || githubUsername}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline" size="sm" disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`https://github.com/${githubUsername}`, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on GitHub
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {repoStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Commits */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GitCommit className="mr-2 h-5 w-5 text-blue-600" />
                Recent Commits
              </CardTitle>
              <CardDescription>
                Showing your latest code contributions (not all commits)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {githubData.commits && githubData.commits.length > 0 ? (
                githubData.commits.slice(0, 4).map((commit: GitHubCommit) => {
                  const quality = generateCodeQuality(commit);
                  return (
                    <div
                      key={commit.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 text-sm mb-1">
                            {commit.message}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <span>{commit.repository}</span>
                            <span>•</span>
                            <span>{commit.branch}</span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(commit.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={getQualityColor(quality)}
                        >
                          {quality}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span className="text-green-600">
                            +{commit.additions}
                          </span>
                          <span className="text-red-600">-{commit.deletions}</span>
                          <code className="bg-slate-100 px-2 py-1 rounded text-slate-700">
                            {commit.id}
                          </code>
                        </div>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={githubData.user?.avatar_url} />
                          <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                            {commit.author.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No recent commits found
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Feedback - COMMENTED OUT */}
        {/* <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-purple-600" />
                AI Code Feedback
              </CardTitle>
              <CardDescription>
                Intelligent suggestions to improve your code quality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ai_feedback.map((feedback, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {getSeverityIcon(feedback.severity)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 text-sm mb-1">
                        {feedback.title}
                      </h4>
                      <p className="text-sm text-slate-600 mb-2">
                        {feedback.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                          {feedback.file}:{feedback.line}
                        </code>
                        <Button size="sm" variant="ghost" className="text-xs">
                          View Code
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div> */}

        {/* Repository Overview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Repository Overview</CardTitle>
              <CardDescription>
                Your active repositories and their health metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {githubData.repositories && githubData.repositories.length > 0 ? (
                  githubData.repositories.slice(0, 5).map((repo: GitHubRepository) => (
                    <div
                      key={repo.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900 flex items-center">
                            <GitBranch className="mr-2 h-4 w-4 text-slate-500" />
                            {repo.name}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {repo.description || "No description available"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(repo.html_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <span className="flex items-center">
                            <div
                              className={`w-3 h-3 rounded-full mr-1 ${
                                repo.language === "TypeScript"
                                  ? "bg-blue-500"
                                  : repo.language === "JavaScript"
                                  ? "bg-yellow-500"
                                  : repo.language === "Python"
                                  ? "bg-green-500"
                                  : "bg-gray-500"
                              }`}
                            />
                            {repo.language || "Unknown"}
                          </span>
                          <span className="flex items-center">
                            <Star className="mr-1 h-3 w-3" />
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center">
                            <GitBranch className="mr-1 h-3 w-3" />
                            {repo.forks_count}
                          </span>
                          <span className="flex items-center">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {repo.open_issues_count}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={repo.private ? "secondary" : "outline"}>
                            {repo.private ? "Private" : "Public"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No repositories found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
