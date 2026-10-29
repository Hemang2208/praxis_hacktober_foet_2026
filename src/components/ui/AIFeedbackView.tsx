"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Code,
  Shield,
  Zap,
  BookOpen,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  ExternalLink,
  Filter,
  Eye,
  EyeOff
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ScrollArea } from "@/components/ui/scroll-area";
import FeedbackChat from "@/components/ui/FeedbackChat";
import EmbeddedFeedbackChat from "@/components/ui/EmbeddedFeedbackChat";
import { validateGitHubPRUrl } from "@/lib/github";

// Types
interface CodeComment {
  _id: string;
  line: number;
  column?: number;
  fileName: string;
  message: string;
  severity: "info" | "warning" | "error" | "suggestion";
  category: "code-quality" | "performance" | "security" | "best-practices" | "documentation";
  suggestion?: string;
  example?: string;
}

interface Assessment {
  codeQuality: number;
  documentation: number;
  testCoverage: number;
  performance: number;
  security: number;
  bestPractices: number;
  overall: number;
}

interface AIFeedbackData {
  _id: string;
  task_id: string;
  pull_request_url: string;
  repository_url?: string;
  branch_name?: string;
  comments: CodeComment[];
  assessment: Assessment;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  analysisDate: string;
  isRead: boolean;
  studentRating?: number;
  studentFeedback?: string;
}

interface AIFeedbackViewProps {
  feedback: AIFeedbackData;
  onRatingSubmit?: (rating: number, comment?: string) => void;
  isLoading?: boolean;
}

// Utility functions
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "suggestion":
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "code-quality":
      return <Code className="h-4 w-4" />;
    case "performance":
      return <Zap className="h-4 w-4" />;
    case "security":
      return <Shield className="h-4 w-4" />;
    case "best-practices":
      return <TrendingUp className="h-4 w-4" />;
    case "documentation":
      return <BookOpen className="h-4 w-4" />;
    default:
      return <Code className="h-4 w-4" />;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const getScoreGradient = (score: number) => {
  if (score >= 80) return "from-green-500 to-green-600";
  if (score >= 60) return "from-yellow-500 to-yellow-600";
  return "from-red-500 to-red-600";
};

