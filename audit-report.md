# Platform-Wide Mutation Synchronization Audit Report

**Date**: 2026-06-20
**Scope**: All POST/PUT/PATCH/DELETE endpoints in `/dashboard/*` and `/user/*`
**Total endpoints**: ~80 unique invocations (30 Redux thunks + 40 component-level)
**SWR cache keys**: 2 (`/api/auth/current-user`, `/api/auth/profile`)

---

## 1. SYNC STATUS BY WORKFLOW

| Workflow | Redux Sync | Cache Invalid | Toast | Loading | Auto-Rerender | Score |
|---|---|---|---|---|---|---|
| Project CRUD (thunks) | ✅ | ✅ | ❌ | ✅ | ✅ | 3.5/5 |
| Task CRUD (thunks) | ✅ | ✅ | ❌ | ✅ | ✅ | 3.5/5 |
| Task Assign (thunks) | ✅ | ✅ | ❌ | ✅ | ✅ | 4/5 |
| Task Notes (thunks) | ✅ | ✅ | ❌ | ✅ | ✅ | 4/5 |
| Board Task CRUD (thunks) | ✅ | ✅ | ❌ | ✅ | ✅ | 4/5 |
| Board Status Drag (thunks) | ✅ | ✅ | ❌ | ✅ | ✅ | 4/5 |
| Task Refinement (thunks) | ✅ | ✅ | ❌ | ✅ | ✅ | 4/5 |
| Assessment CRUD (thunks) | ✅ | ❌ | ❌ | ✅ | ✅ | 3/5 |
| Assessment Submit (thunks) | ✅ | ❌ | ❌ | ✅ | ✅ | 3/5 |
| Notifications (thunks) | ✅ | ❌ | ❌ | ✅ | ✅(30s) | 3/5 |
| Profile/Upload (thunks) | ✅ | ❌ | ❌ | ✅ | ✅ | 3/5 |
| Company Profile (thunks) | ✅ | ❌ | ❌ | ✅ | ✅ | 3/5 |
| Support Chat (thunks) | ✅ | ❌ | ❌ | ✅ | ✅ | 3/5 |
| **Team Member CRUD** (comp) | **❌** | **❌** | **❌** | **❌** | **❌** | **0/5** |
| **Plan Generate/Save** (comp) | **❌** | **❌** | **❌** | ✅ | **❌** | **1/5** |
| **Code Review** (comp) | **❌** | **❌** | **❌** | ✅ | **❌** | **1/5** |
| **PR Link/Unlink** (comp) | **❌** | **❌** | **❌** | ✅ | **❌** | **1/5** |
| **Company Invite** (comp) | **❌** | **❌** | **❌** | **❌** | **❌** | **0/5** |
| **Legacy Task CRUD** (thunks) | ✅ | **❌** | **❌** | ✅ | ✅ | **3/5** |

---

## 2. CRITICAL FINDINGS

### 🔴 CRITICAL: Team Member / Resource Management — ZERO sync (22 endpoints)

Every team member add/remove, role creation, repo linking, invite, and validation call in:
- `ProjectDetailClient.tsx` (dashboard + user)
- `invite/page.tsx`
- `newProject.tsx` (dashboard + user)

These call `fetch()` directly. Responses go to local `useState`. **No Redux, no cache invalidation, no SWR mutate.** After adding a member, the UI list updates locally but any component reading from Redux sees stale data. Full page refresh required.

### 🔴 CRITICAL: Code Review + PR Linking — bypass Redux entirely

`user/tasks/[taskId]/page.tsx` and `board/tasks/[task_id]/page.tsx` dispatch `PATCH ${TASK_MGMT_AGENT_URL}/tasks/:id` and `POST ${CODE_REVIEW_AGENT_URL}/review` via `queueAwareFetch` at the component level. Task status changes are stored in local state. The Redux store never sees the "submitted" status. Board columns remain in "in-progress" until manual refresh.

### 🔴 CRITICAL: Plan generation/save — component-level only

`plan/page.tsx` generates and persists plans via direct `queueAwareFetch` calls. Data lives in `useState`. The `refetchKey` pattern is a workaround that re-fetches from MongoDB. No Redux state, no cache sync.

### 🟡 HIGH: Zero toast notifications from Redux thunks

