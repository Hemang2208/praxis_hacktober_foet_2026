// Support Agent Types
export interface AskMeResponse {
  answer: string;
  context_used?: {
    total_tasks: number;
    total_projects: number;
    skills_count: number;
    feedback_count: number;
  };
  timestamp: string;
}

export interface RecommendationItem {
  title: string;
  description: string;
  category: string;
  priority: string;
  reasoning: string;
}

export interface RecommendationsResponse {
  recommendations: RecommendationItem[];
  timestamp: string;
}

export interface NextActionResponse {
  recommendation: string;
  actionType: string;
  priority: string;
  reasoning: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

export interface ProgressResponse {
  overall_progress: number;
  tasks_summary: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
  projects_summary: {
    total: number;
    completed: number;
    active: number;
  };
  skills_progress: Record<string, number>;
  recent_achievements: Array<{
    title: string;
    description: string;
    date: string;
    category: string;
  }>;
  areas_for_improvement: string[];
  timestamp: string;
}

export interface CompleteProfileResponse {
  profile: {
    basic_info: Record<string, unknown>;
    skills: string[];
    experience: Record<string, unknown>;
    preferences: Record<string, unknown>;
  };
  activity_summary: {
    total_tasks: number;
    completed_tasks: number;
    total_projects: number;
    active_projects: number;
    github_contributions: number;
    last_login: string;
  };
  performance_metrics: {
    productivity_score: number;
    completion_rate: number;
    average_task_time: number;
    streak_days: number;
  };
  tasks?: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  }>;
  code_quality_trend?: Array<{
    date: string;
    quality: number;
    task_id: string;
  }>;
  recent_feedback?: Array<{
    _id: string;
    assessment: {
      overall: number;
      codeQuality: number;
    };
    analysisDate: string;
    totalIssues: number;
  }>;
  pull_requests?: Array<{
    pull_request: {
      title: string;
      status: string;
      url: string;
    };
    submitted_at: string;
  }>;
  timestamp: string;
}

export interface MyStatsResponse {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completed_today: number;
  average_completion_time_seconds?: number | null;
  by_project?: Array<{
    project_id: string;
    project_name?: string;
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
  }>;
  timestamp: string;
}

export interface TaskItem {
  task_id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  project_id?: string;
  project_name?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  assigned_to?: string;
  tags?: string[];
  completion_percentage?: number;
}

export interface MyAllTasksResponse {
  tasks: TaskItem[];
  total_count: number;
  limit: number;
  offset?: number;
  filters?: {
    status?: string;
    priority?: string;
    project_id?: string;
  };
  summary?: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    overdue: number;
  };
  timestamp: string;
}

export interface ProjectItem {
  project_id: string;
  name: string;
  description?: string;
  status: string;
  progress_percentage?: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  team_members?: string[];
  tasks_count?: number;
  completed_tasks?: number;
  technologies?: string[];
  repository_url?: string;
}

export interface MyProjectsResponse {
  projects: ProjectItem[];
  total_count: number;
  summary?: {
    total: number;
    active: number;
    completed: number;
    on_hold: number;
  };
  timestamp: string;
}

