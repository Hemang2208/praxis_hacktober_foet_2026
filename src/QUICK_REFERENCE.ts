/**
 * QUICK REFERENCE: Redux Caching Implementation
 * 
 * This is a one-page cheat sheet for developers implementing the caching system.
 */

// ============================================================================
// IMPORT CHEAT SHEET
// ============================================================================

// For list pages (projects, tasks, certificates):
import { useCachedProjects, useCachedTasks } from "@/hooks/useCachedResources";

// For detail pages:
import { useCachedProject, useCachedTask } from "@/hooks/useCachedResources";

// For mutations:
import { useInvalidateCache } from "@/hooks/useCachedResources";

// For override/custom usage:
import { useCachedData } from "@/hooks/useCachedData";

// For overview pages:
import { useUserOverview, useCollegeOverview } from "@/hooks/useOverview";

// ============================================================================
// PATTERN 1: List Page
// ============================================================================

/*
file: /src/app/student/projects/page.tsx

import { useCachedProjects } from '@/hooks/useCachedResources';

export default function ProjectsPage() {
  // Hook returns: projects[], loading, error, isCached
  const { projects, loading, error, isCached } = useCachedProjects(
    page,        // current page number (1-indexed)
    pageSize     // items per page (default: 10)
  );
  
  // Skeleton only on first load, NOT on back navigation
  if (loading && !isCached) return <Skeleton />;
  if (error) return <Error />;
  
  return <List items={projects} />;
}
*/

// ============================================================================
// PATTERN 2: Detail Page
// ============================================================================

/*
file: /src/app/student/projects/[id]/page.tsx

import { useCachedProject } from '@/hooks/useCachedResources';

export default function DetailPage({ params }) {
  // Hook returns: project, loading, error, isCached
  const { project, loading, error, isCached } = useCachedProject(params.id);
  
  if (loading && !isCached) return <DetailSkeleton />;
  if (error) return <Error />;
  
  return <Detail item={project} />;
}
*/

// ============================================================================
// PATTERN 3: Mutation (Create/Update/Delete)
// ============================================================================

/*
file: Any component with forms

import { useInvalidateCache } from '@/hooks/useCachedResources';

function EditForm({ item }) {
  const { invalidateProjects, invalidateTasks } = useInvalidateCache();
  
  async function handleSubmit(data) {
    // 1. Make API request
    await updateProject(item.id, data);
    
    // 2. Clear related caches so next load fetches fresh data
    invalidateProjects();
    
    // 3. Optional: redirect or refetch
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
}
*/

// ============================================================================
// PATTERN 4: Overview/Dashboard Page
// ============================================================================

/*
file: /src/app/student/page.tsx

import { useUserOverview } from '@/hooks/useOverview';

export default function DashboardPage() {
  // Single aggregated API call that returns everything
  const { data, loading, error } = useUserOverview();
  
  if (loading && !data) return <SkeletonLoader />;
  if (error) return <ErrorState />;
  
  return (
    <>
      <UserSummary user={data.user} />
      <ProjectsList projects={data.joinedProjects} />
      <TasksSummary tasks={data.tasks} />
    </>
  );
}
*/

// ============================================================================
// CACHE BEHAVIOR REFERENCE
// ============================================================================

/*
CACHE LIFECYCLE:

1. First visit to /projects/123
   → Loading: true, isCached: false
   → Shows skeleton
   → API call initiate
   → Data arrives, Redux updated
   → Cache entry created with timestamp
   → Component renders with isCached: false

2. Navigate away from detail page
   → Cache entry remains in Redux

3. Navigate back to /projects/123
   → Loading: false (no fetch), isCached: true
   → Shows data immediately
   → NO API call ✓
   → Component renders with isCached: true

4. After 5 minutes (default cache duration)
   → Cache marked as expired
   → Next visit triggers fresh API call

5. After mutation (create/update/delete)
   → Call invalidateProjects()
   → All project cache entries cleared
   → Next navigation fetches fresh data

IMPORTANT STATES:
- loading=true, isCached=false   → First load, show skeleton
- loading=true, isCached=true    → Background refresh, show old data
- loading=false, isCached=true   → Cached data, instant display
- loading=false, isCached=false  → Error or no data
*/

// ============================================================================
// HOOK SIGNATURES
// ============================================================================