Not a single thunk in any slice shows a toast. Users get zero visual feedback for any mutation through Redux (30+ thunks).

### 🟡 HIGH: Assessment slice — no cache invalidation

`createAssessment`, `updateAssessment`, `deleteAssessment`, `submitAssessment` never call `invalidatePageCache()`. If assessment list pages use `useCachedAssessments`, the cache never expires (duration = `Number.MAX_SAFE_INTEGER`).

### 🟡 HIGH: Profile updates — SWR invalidation incomplete

`user.slice.ts:updateUserProfile` calls `mutate("/api/auth/profile")` but NOT `mutate("/api/auth/current-user")`. Five consumer components read `/api/auth/current-user` via SWR and see stale data after profile update.

### 🟡 HIGH: Legacy task slice — no cache invalidation

`moveTaskAsync`, `deleteTaskAsync`, `addTaskAsync` update Redux but never invalidate `tasks` or `projects` caches. `useCachedTasks` and `useCachedProjects` remain stale.

---

## 3. FULL GAP INVENTORY

### Gap A: Missing cache invalidation (10 slice thunks)

| File | Thunk | Missing |
|---|---|---|
| `assessment.slice.ts` | `createAssessment` | `invalidatePageCache({ resource: "assessments" })` |
| `assessment.slice.ts` | `deleteAssessment` | same |
| `assessment.slice.ts` | `updateAssessment` | same + `invalidateDetailItemCache` |
| `assessment.slice.ts` | `submitAssessment` | `invalidatePageCache({ resource: "assessments" })` |
| `notifications.slice.ts` | all 4 thunks | `invalidatePageCache({ resource: "user" })` |
| `user.slice.ts` | `updateUserProfile`, `uploadFile` | `invalidateDetailItemCache({ resource: "user", id: "profile" })` |
| `company.slice.ts` | `updateCompanyProfile`, `uploadCompanyImage` | `invalidatePageCache({ resource: "companies" })` |
| `legacyTask.slice.ts` | all 3 thunks | `invalidatePageCache({ resource: "tasks", "projects" })` |

### Gap B: Component-level direct fetches (22 endpoints — NO sync)

| File | Endpoint | Method |
|---|---|---|
| `ProjectDetailClient.tsx` (dash) | `/api/project/:id` | PUT (add/remove member) |
| `ProjectDetailClient.tsx` (dash) | `/api/project/member-events` | POST |
| `ProjectDetailClient.tsx` (dash) | `/api/user/validate-for-project` | POST |
| `ProjectDetailClient.tsx` (dash) | `${PLANNER_AGENT_URL}/projects/:id` | DELETE |
| `ProjectDetailClient.tsx` (dash) | `${PLANNER_AGENT_URL}/projects/:id` | PATCH (roles) |
| `ProjectDetailClient.tsx` (dash) | `${TASK_MGMT_AGENT_URL}/sync-commits` | POST |
| `ProjectDetailClient.tsx` (dash) | `${TASK_MGMT_AGENT_URL}/generate-tasks` | POST |
| `ProjectDetailClient.tsx` (user) | `/api/project/:id` | PUT (repo, members, roles) |
| `ProjectDetailClient.tsx` (user) | `/api/project/invite` | POST |
| `ProjectDetailClient.tsx` (user) | `/api/project/remove` | POST |
| `ProjectDetailClient.tsx` (user) | `/api/user/validate-for-project` | POST |
| `ProjectDetailClient.tsx` (user) | `${TASK_MGMT_AGENT_URL}/sync-commits` | POST |
| `ProjectDetailClient.tsx` (user) | `${TASK_MGMT_AGENT_URL}/generate-tasks` | POST |
| `plan/page.tsx` | `${PLANNER_AGENT_URL}/projects/:id/plan` | POST |
| `plan/page.tsx` | `${PLANNER_AGENT_URL}/projects/:id` | PATCH |
| `task/[taskId]/page.tsx` (user) | `${TASK_MGMT_AGENT_URL}/tasks/:id` | PATCH (PR link/unlink) |
| `board/tasks/[task_id]/page.tsx` (user) | `${TASK_MGMT_AGENT_URL}/tasks/:id` | PATCH (PR link/unlink) |
| `board/tasks/[task_id]/page.tsx` (user) | `${CODE_REVIEW_AGENT_URL}/review` | POST |
| `board/tasks/[task_id]/page.tsx` (user) | `${CODE_REVIEW_AGENT_URL}/webhook/github` | POST |
| `invite/page.tsx` | `/api/company/invite` | POST |
| `invite/page.tsx` | `/api/company/member` | PATCH |
| `newProject.tsx` (both) | `/api/project` | POST |

