# Kiyo: AI-Driven Project Management System

## Overview

**Kiyo** is a comprehensive AI-driven internship management platform designed to bridge the gap between Users, colleges, and companies by simulating real-world internship experiences. Leveraging artificial intelligence, it manages projects, tracks progress, and provides actionable feedback, ensuring Users develop practical skills aligned with industry standards.

---

## 🔑 Key Features

- **AI as Project Manager**  
  Assigns, monitors, and reviews tasks daily, simulating real-world projects with sprints, deadlines, and continuous feedback.

- **GitHub Integration**  
  Tracks commits, pull requests, and code quality, providing instant AI-generated feedback for skill improvement.

- **Real-World Simulations**  
  Users work on projects derived from real company requirements or curated datasets.

- **Dynamic Learning Modules**  
  Replaces "tutorial hell" with task-specific, just-in-time learning resources.

- **Performance Analytics**  
  Dashboards showing metrics like task completion rate, growth over time, and code quality.

- **Industry Collaboration**  
  Companies can access anonymized performance data to identify top talent.

- **Certification**  
  Verifiable certificates with detailed performance breakdowns.

---

## 🎯 Benefits

- **Users:** Gain hands-on, industry-simulated experience.  
- **Companies:** Identify and recruit pre-trained, job-ready candidates.  
- **Colleges:** Bridge industry-academia gaps with no additional infrastructure.

---

## 👥 User Stories

### 1. User Onboarding

- **User:** Sign up and create a profile to begin the internship journey.
- **Company:** Upload project requirements for AI simulation.
- **College:** Enroll Users and monitor their progress.
- **Admin:** Validate and manage user registrations.

### 2. AI Project Assignment

- **User:** Get daily AI-assigned tasks based on skill level.
- **AI System:** Dynamically monitor and reassign tasks.
- **College:** Assign projects based on curriculum or interest.

### 3. GitHub Integration

- **User:** Automatically track contributions via GitHub.
- **AI System:** Analyze code and provide feedback.
- **College:** Monitor all Users' GitHub activity.

### 4. Real-World Simulations

- **User:** Work on projects with real deadlines and sprint cycles.
- **Company:** Provide realistic project templates.
- **College:** Approve and view simulation content.

### 5. Dynamic Learning Modules

- **User:** Access micro-learning based on assigned tasks.
- **AI System:** Detect struggle and deliver precise help.
- **College:** Embed institutional content if needed.

### 6. Performance Analytics

- **User:** View key metrics like task progress, skills, and code quality.
- **Mentor/Admin:** Identify top-performing Users.
- **College:** Access batch-wide performance analytics.

### 7. Certification

- **User:** Earn verifiable certificates with skill metrics.
- **College:** Co-brand and issue certificates.

### 8. Industry Collaboration

- **Company:** Access performance data (anonymized) to find talent.
- **User:** Align profile with industry standards.
- **College:** Connect with companies for internship placements.

### 9. Monetization and Subscription

- **College:** Subscribe to give Users internship access.
- **User:** Use freemium model to explore the platform.
- **Company:** Pay for project integration or talent access.

### 10. Admin Control

- **Admin:** Manage users, projects, and performance analytics.
- **Admin:** Configure and monitor system activity.
- **Admin:** Handle subscriptions and tiered access.

---

## 🏗 Architecture Design Documentation

### 1. High-Level System Architecture Diagram

- **Frontend (Next.js):** Renders UI and task management dashboard.
- **API Layer (Next.js):** Manages backend logic and integrates with AI.
- **AI Engine (LLM APIs + TensorFlow.js):** Handles project/task feedback, learning modules.
- **Database (MongoDB):** Stores user, task, project, and performance data.
- **GitHub Integration Service:** Monitors User code activities.
- **External Services:** LLM APIs, cloud storage, notifications, etc.

### 2. Components Breakdown

| Component                | Description                                                              |
|--------------------------|--------------------------------------------------------------------------|
| **Frontend (Next.js)**   | UI rendering and route management using React.js                         |
| **Backend API Layer**    | Handles authentication, API calls, and logic processing                  |
| **AI Engine**            | Uses LLM APIs and TensorFlow.js for feedback and dynamic learning        |
| **GitHub Integration**   | Fetches GitHub contributions and evaluates activity                      |
| **MongoDB**              | Central database for users, tasks, feedback, performance metrics         |
| **External Services**    | Integrations with LLMs, cloud APIs, notifications, and email systems     |

### 3. Data Flow and Interaction

- **User Flow:**  
  Users receive tasks → Complete them → Get AI feedback  
  Colleges/Companies monitor and guide progress.

- **GitHub Integration Flow:**  
  Tracks activity → Sends data to backend → AI analyses code