/*
// List pages with pagination
useCachedProjects(page?: number, pageSize?: number)
  Returns: { projects: Project[], loading: boolean, error: string|null, isCached: boolean }

useCachedTasks(page?: number, pageSize?: number, filters?: {})
  Returns: { tasks: Task[], loading: boolean, error: string|null, isCached: boolean }

useCachedCertificates(page?: number, pageSize?: number)
  Returns: { certificates: Certificate[], loading: boolean, error: string|null, isCached: boolean }

// Detail pages
useCachedProject(projectId: string)
  Returns: { project: Project|null, loading: boolean, error: string|null, isCached: boolean }

useCachedTask(taskId: string)
  Returns: { task: Task|null, loading: boolean, error: string|null, isCached: boolean }

// Cache invalidation
useInvalidateCache()
  Returns: {
    invalidateProjects: () => void,
    invalidateTasks: () => void,
    invalidateCertificates: () => void,
    invalidateAll: () => void
  }

// Overview/Dashboard
useStudentOverview()
  Returns: { data: StudentOverviewData, loading: boolean, error: string|null, isInitialized: boolean }

useCollegeOverview()
  Returns: { data: CollegeOverviewData, loading: boolean, error: string|null, isInitialized: boolean }
*/

// ============================================================================
// COMMON MISTAKES TO AVOID
// ============================================================================

/*
❌ WRONG: Still calling dispatch(fetchProjects()) manually
✓ RIGHT: Use useCachedProjects() hook instead

❌ WRONG: Showing skeleton even when data is cached (isCached=true)
✓ RIGHT: Only show skeleton when loading && !isCached

❌ WRONG: Not invalidating cache after mutations
✓ RIGHT: Call invalidateProjects() after create/update/delete

❌ WRONG: Using useEffect with fetchProjects in dependency array
✓ RIGHT: Let useCachedProjects handle the effect internally

❌ WRONG: Assuming Redux data is always up-to-date
✓ RIGHT: Remember to invalidate cache when data changes
*/

// ============================================================================
// TESTING THE CACHE
// ============================================================================

/*
Browser DevTools Network Tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Login → Should see single /api/student/overview call
4. Click Projects tab → No network request (cached ✓)
5. Click Project detail → See /api/projects/:id call
6. Go back to Projects → No network request (cached ✓)
7. Click same Project → No network request (instant ✓)
8. Click different Project → See new /api/projects/:id call
9. Update project form → See PUT request
10. Navigate to projects → See fresh GET /api/projects (cache invalidated ✓)

Expected: 20-30% fewer network requests than before
*/

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/*
Problem: Data shows skeleton but doesn't load
Solution: Check Redux DevTools → Look for errors in slice
Fix: Verify API endpoint exists and returns correct format

Problem: Skeleton shows even when navigating back
Solution: Your logic is showing skeleton when (loading || error)
Fix: Change to: if (loading && !isCached) return <Skeleton />

Problem: Data not updating after create/update
Solution: Cache not invalidated
Fix: Call useInvalidateCache() after mutation

Problem: Too many API calls still happening
Solution: Component using old hooks, not new cached hooks
Fix: Replace useEffect + manual dispatch with useCached* hooks

Problem: Cache not clearing after 5 minutes
Solution: Cache duration might be too long
Fix: Check cache.slice.ts, default is 5 * 60 * 1000 ms

Problem: TypeScript errors with hook signatures
Solution: Check your import paths and types
Fix: Verify /src/hooks/useCachedResources.ts exists and exports are correct
*/

// ============================================================================
// PERFORMANCE CHECKLIST
// ============================================================================

/*
After implementing caching, verify:

[ ] First load to dashboard: Single /api/student/overview call
[ ] Navigate to projects: No network request visible
[ ] Click project detail: See network request for that project
[ ] Go back to projects: No network request (cached)
[ ] Return to same detail: No network request (instant load)
[ ] Form submit (update project): See network request
[ ] After form submit: Navigate to list shows fresh data (cache cleared)
[ ] Different detail page: See network request (different cache entry)
[ ] Return to first detail: No network request (cached from earlier)

Performance improvement:
- API calls reduced: Should see 20-50% fewer calls
- Page transitions: Should be instant for cached pages (< 50ms)
- Total bandwidth: Should see reduction in total data transferred
*/

// ============================================================================
// QUICK START COMMAND
// ============================================================================

/*
To implement caching for a page:

1. Open the page file
2. Find the useEffect with dispatch(fetchProjects/Tasks)
3. Replace with useCachedProjects/Tasks hook
4. Update loading check to: if (loading && !isCached)
5. Test in browser DevTools Network tab
6. Verify no redundant API calls

That's it! 30 seconds per page.
*/

export const quickRef = {
  listPage: "const { items, loading, error, isCached } = useCachedProjects();",
  detailPage:
    "const { item, loading, error, isCached } = useCachedProject(id);",
  mutation:
    "const { invalidateProjects } = useInvalidateCache(); (after API call: invalidateProjects();)",
  dashboard: "const { data, loading, error } = useStudentOverview();",
  skeleton: "if (loading && !isCached) return <Skeleton />;",
};