### Gap C: SWR invalidation gaps (2 keys, 3 missing mutate calls)

| Cache Key | Missing After | Location |
|---|---|---|
| `/api/auth/current-user` | `updateUserProfile` fulfilled | `user.slice.ts:243` |
| `/api/auth/current-user` | `useUserProfile.updateProfile()` | `useUserProfile.ts` |
| `/api/auth/profile` | logout | `LogoutButton.tsx` |

### Gap D: Toast notifications — zero from Redux thunks (all ~30 thunks)

Every slice thunk has no toast on success or error.

### Gap E: Loading states — inconsistent on component-level fetches

Missing: company invite, team member add (user ProjectDetailClient).

---

## 4. REMEDIATION PLAN

### P1 — Convert 22 component fetches to Redux thunks (Critical)

Create ~8 new Redux thunks and update ~6 component files:

| New Thunk | Endpoint | Invalidates |
|---|---|---|
| `addTeamMember` | `PUT /api/project/:id` | `projects` detail + page, dashboard reinit |
| `removeTeamMember` | `PUT /api/project/:id` | same |
| `inviteTeamMember` | `POST /api/project/invite` | same |
| `linkRepo` | `POST sync-commits` | `projects` detail |
| `generateTasks` | `POST generate-tasks` | `tasks` + `projects` page |
| `submitPR` | `PATCH tasks/:id` | `tasks` detail + page |
| `triggerCodeReview` | `POST review` | `tasks` detail |
| `companyInviteOrManage` | `/api/company/*` | `user` cache |

**Files to update**: `ProjectDetailClient.tsx` (x2), `plan/page.tsx`, `task/[taskId]/page.tsx`, `board/tasks/[task_id]/page.tsx`, `invite/page.tsx`, `newProject.tsx`

### P2 — Add toast middleware to Redux store (High, 1 file)

Add a Redux middleware that catches `*/fulfilled` and `*/rejected` for mutation thunk patterns and shows toasts automatically:

```typescript
const mutationToastMiddleware: Middleware = () => (next) => (action) => {
  if (action.type.endsWith('/rejected')) {
    toast.error(action.payload || 'Operation failed');
  }
  // Optionally add success toasts for create/update/delete patterns
  return next(action);
};
```

### P3 — Add cache invalidation to 10 thunks (Medium)

Add `invalidatePageCache`/`invalidateDetailItemCache` calls to:
- `assessment.slice.ts` — all 4 mutation thunks
- `notifications.slice.ts` — all 4 mutation thunks
- `user.slice.ts` — both thunks
- `company.slice.ts` — both thunks
- `legacyTask.slice.ts` — all 3 thunks

### P4 — Fix SWR invalidation (Medium)

- `user.slice.ts`: add `mutate("/api/auth/current-user")` after profile update
- `useUserProfile.ts`: add `mutate("/api/auth/current-user")` after `updateProfile`
- `LogoutButton.tsx`: add `mutate("/api/auth/profile")` on logout

### P5 — Fix dashboard forceReinitialization null flash (Low)

Change `forceReinitialization` to NOT null out `overviewData` and `analytics` — just set `isInitialized = false`. The `DashboardProvider` effect chain will re-fetch without the UI flash.

---

## 5. VERIFICATION CHECKLIST

- [ ] P1: 22 component-level fetches → Redux thunks (auto-rerender without refresh)
- [ ] P2: Toast middleware shows success/error for all mutating thunks
- [ ] P3: Cache invalidations added to assessment, notifications, user, company, legacy slices
- [ ] P4: SWR `/api/auth/current-user` invalidated after profile update; `/api/auth/profile` after logout
- [ ] P5: No null flash from `forceReinitialization`
- [ ] **Build + lint pass with zero errors**
- [ ] End-to-end: create project, add member, create task, change status, submit assessment — all update UI without refresh
