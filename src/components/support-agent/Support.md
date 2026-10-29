# Support Agent API - Complete API Documentation

## Overview

The Support Agent is an intelligent AI-powered assistant that has access to **ALL your user-specific data** across the entire platform. It provides personalized insights, recommendations, and answers based on your complete profile. This document provides comprehensive API documentation for all endpoints.

---

## Table of Contents

1. [Authentication API](#authentication-api)
2. [AI Assistant Endpoints](#ai-assistant-endpoints)
3. [Data Access Endpoints](#data-access-endpoints)
4. [Task Management Endpoints](#task-management-endpoints)
5. [Analytics Endpoints](#analytics-endpoints)
6. [Health Check](#health-check)
7. [Error Handling](#error-handling)
8. [Example Requests](#example-requests)

---

## Authentication API

### Base URL

```
https://localhost/agent/support-agent/api/v1/auth
```

### 1. Register User

**Endpoint:** `POST /register`

**Description:** Register a new user (internal/testing purpose)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe",
  "role": "student"
}
```

**Response:** `200 OK`

```json
{
  "message": "User registered successfully",
  "user_id": "507f1f77bcf86cd799439011"
}
```

**Error Responses:**

- `400 Bad Request` - Email already registered
- `422 Unprocessable Entity` - Invalid input fields

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "role": "student"
  }'
```

---

### 2. Login User

**Endpoint:** `POST /login`

**Description:** Authenticate user and receive access and refresh tokens

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": "507f1f77bcf86cd799439011"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid email or password
- `400 Bad Request` - Missing email or password

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### 3. Refresh Access Token

**Endpoint:** `POST /refresh`

**Description:** Get a new access token using a valid refresh token

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or expired refresh token
- `401 Unauthorized` - Refresh token has been revoked

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

### 4. Logout User

**Endpoint:** `POST /logout`

**Description:** Logout and revoke refresh token

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 5. Service Login (Trusted Backend)

**Endpoint:** `POST /service-login`

**Description:** Trusted service login - creates or finds user and returns tokens. Should be called from trusted backend services.

**Request Body:**

```json
{
  "email": "user@example.com",
  "user_id": "external_user_id_123",
  "full_name": "John Doe",
  "role": "student"
}
```

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": "507f1f77bcf86cd799439011"
}
```

**Error Responses:**

- `400 Bad Request` - Email and user_id are required

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/auth/service-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "user_id": "ext_123",
    "full_name": "John Doe",
    "role": "student"
  }'
```

---

## AI Assistant Endpoints

### Base URL

```
https://localhost/agent/support-agent/api/v1/assistant
```

All AI assistant endpoints require authentication via Bearer token in the Authorization header.

### 1. Ask Me Anything

**Endpoint:** `POST /ask-me`

**Description:** Ask anything about your data in natural language (tasks, projects, progress, skills, etc.)

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "What tasks do I have due this week?",
  "include_context": true
}
```

**Response:** `200 OK`

```json
{
  "answer": "You have 3 tasks due this week: API authentication (due 2025-01-10), Database optimization (due 2025-01-11), and Documentation update (due 2025-01-12). The API authentication is marked as high priority and is currently in progress.",
  "context_used": {
    "total_tasks": 15,
    "total_projects": 4,
    "skills_count": 12,
    "feedback_count": 8
  },
  "timestamp": "2025-01-08T10:30:00"
}
```

**Common Query Examples:**

- "What tasks do I have due this week?"
- "How is my code quality trending?"
- "What projects am I working on?"
- "What skills should I focus on?"
- "Show me my recent achievements"
- "What's my completion rate this month?"

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to process query

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/assistant/ask-me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What tasks do I have due this week?",
    "include_context": true
  }'
```

---

### 2. Get My Complete Profile

**Endpoint:** `GET /my-complete-profile`

**Description:** Get your complete profile including user data, tasks, projects, PRs, code feedback, notifications, applications, and computed statistics

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:** None

**Response:** `200 OK`

```json
{
  "user_profile": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "bio": "Full-stack developer",
    "headline": "Senior Engineer",
    "skills": ["Node.js", "React", "MongoDB"],
    "education": [],
    "workExperience": [],
    "careerGoals": "Become a tech lead",
    "socialLinks": [],
    "profileCompleteness": 85
  },
  "tasks": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "API authentication",
      "status": "in-progress",
      "priority": "high",
      "dueDate": "2025-01-10",
      "completedAt": null
    }
  ],
  "total_tasks": 15,
  "completed_tasks": 8,
  "projects": [],
  "active_projects": 3,
  "pull_requests": [],
  "ai_feedback": [],
  "average_code_quality": 82,
  "notifications": [],
  "applications": [],
  "recent_achievements": ["Task completed on time", "High code quality score"],
  "skills_from_projects": ["Node.js", "React", "MongoDB", "Docker"]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to get profile

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-complete-profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Get My Progress Summary

**Endpoint:** `GET /my-progress`

**Description:** Get a comprehensive progress summary with task completion rates, project progress, code quality trends, skill usage, and achievements

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:** None

**Response:** `200 OK`

```json
{
  "task_completion_rate": 53.3,
  "tasks_completed_this_week": 2,
  "tasks_completed_this_month": 5,
  "active_projects_count": 3,
  "project_progress": 65,
  "code_quality_average": 82,
  "code_quality_trend": "improving",
  "top_skills": ["Node.js", "React", "MongoDB"],
  "skill_usage_stats": {
    "Node.js": 15,
    "React": 12,
    "MongoDB": 10
  },
  "recent_achievements": [
    "Task completed on time",
    "High code quality (90+)",
    "Project milestone reached"
  ],
  "overdue_tasks": 1,
  "due_soon_tasks": 3
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to get progress

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-progress \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Analyze My Progress

**Endpoint:** `GET /analyze-my-progress`

**Description:** Get AI-powered analysis of your progress across all areas with comprehensive insights, identified strengths, areas for improvement, and recommendations

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:** None

**Response:** `200 OK`

```json
{
  "overall_progress": "You're making excellent progress! You've completed 53% of your tasks this month with consistently high code quality scores. Your project work is on track.",
  "strengths": [
    "Consistent task completion",
    "High code quality scores",
    "Strong in backend development",
    "Good time management"
  ],
  "areas_for_improvement": [
    "Documentation could be more detailed",
    "Test coverage needs improvement",
    "Time estimation accuracy"
  ],
  "task_performance": "You have completed 8 out of 15 tasks (53.3%). Your completion rate this month is 67%, which is above average. You have 1 overdue task.",
  "project_performance": "You're actively working on 3 projects. All projects are progressing well with an average completion rate of 65%. No blockers detected.",
  "code_quality_trends": "Your code quality is trending upwards. Average score: 82/100. Recent reviews show improvement in code structure and error handling.",
  "skill_development": "Strong growth in backend development. You're using Node.js, React, and MongoDB frequently. Consider exploring new frameworks or technologies.",
  "recommendations": [
    "Focus on writing comprehensive tests for your current tasks",
    "Improve documentation in your code comments",
    "Consider learning Docker for better deployment practices",
    "Practice architectural design patterns"
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to analyze progress

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/analyze-my-progress \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 5. Get Personalized Recommendations

**Endpoint:** `GET /recommendations`

**Description:** Get 5-7 personalized recommendations based on your current workload, projects, skills, career goals, and code quality feedback

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:** None

**Response:** `200 OK`

```json
[
  {
    "title": "Complete API Authentication Feature",
    "description": "This high-priority task is blocking other team members and is due tomorrow. It's estimated to take 2-3 hours.",
    "category": "tasks",
    "priority": "urgent",
    "reasoning": "This task is overdue and is blocking other team members. Completing it should be your top priority."
  },
  {
    "title": "Improve Test Coverage",
    "description": "Your recent code reviews mention low test coverage. Focus on writing unit and integration tests.",
    "category": "learning",
    "priority": "high",
    "reasoning": "Multiple code reviews have suggested improving test coverage. This is a key area for improvement."
  },
  {
    "title": "Learn Docker for Deployment",
    "description": "Container technologies are important for your career goals. Recommended for senior developer roles.",
    "category": "skills",
    "priority": "medium",
    "reasoning": "Based on your career goals and the tech stack used in your projects, Docker proficiency would be valuable."
  },
  {
    "title": "Focus on Database Optimization",
    "description": "Your active project has performance concerns with database queries. Consider optimization strategies.",
    "category": "projects",
    "priority": "high",
    "reasoning": "Project performance is being impacted by slow database queries. This needs attention."
  },
  {
    "title": "Review Career Goals Progress",
    "description": "You're progressing well towards your goal of becoming a tech lead. Continue building leadership skills.",
    "category": "career",
    "priority": "medium",
    "reasoning": "Your current trajectory aligns well with your career goals. Keep building mentoring and leadership experience."
  },
  {
    "title": "Schedule Code Review Session",
    "description": "Get feedback on your recent pull requests to identify patterns and improve code quality.",
    "category": "learning",
    "priority": "medium",
    "reasoning": "Regular code reviews help identify improvement areas and accelerate skill development."
  },
  {
    "title": "Update Project Documentation",
    "description": "Some of your projects are missing recent documentation. Update to reflect current state.",
    "category": "projects",
    "priority": "low",
    "reasoning": "Documentation is important for team collaboration and onboarding. Set aside time this week."
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to get recommendations

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/recommendations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Get Next Best Action

**Endpoint:** `GET /next-action`

**Description:** Get AI suggestion for your next best action based on urgent items, high-priority tasks, career goals, current workload, and unread feedback

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:** None

**Response:** `200 OK`

```json
{
  "action": "Complete the authentication feature for the API project",
  "reasoning": "This is blocking 2 team members and is due tomorrow. It has high priority and will unblock other work.",
  "expected_impact": "Unblock 2 team members and keep project on schedule. Improve team productivity.",
  "estimated_time": "2-3 hours",
  "related_items": [
    "task_507f1f77bcf86cd799439011",
    "project_507f1f77bcf86cd799439012"
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to get next action

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/next-action \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Access Endpoints

### Base URL

```
https://localhost/agent/support-agent/api/v1/assistant
```

All endpoints require authentication via Bearer token.

### 1. Get My Profile

**Endpoint:** `GET /my-profile`

**Description:** Get your user profile with basic information

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "fullName": "John Doe",
  "email": "john@example.com",
  "bio": "Full-stack developer passionate about building great products",
  "headline": "Senior Software Engineer",
  "role": "student",
  "skills": ["Node.js", "React", "MongoDB", "Docker"],
  "education": [],
  "workExperience": [],
  "careerGoals": "Become a tech lead and mentor junior developers",
  "socialLinks": {
    "github": "https://github.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "profileCompleteness": 85,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Profile not found

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get All My Tasks

**Endpoint:** `GET /my-all-tasks`

**Description:** Get all tasks across all statuses (todo, in-progress, completed, blocked)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `limit` (integer, optional, default: 100, max: 1000) - Maximum number of tasks to return

**Response:** `200 OK`

```json
{
  "tasks": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "API Authentication Implementation",
      "description": "Implement JWT-based authentication",
      "status": "in-progress",
      "priority": "high",
      "assignee": "john@example.com",
      "dueDate": "2025-01-10T23:59:59Z",
      "estimatedHours": 8,
      "actualHours": 4,
      "tags": ["backend", "authentication"],
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-08T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Database Optimization",
      "description": "Optimize slow database queries",
      "status": "todo",
      "priority": "medium",
      "dueDate": "2025-01-15T23:59:59Z",
      "estimatedHours": 5,
      "tags": ["database", "performance"],
      "created_at": "2025-01-05T00:00:00Z"
    }
  ],
  "count": 2
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve tasks

**Example:**

```bash
curl -X GET "https://localhost/agent/support-agent/api/v1/assistant/my-all-tasks?limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Get My Projects

**Endpoint:** `GET /my-projects`

**Description:** Get all projects you own or collaborate on

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "projects": [
    {
      "_id": "507f1f77bcf86cd799439001",
      "title": "E-commerce Platform",
      "description": "Full-featured e-commerce platform",
      "status": "active",
      "progress": 65,
      "technologies": ["Node.js", "React", "MongoDB"],
      "teamMembers": [
        {
          "user_id": "507f1f77bcf86cd799439011",
          "role": "lead",
          "name": "John Doe"
        }
      ],
      "startDate": "2024-06-01",
      "expectedEndDate": "2025-03-01",
      "created_at": "2024-06-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve projects

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Get My Project Plans

**Endpoint:** `GET /my-project-plans`

**Description:** Get project plans including summaries, features, milestones, and tasks

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "plans": [
    {
      "_id": "507f1f77bcf86cd799439002",
      "project_id": "507f1f77bcf86cd799439001",
      "title": "E-commerce Platform Plan",
      "summary": "Complete e-commerce solution with user management, product catalog, and payment integration",
      "features": [
        "User authentication and authorization",
        "Product catalog with search and filters",
        "Shopping cart and checkout",
        "Payment processing",
        "Order management"
      ],
      "milestones": [
        {
          "name": "Phase 1: Core Features",
          "date": "2024-08-01",
          "description": "User auth and product catalog"
        }
      ],
      "tasks": ["task_507f1f77bcf86cd799439011"],
      "estimated_duration": "9 months"
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve project plans

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-project-plans \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 5. Get My Pull Requests

**Endpoint:** `GET /my-pull-requests`

**Description:** Get all your submitted pull requests with status and linked tasks

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "pull_requests": [
    {
      "_id": "507f1f77bcf86cd799439003",
      "title": "Add JWT authentication",
      "repository": "project-api",
      "branch": "feature/jwt-auth",
      "status": "merged",
      "submittedDate": "2025-01-05T10:00:00Z",
      "mergedDate": "2025-01-07T15:30:00Z",
      "linkedTasks": ["task_507f1f77bcf86cd799439011"],
      "reviewCount": 2,
      "comments": 5,
      "codeChanges": {
        "additions": 150,
        "deletions": 20,
        "filesChanged": 4
      }
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve pull requests

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-pull-requests \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Get My Code Feedback

**Endpoint:** `GET /my-code-feedback`

**Description:** Get all AI code review feedback and quality assessments

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "feedback": [
    {
      "_id": "507f1f77bcf86cd799439004",
      "task_id": "task_507f1f77bcf86cd799439011",
      "pull_requestId": "pr_507f1f77bcf86cd799439003",
      "overallScore": 82,
      "quality": "good",
      "submittedDate": "2025-01-08T09:00:00Z",
      "feedback": {
        "strengths": [
          "Good code structure",
          "Clear variable naming",
          "Proper error handling"
        ],
        "improvements": [
          "Add more unit tests",
          "Improve documentation",
          "Consider refactoring utility functions"
        ],
        "performanceAnalysis": "Code performs well with no bottlenecks detected",
        "securityAnalysis": "No security vulnerabilities found"
      },
      "detailedComments": [
        {
          "line": 45,
          "message": "Consider adding more detailed error messages",
          "severity": "low"
        }
      ]
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve code feedback

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-code-feedback \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 7. Get My Notifications

**Endpoint:** `GET /my-notifications`

**Description:** Get your notifications with filtering options

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `limit` (integer, optional, default: 50, max: 200) - Maximum number of notifications
- `unread_only` (boolean, optional, default: false) - Return only unread notifications

**Response:** `200 OK`

```json
{
  "notifications": [
    {
      "_id": "507f1f77bcf86cd799439005",
      "type": "task_assignment",
      "title": "Task Assigned: API Authentication",
      "message": "You have been assigned a new task: API Authentication Implementation",
      "isRead": false,
      "created_at": "2025-01-08T10:30:00Z",
      "metadata": {
        "task_id": "task_507f1f77bcf86cd799439011"
      }
    },
    {
      "_id": "507f1f77bcf86cd799439006",
      "type": "task_completed",
      "title": "Task Completed: Database Setup",
      "message": "Task Database Setup has been marked as completed",
      "isRead": true,
      "created_at": "2025-01-07T15:00:00Z",
      "metadata": {
        "task_id": "task_507f1f77bcf86cd799439010"
      }
    }
  ],
  "count": 2,
  "unread_count": 1
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve notifications

**Example:**

```bash
curl -X GET "https://localhost/agent/support-agent/api/v1/assistant/my-notifications?limit=50&unread_only=false" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 8. Get My Applications

**Endpoint:** `GET /my-applications`

**Description:** Get your job/internship applications with status and details

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "applications": [
    {
      "_id": "507f1f77bcf86cd799439007",
      "companyName": "TechCorp Inc.",
      "position": "Senior Software Engineer",
      "status": "interview_scheduled",
      "appliedDate": "2025-01-01T00:00:00Z",
      "interviewDate": "2025-01-15T10:00:00Z",
      "coverLetter": "I am excited to apply for the Senior Software Engineer position...",
      "keyAchievements": [
        "Led team of 5 developers",
        "Implemented scalable backend system",
        "Improved code quality metrics by 40%"
      ],
      "expectedPackage": 150000,
      "preferences": ["remote", "flexible-hours"],
      "notes": "Great opportunity for growth"
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve applications

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-applications \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Task Management Endpoints

### Base URL

```
https://localhost/agent/support-agent/api/v1
```

### 1. Create Task

**Endpoint:** `POST /my-tasks`

**Description:** Create a new task and assign it to a user

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Query Parameters:**

- `target_user_id` (string, required) - User ID to assign the task to

**Request Body:**

```json
{
  "title": "Implement API Authentication",
  "description": "Add JWT-based authentication to the REST API",
  "priority": "high",
  "estimated_hours": 8.5,
  "due_date": "2025-01-10T23:59:59Z",
  "tags": ["backend", "authentication"]
}
```

**Response:** `200 OK`

```json
{
  "id": "507f1f77bcf86cd799439011",
  "user_id": "507f1f77bcf86cd799439020",
  "title": "Implement API Authentication",
  "description": "Add JWT-based authentication to the REST API",
  "status": "todo",
  "priority": "high",
  "assignee": null,
  "estimated_hours": 8.5,
  "actual_hours": null,
  "due_date": "2025-01-10T23:59:59Z",
  "created_at": "2025-01-08T10:30:00Z",
  "updated_at": "2025-01-08T10:30:00Z",
  "completed_at": null,
  "tags": ["backend", "authentication"],
  "ai_suggestions": [],
  "ai_analysis": null
}
```

**Error Responses:**

- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to create task

**Example:**

```bash
curl -X POST "https://localhost/agent/support-agent/api/v1/my-tasks?target_user_id=507f1f77bcf86cd799439020" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement API Authentication",
    "description": "Add JWT-based authentication",
    "priority": "high",
    "estimated_hours": 8.5,
    "due_date": "2025-01-10T23:59:59Z",
    "tags": ["backend", "authentication"]
  }'
```

---

### 2. Get All My Tasks

**Endpoint:** `GET /my-tasks/`

**Description:** Get all tasks for the authenticated user with optional filters

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `status` (string array, optional) - Filter by status (todo, in_progress, done, cancelled)
- `priority` (string array, optional) - Filter by priority (low, medium, high, urgent)
- `tags` (string array, optional) - Filter by tags
- `limit` (integer, optional, default: 20, max: 100) - Maximum number of tasks

**Response:** `200 OK`

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "user_id": "507f1f77bcf86cd799439020",
    "title": "Implement API Authentication",
    "description": "Add JWT-based authentication",
    "status": "in_progress",
    "priority": "high",
    "estimated_hours": 8.5,
    "actual_hours": 4,
    "due_date": "2025-01-10T23:59:59Z",
    "tags": ["backend", "authentication"],
    "created_at": "2025-01-08T10:30:00Z"
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve tasks

**Example:**

```bash
curl -X GET "https://localhost/agent/support-agent/api/v1/my-tasks/?status=in_progress&priority=high&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Get Specific Task

**Endpoint:** `GET /my-tasks/{task_id}`

**Description:** Get details of a specific task

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `task_id` (string, required) - Task ID to retrieve

**Response:** `200 OK`

```json
{
  "id": "507f1f77bcf86cd799439011",
  "user_id": "507f1f77bcf86cd799439020",
  "title": "Implement API Authentication",
  "description": "Add JWT-based authentication",
  "status": "in_progress",
  "priority": "high",
  "estimated_hours": 8.5,
  "actual_hours": 4,
  "due_date": "2025-01-10T23:59:59Z",
  "tags": ["backend", "authentication"],
  "created_at": "2025-01-08T10:30:00Z",
  "updated_at": "2025-01-08T12:00:00Z",
  "ai_suggestions": ["Add comprehensive error handling", "Write unit tests"],
  "ai_analysis": "This task is straightforward and can be completed in estimated time with proper planning."
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Task not found
- `500 Internal Server Error` - Failed to retrieve task

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/my-tasks/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Update Task

**Endpoint:** `PUT /my-tasks/{task_id}`

**Description:** Update a specific task

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**

- `task_id` (string, required) - Task ID to update

**Request Body (all fields optional):**

```json
{
  "title": "Implement API Authentication (Updated)",
  "description": "Add JWT-based authentication with refresh tokens",
  "status": "in_progress",
  "priority": "urgent",
  "actual_hours": 5,
  "due_date": "2025-01-10T23:59:59Z",
  "tags": ["backend", "authentication", "security"]
}
```

**Response:** `200 OK`

```json
{
  "id": "507f1f77bcf86cd799439011",
  "user_id": "507f1f77bcf86cd799439020",
  "title": "Implement API Authentication (Updated)",
  "status": "in_progress",
  "priority": "urgent",
  "actual_hours": 5,
  "updated_at": "2025-01-08T13:30:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Task not found
- `500 Internal Server Error` - Failed to update task

**Example:**

```bash
curl -X PUT https://localhost/agent/support-agent/api/v1/my-tasks/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "urgent",
    "actual_hours": 5
  }'
```

---

### 5. Delete Task

**Endpoint:** `DELETE /my-tasks/{task_id}`

**Description:** Delete a specific task

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `task_id` (string, required) - Task ID to delete

**Response:** `200 OK`

```json
{
  "message": "Task deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Task not found
- `500 Internal Server Error` - Failed to delete task

**Example:**

```bash
curl -X DELETE https://localhost/agent/support-agent/api/v1/my-tasks/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Search Tasks

**Endpoint:** `GET /my-tasks/search/`

**Description:** Search your tasks by query string

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `q` (string, required) - Search query
- `limit` (integer, optional, default: 20, max: 100) - Maximum results

**Response:** `200 OK`

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "Implement API Authentication",
    "description": "Add JWT-based authentication",
    "status": "in_progress",
    "priority": "high"
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to search tasks

**Example:**

```bash
curl -X GET "https://localhost/agent/support-agent/api/v1/my-tasks/search/?q=authentication&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 7. Get Overdue Tasks

**Endpoint:** `GET /my-tasks/overdue/`

**Description:** Get all overdue tasks

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "Implement API Authentication",
    "priority": "high",
    "due_date": "2025-01-05T23:59:59Z",
    "status": "in_progress",
    "daysOverdue": 3
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve overdue tasks

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/my-tasks/overdue/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 8. Complete Task

**Endpoint:** `POST /my-tasks/{task_id}/complete/`

**Description:** Mark a task as completed

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `task_id` (string, required) - Task ID to complete

**Response:** `200 OK`

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Implement API Authentication",
  "status": "done",
  "completed_at": "2025-01-08T14:30:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Task not found
- `500 Internal Server Error` - Failed to complete task

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/my-tasks/507f1f77bcf86cd799439011/complete/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 9. Start Task

**Endpoint:** `POST /my-tasks/{task_id}/start/`

**Description:** Mark a task as in progress

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `task_id` (string, required) - Task ID to start

**Response:** `200 OK`

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Implement API Authentication",
  "status": "in_progress"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Task not found
- `500 Internal Server Error` - Failed to start task

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/my-tasks/507f1f77bcf86cd799439011/start/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Analytics Endpoints

### Base URL

```
https://localhost/agent/support-agent/api/v1
```

### 1. Get My Task Statistics

**Endpoint:** `GET /my-stats/`

**Description:** Get comprehensive task statistics

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "total_tasks": 15,
  "completed_tasks": 8,
  "in_progress_tasks": 4,
  "overdue_tasks": 1,
  "completion_rate": 53.3,
  "average_task_duration": 3.5
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve statistics

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/my-stats/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Task Recommendations

**Endpoint:** `GET /recommendations/`

**Description:** Get AI-powered personalized task recommendations

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
[
  {
    "title": "Complete Authentication Task",
    "description": "You have an overdue high-priority task",
    "reasoning": "This task is blocking other work and is overdue",
    "priority": "urgent",
    "estimated_hours": 3.5,
    "tags": ["backend", "authentication"]
  }
]
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to get recommendations

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/recommendations/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Get Quick Stats Summary

**Endpoint:** `GET /assistant/my-stats-summary`

**Description:** Get a quick overview of key metrics

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  },
  "tasks": {
    "total": 15,
    "completed": 8,
    "in_progress": 4,
    "todo": 3,
    "completion_rate": "53.3%"
  },
  "projects": {
    "total": 3,
    "active": 3
  },
  "code_quality": {
    "average_score": 82,
    "total_feedback": 8
  },
  "skills": {
    "count": 4,
    "top_skills": ["Node.js", "React", "MongoDB", "Docker"]
  },
  "recent_achievements": ["Task completed on time", "High code quality (90+)"]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Failed to retrieve stats

**Example:**

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/my-stats-summary \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Health Check

### 1. Task AI Analysis

**Endpoint:** `POST /my-tasks/{task_id}/analyze/`

**Description:** Get AI analysis for a specific task

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**

- `task_id` (string, required) - Task ID to analyze

**Request Body:**

```json
{
  "context": "Additional context about the task"
}
```

**Response:** `200 OK`

```json
{
  "task_id": "507f1f77bcf86cd799439011",
  "analysis": "This is a well-scoped task that should be completed in 8 hours",
  "suggestions": [
    "Break down into smaller subtasks",
    "Write comprehensive tests",
    "Document the API endpoints"
  ],
  "complexity": "moderate",
  "risks": ["Integration testing challenges"],
  "recommendations": ["Start with unit tests first"]
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Task not found
- `500 Internal Server Error` - AI analysis failed

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/my-tasks/507f1f77bcf86cd799439011/analyze/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "context": "This is part of the authentication module"
  }'
```

---

### 2. Ask About Tasks

**Endpoint:** `POST /ask/`

**Description:** Ask AI assistant about your tasks

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "What tasks should I prioritize today?",
  "context": "I have 2 hours available"
}
```

**Response:** `200 OK`

```json
{
  "message": "Based on your workload and priorities, I recommend focusing on: 1) Complete authentication feature (high priority, blocking), 2) Review database optimization (medium priority). You have time for both.",
  "tasks": null,
  "suggestions": [
    "Start with the authentication feature as it's blocking others",
    "Set up testing environment before starting development"
  ],
  "analysis": "Your workload is balanced with manageable deadlines"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - AI query failed

**Example:**

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/ask/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What tasks should I prioritize today?",
    "context": "I have 2 hours available"
  }'
```

---

## Health Endpoints

### 1. User Tasks Service Health

**Endpoint:** `GET /health/`

**Description:** Health check for user task support agent

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "service": "user-support-agent",
  "timestamp": "2025-01-08T14:30:00Z"
}
```

---

### 2. Comprehensive Assistant Health

**Endpoint:** `GET /assistant/health/`

**Description:** Health check for comprehensive support agent

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "service": "comprehensive-support-agent",
  "features": [
    "Complete user profile access",
    "Tasks, projects, and plans",
    "Pull requests and code feedback",
    "Notifications and applications",
    "AI-powered insights and recommendations",
    "Progress tracking and analytics"
  ],
  "timestamp": "2025-01-08T14:30:00Z"
}
```

---

## Error Handling

### Error Response Format

All error responses follow this standard format:

```json
{
  "detail": "Error message describing what went wrong",
  "status_code": 400,
  "timestamp": "2025-01-08T14:30:00Z"
}
```

### Common HTTP Status Codes

| Code | Meaning               | Example                                 |
| ---- | --------------------- | --------------------------------------- |
| 200  | OK                    | Successful request                      |
| 201  | Created               | Resource successfully created           |
| 400  | Bad Request           | Invalid input parameters                |
| 401  | Unauthorized          | Missing or invalid authentication token |
| 403  | Forbidden             | Insufficient permissions                |
| 404  | Not Found             | Resource doesn't exist                  |
| 422  | Unprocessable Entity  | Validation error in request body        |
| 500  | Internal Server Error | Server error during processing          |

### Common Error Messages

1. **Invalid Token**

   ```json
   {
     "detail": "Invalid or expired token",
     "status_code": 401
   }
   ```

2. **Task Not Found**

   ```json
   {
     "detail": "Task not found",
     "status_code": 404
   }
   ```

3. **Invalid Input**

   ```json
   {
     "detail": "Email already registered",
     "status_code": 400
   }
   ```

4. **Server Error**
   ```json
   {
     "detail": "Failed to process query: Connection timeout",
     "status_code": 500
   }
   ```

---

## Example Requests

### Complete Authentication Flow

#### 1. Register New User

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "full_name": "Jane Smith",
    "role": "student"
  }'
```

#### 2. Login

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!"
  }'
```

#### 3. Save Tokens

```bash
# Save from login response
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Task Management Workflow

#### 1. Create Task

```bash
curl -X POST "https://localhost/agent/support-agent/api/v1/my-tasks?target_user_id=507f1f77bcf86cd799439020" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X",
    "description": "Add new feature to system",
    "priority": "high",
    "estimated_hours": 8,
    "tags": ["feature", "backend"]
  }'
```

#### 2. Get All Tasks

```bash
curl -X GET "http://localhost:8000/api/v1/my-tasks/?status=todo&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### 3. Start Task

```bash
curl -X POST "http://localhost:8000/api/v1/my-tasks/TASK_ID/start/" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### 4. Update Task Progress

```bash
curl -X PUT "http://localhost:8000/api/v1/my-tasks/TASK_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "actual_hours": 4
  }'
```

#### 5. Complete Task

```bash
curl -X POST "http://localhost:8000/api/v1/my-tasks/TASK_ID/complete/" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### AI Assistant Workflow

#### 1. Ask Question

```bash
curl -X POST https://localhost/agent/support-agent/api/v1/assistant/ask-me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What should I focus on today?",
    "include_context": true
  }'
```

#### 2. Get Progress Analysis

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/analyze-my-progress \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### 3. Get Recommendations

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/recommendations \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### 4. Get Next Best Action

```bash
curl -X GET https://localhost/agent/support-agent/api/v1/assistant/next-action \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Data Structure Models

### Task Model

```json
{
  "id": "507f1f77bcf86cd799439011",
  "user_id": "507f1f77bcf86cd799439020",
  "title": "Task Title",
  "description": "Task description",
  "status": "todo|in_progress|done|cancelled",
  "priority": "low|medium|high|urgent",
  "assignee": "user@example.com",
  "estimated_hours": 8.5,
  "actual_hours": 4.2,
  "due_date": "2025-01-10T23:59:59Z",
  "created_at": "2025-01-08T10:30:00Z",
  "updated_at": "2025-01-08T12:00:00Z",
  "completed_at": null,
  "tags": ["backend", "feature"],
  "ai_suggestions": ["Optimize database query"],
  "ai_analysis": "Well-scoped task"
}
```

### User Profile Model

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "fullName": "John Doe",
  "email": "john@example.com",
  "bio": "Full-stack developer",
  "headline": "Senior Engineer",
  "role": "student|admin|mentor",
  "skills": ["Node.js", "React"],
  "education": [],
  "workExperience": [],
  "careerGoals": "Become tech lead",
  "socialLinks": {
    "github": "https://github.com/johndoe"
  },
  "profileCompleteness": 85,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Authentication Details

### Token Format

The API uses JWT (JSON Web Tokens) for authentication.

**Token Claims:**

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "iat": 1704686400,
  "exp": 1704773200
}
```

### OAuth2/Bearer Token

Include the access token in the Authorization header for all authenticated requests:

```
Authorization: Bearer <access_token>
```

### Token Expiration

- **Access Token**: 24 hours
- **Refresh Token**: 7 days

---