// Assessment Overview Component
const AssessmentOverview: React.FC<{ assessment: Assessment }> = ({ assessment }) => {
  const metrics = [
    { key: "overall", label: "Overall Score", value: assessment.overall, icon: Star },
    { key: "codeQuality", label: "Code Quality", value: assessment.codeQuality, icon: Code },
    { key: "performance", label: "Performance", value: assessment.performance, icon: Zap },
    { key: "security", label: "Security", value: assessment.security, icon: Shield },
    { key: "bestPractices", label: "Best Practices", value: assessment.bestPractices, icon: TrendingUp },
    { key: "documentation", label: "Documentation", value: assessment.documentation, icon: BookOpen }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={metric.key === 'overall' ? 'ring-2 ring-blue-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <metric.icon className="h-4 w-4 text-slate-600" />
                  <span className="font-medium text-sm">{metric.label}</span>
                </div>
                <span className={`text-lg font-bold ${getScoreColor(metric.value)}`}>
                  {metric.value}
                </span>
              </div>
              <div className="space-y-2">
                <Progress value={metric.value} className="h-2" />
                <div className={`text-xs font-medium ${getScoreColor(metric.value)}`}>
                  {metric.value >= 80 ? 'Excellent' : metric.value >= 60 ? 'Good' : 'Needs Improvement'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Code Comments Component
const CodeComments: React.FC<{ 
  comments: CodeComment[];
  onCommentVisibilityToggle?: (commentId: string, visible: boolean) => void;
}> = ({ comments, onCommentVisibilityToggle }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sort_by, setSortBy] = useState<string>("severity");
  const [hiddenComments, setHiddenComments] = useState<Set<string>>(new Set());

  const filteredComments = comments
    .filter(comment => {
      if (filterSeverity !== "all" && comment.severity !== filterSeverity) return false;
      if (filterCategory !== "all" && comment.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort_by === "severity") {
        const severityOrder = { error: 3, warning: 2, suggestion: 1, info: 0 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      if (sort_by === "line") {
        return a.line - b.line;
      }
      return 0;
    });

  const toggleCommentVisibility = (commentId: string) => {
    const newHidden = new Set(hiddenComments);
    if (newHidden.has(commentId)) {
      newHidden.delete(commentId);
    } else {
      newHidden.add(commentId);
    }
    setHiddenComments(newHidden);
    onCommentVisibilityToggle?.(commentId, !newHidden.has(commentId));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="suggestion">Suggestion</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="code-quality">Code Quality</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="best-practices">Best Practices</SelectItem>
            <SelectItem value="documentation">Documentation</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort_by} onValueChange={setSortBy}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="severity">Severity</SelectItem>
            <SelectItem value="line">Line Number</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-slate-600">
          Showing {filteredComments.length} of {comments.length} comments
        </div>
      </div>

      {/* Comments List */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {filteredComments.map((comment, index) => (
            <motion.div
              key={comment._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                      {getSeverityIcon(comment.severity)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {comment.fileName}:{comment.line}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <div className="flex items-center gap-1">
                              {getCategoryIcon(comment.category)}
                              {comment.category.replace('-', ' ')}
                            </div>
                          </Badge>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCommentVisibility(comment._id)}
                          className="h-6 w-6 p-0"
                        >
                          {hiddenComments.has(comment._id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      <AnimatePresence>
                        {!hiddenComments.has(comment._id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                          >
                            <p className="text-sm text-slate-700">
                              {comment.message}
                            </p>

                            {comment.suggestion && (
                              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Info className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-800">
                                    Suggestion
                                  </span>
                                </div>
                                <p className="text-sm text-blue-700">
                                  {comment.suggestion}
                                </p>
                              </div>
                            )}

                            {comment.example && (
                              <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Code className="h-4 w-4 text-slate-600" />
                                  <span className="text-sm font-medium text-slate-800">
                                    Example
                                  </span>
                                </div>
                                <pre className="text-xs text-slate-700 overflow-x-auto">
                                  <code>{comment.example}</code>
                                </pre>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Student Rating Component
const StudentRating: React.FC<{
  currentRating?: number;
  currentFeedback?: string;
  onSubmit: (rating: number, feedback?: string) => void;
  isLoading?: boolean;
}> = ({ currentRating, currentFeedback, onSubmit, isLoading }) => {
  const [rating, setRating] = useState(currentRating || 0);
  const [feedback, setFeedback] = useState(currentFeedback || "");
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, feedback.trim() || undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThumbsUp className="h-5 w-5 text-blue-600" />
          Rate This Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">How helpful was this feedback?</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                className={`p-1 rounded ${
                  star <= (hoveredRating || rating)
                    ? "text-yellow-500"
                    : "text-slate-300"
                }`}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Comments (Optional)</label>
          <Textarea
            placeholder="Share your thoughts about the AI feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={rating === 0 || isLoading}
          className="w-full"
        >
          {isLoading ? "Submitting..." : "Submit Rating"}
        </Button>
      </CardContent>
    </Card>
  );
};

// Main AI Feedback View Component
export const AIFeedbackView: React.FC<AIFeedbackViewProps> = ({ 
  feedback, 
  onRatingSubmit,
  isLoading 
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Defensive defaults for possibly-missing fields coming from the agent
  const assessment: Assessment = feedback?.assessment ?? {
    codeQuality: 0,
    documentation: 0,
    testCoverage: 0,
    performance: 0,
    security: 0,
    bestPractices: 0,
    overall: 0,
  };
  const comments: CodeComment[] = feedback?.comments ?? [];
  const strengths: string[] = feedback?.strengths ?? [];
  const improvements: string[] = feedback?.improvements ?? [];
  const recommendations: string[] = feedback?.recommendations ?? [];
  const totalIssues = feedback?.totalIssues ?? comments.length ?? 0;
  const criticalIssues = feedback?.criticalIssues ?? 0;
  const warningIssues = feedback?.warningIssues ?? 0;
  const infoIssues = feedback?.infoIssues ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI Code Review</h2>
          <p className="text-slate-600">
            Analysis completed on {new Date(feedback.analysisDate).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {totalIssues} Comments
          </Badge>
          
          {feedback.pull_request_url && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Validate URL format before opening
                const validation = validateGitHubPRUrl(feedback.pull_request_url);
                if (validation.isValid) {
                  window.open(feedback.pull_request_url, '_blank', 'noopener,noreferrer');
                } else {
                  console.error('Invalid GitHub PR URL:', validation.error);
                  // You could show a toast notification here
                  alert(`Invalid PR URL: ${validation.error}`);
                }
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View PR
            </Button>
          )}
        </div>
      </div>

      {/* Overall Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r ${getScoreGradient(assessment.overall)} opacity-5`} />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Overall Assessment</h3>
                <p className="text-slate-600">{feedback.summary}</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(assessment.overall)}`}>
                  {assessment.overall}
                </div>
                <div className="text-sm text-slate-500">out of 100</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comments">
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="rating">Rating</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AssessmentOverview assessment={assessment} />
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">
                  {criticalIssues}
                </div>
                <div className="text-sm text-slate-600">Critical Issues</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">
                  {warningIssues}
                </div>
                <div className="text-sm text-slate-600">Warnings</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {infoIssues}
                </div>
                <div className="text-sm text-slate-600">Suggestions</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <CodeComments comments={comments} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <ThumbsUp className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Improvements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <TrendingUp className="h-5 w-5" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <BookOpen className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Follow-up Questions
              </CardTitle>
              <p className="text-sm text-slate-600">
                Ask questions about your code feedback to better understand the recommendations and improve your coding skills.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96">
                <EmbeddedFeedbackChat
                  feedbackId={feedback._id}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rating">
          <StudentRating
            currentRating={feedback.studentRating}
            currentFeedback={feedback.studentFeedback}
            onSubmit={onRatingSubmit || (() => {})}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Follow-up Questions Chat */}
      <FeedbackChat
        feedbackId={feedback._id}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
};

export default AIFeedbackView;