- **AI Feedback Flow:**  
  Monitors performance → Provides actionable suggestions → Adapts tasks accordingly

### 4. Detailed Frontend Architecture (Text Version of Architecture Diagram)

#### Frontend Technology Stack

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript  
- **Styling:** Tailwind CSS + shadcn/ui + Radix UI primitives  
- **State Management:** Redux Toolkit (global domain state) + SWR (remote cache/revalidation) + local React state for UI interactions  
- **Animations & UX:** Framer Motion, GSAP, react-hot-toast  
- **Theming:** next-themes and role-specific dashboard layout patterns

#### Frontend Structural Layers

1. **Application Shell Layer**
   - Root shell is defined in `src/app/layout.tsx`.
   - Provides global wrappers:
     - `ReduxProvider` (application-wide state)
     - `CloudinaryProvider` (media/upload context)
     - `Toaster` (global notifications)
     - `ClientOnlySupportAgentChat` (authenticated floating support widget)
   - Loads global typography and `globals.css`.

2. **Routing & Experience Segmentation Layer**
   - App Router route groups split the product into clear experiences:
     - **Public marketing/auth** routes in `src/app/(public)`
     - **Company dashboard** routes in `src/app/dashboard`
     - **Student/user dashboard** routes in `src/app/user`
     - **College dashboard** routes in `src/app/college`
   - Nested route structure supports deep feature paths (projects, tasks, analytics, learning, assessments, certificates, profile/settings).

3. **Layout Composition Layer**
   - Section-specific layouts enforce consistent navigation and page framing.
   - Dedicated dashboard layout clients (`DashboardLayoutClient.tsx`) compose:
     - Sidebar/navigation shells
     - Breadcrumb/top-level UX framing
     - Feature content regions
   - Shared layout patterns are reused across company, college, and user workspaces with role-specific variants.

4. **Feature Module Layer**
   - Frontend features are organized by domain in `src/components`:
     - `dashboard`, `college`, `user`, `company`
     - `tasks`, `kanban`, `learning`, `projects`, `support-agent`
     - `ui` (reusable primitives)
   - This module-first structure keeps business workflows isolated while enabling reuse of common UI controls.

5. **State & Data Orchestration Layer**
   - Redux store (`src/redux/store.ts`) composes slices for key domains:
     - user, company, project, task, dashboard, github, assessment, learning, analytics, notifications, support chat, certificates, cache, and related UI slices.
   - SWR-based hooks in `src/hooks` manage server data fetching, caching, and revalidation.
   - Role- and feature-specific hooks (for projects/tasks/support agent/profile/notifications) encapsulate API interaction logic away from presentational components.

6. **API Integration Layer**
   - Frontend integrates with:
     - Next.js API routes under `src/app/api/*`
     - External support agent/AI services through dedicated hooks (`useSupportAgent`) and auth helpers.
   - Shared client utilities (`src/lib/api-client.ts`) provide centralized authenticated fetch behavior and 401 handling to maintain session safety.

7. **Access Control Layer**
   - `src/middleware.ts` applies route-level access control and role-based gating:
     - public route allowlist
     - planner token guard for plan flows
     - role-based guards for `dashboard` (company), `college`, and `user` sections
     - authenticated API route checks
   - Ensures frontend route visibility aligns with user role and token validity.

#### Frontend Request-to-Render Flow

1. User navigates to a route group (`(public)`, `dashboard`, `user`, `college`).  
2. Middleware validates access and role constraints.  
3. Matching layout composes shell UI and providers.  
4. Feature page loads domain components.  
5. Hooks fetch data (SWR/fetch) from Next.js API or external services.  
6. Redux/SWR state updates trigger reactive UI rendering.  
7. User interactions (task updates, assessments, notifications, support chat) loop back through APIs and refresh views.

#### Cross-Cutting Frontend Concerns

- **Scalability:** Domain-driven foldering and slice-based state partitioning support growth across user roles and modules.  
- **Maintainability:** Hooks + shared UI primitives reduce duplication and isolate business logic.  
- **Security:** Middleware + auth-aware fetch client reduce unauthorized access and stale session behavior.  
- **User Experience:** Global toast feedback, persistent dashboard shells, and client-only support chat improve continuity.

---

## 🚀 Getting Started

We've unified the entire system into a seamless Docker setup. To run the project locally:

```bash
# Clone the repository
git clone <repository-url>

# Move into the project directory
cd kiyo-internship-platform

# Copy the env template and fill in your keys
cp .env.example .env

# Ensure Docker Desktop is running, then boot up everything:
docker-compose up --build -d
```

Your frontend will be instantly live at `http://localhost:3000`.

---

by team Pikachu!!