export interface ProjectPlanItem {
  plan_id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description?: string;
  status: string;
  phase?: string;
  milestones?: Array<{
    id: string;
    title: string;
    status: string;
    due_date?: string;
    completion_percentage?: number;
  }>;
  deliverables?: string[];
  timeline?: {
    start_date?: string;
    end_date?: string;
    duration_days?: number;
  };
  resources?: string[];
  dependencies?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface MyProjectPlansResponse {
  project_plans: ProjectPlanItem[];
  total_count: number;
  summary?: {
    total: number;
    in_progress: number;
    completed: number;
    pending: number;
  };
  timestamp: string;
}

export interface pull_requestItem {
  _id: string;
  user_id?: string;
  task_id?: string;
  pull_request: {
    url: string;
    branch: string;
    status: string;
    title: string;
    description: string;
  };
  submitted_at?: string;
  status: string;
  githubId?: string;
}

// Normalized PR structure for frontend display
export interface Normalizedpull_requestItem {
  pr_id: string;
  title: string;
  description?: string;
  status: string;
  state?: string;
  repository?: string;
  repository_url?: string;
  branch_name?: string;
  target_branch?: string;
  author?: string;
  reviewers?: string[];
  created_at?: string;
  updated_at?: string;
  merged_at?: string;
  commits_count?: number;
  files_changed?: number;
  additions?: number;
  deletions?: number;
  comments_count?: number;
  labels?: string[];
  assignees?: string[];
}

export interface Mypull_requestsResponse {
  pull_requests: Normalizedpull_requestItem[];
  total_count: number;
  summary?: {
    total: number;
    open: number;
    merged: number;
    closed: number;
    draft: number;
  };
  timestamp: string;
}

export interface CodeFeedbackItem {
  feedback_id: string;
  task_id?: string;
  task_title?: string;
  project_id?: string;
  project_name?: string;
  feedback_type?: string;
  category?: string;
  severity?: string;
  title: string;
  description?: string;
  code_snippet?: string;
  file_path?: string;
  line_number?: number;
  suggestion?: string;
  status?: string;
  rating?: number;
  created_at?: string;
  updated_at?: string;
  reviewer?: string;
  tags?: string[];
}

export interface MyCodeFeedbackResponse {
  code_feedback: CodeFeedbackItem[];
  total_count: number;
  summary?: {
    total: number;
    positive: number;
    improvement_needed: number;
    critical: number;
    resolved: number;
  };
  timestamp: string;
}

export interface NotificationItem {
  notification_id: string;
  type: string;
  category?: string;
  title: string;
  message?: string;
  description?: string;
  priority?: string;
  status?: string;
  is_read: boolean;
  action_url?: string;
  action_text?: string;
  sender?: string;
  sender_avatar?: string;
  related_entity?: {
    type?: string;
    id?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
  created_at?: string;
  read_at?: string;
  expires_at?: string;
}

export interface MyNotificationsResponse {
  notifications: NotificationItem[];
  total_count: number;
  unread_count?: number;
  summary?: {
    total: number;
    unread: number;
    read: number;
    by_type?: Record<string, number>;
  };
  timestamp: string;
}

export interface TaskAnalysisResponse {
  task_id: string;
  analysis: string;
  insights?: string[];
  suggestions?: Array<{
    title: string;
    detail: string;
  }>;
  confidence?: number;
  related_context?: Record<string, unknown>;
  timestamp: string;
}

export interface AnalyzeMyProgressResponse {
  summary: string; // high level analysis
  strengths: string[];
  weaknesses: string[];
  recommended_actions: Array<{
    title: string;
    detail: string;
    priority?: "low" | "medium" | "high";
  }>;
  metrics?: Record<string, number | string>;
  timeline_insights?: Array<{
    period: string;
    insight: string;
  }>;
  timestamp: string;
}

export interface MessageVersion {
  id: string;
  userContent: string;
  assistantContent?: string;
  timestamp: Date | string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "recommendations" | "progress" | "action" | "profile" | "code-feedback" | "notifications" | "form-create-project" | "form-create-task" | "form-create-plan" | "form-generate-tasks" | "form-generate-subtasks" | "form-create-assessment" | "form-delete-task" | "form-delete-project" | "form-update-task" | "form-link-github" | "form-sync-github";
  data?: unknown;
  versions?: MessageVersion[];
  currentVersionIndex?: number;
  feedback?: "like" | "dislike" | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
  pinned?: boolean;
}

// Update my task request payload for support-agent
export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "done" | "cancelled" | string;
  priority?: "low" | "medium" | "high" | "urgent" | string;
  assignee?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string; // ISO 8601 string
  tags?: string[];
}

// Minimal shape of updated task item returned by support-agent
export interface UpdatedTaskItem {
  id: string;
  user_id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  tags?: string[];
  ai_suggestions?: unknown[];
  ai_analysis?: unknown;
}

// Response from starting a task (POST /my-tasks/{task_id}/start/)
export interface StartTaskResponse {
  id: string;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Response from completing a task (POST /my-tasks/{task_id}/complete/)
export interface CompleteTaskResponse {
  id: string;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  [key: string]: unknown;
}

export interface QuickAction {
  label: string;
  action: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}
