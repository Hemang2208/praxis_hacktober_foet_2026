/**
 * Migration Guide: Redux Caching Implementation
 * 
 * This document outlines how to migrate existing pages to use the new
 * Redux caching system to eliminate redundant API calls.
 *
 * === BEFORE (Current Problem) ===
 *
 * Page loads → fetchProjects() → fetchTasks() → fetchUser() (3 separate API calls every time)
 * Navigation: overview → projects → tasks → back to overview (ALL re-fetch)
 * Problem: Redundant calls, slow navigation, bad UX
 *
 * === AFTER (With Caching) ===
 *
 * First load: overview page → Single /api/student/overview (aggregates all data)
 * Redux state: {projects, tasks, user, companies, etc.}
 * Navigation: projects → tasks → overview (NO re-fetches, instant from Redux)
 * Detail page: /project/[id] → Fetch only this project, cache it
 * Back to list: /projects → Zero API call, use Redux cache
 *
 * === IMPLEMENTATION STEPS ===
 */

// ============================================
// STEP 1: Update Overview/Dashboard Pages
// ============================================

/*
Location: /src/app/(student|college)/page.tsx or layout.tsx

OLD:
```
useEffect(() => {
  dispatch(fetchUserProfile());
  dispatch(fetchProjects());
  dispatch(fetchTasks());
}, [dispatch]);
```

NEW:
```
import { useStudentOverview } from '@/redux/hooks';

export default function Page() {
  const { data, loading, error } = useStudentOverview();
  
  if (loading) return <SkeletonLoader />;
  if (error) return <ErrorState />;
  
  return <DashboardContent data={data} />;
}
```

Benefits:
- Single API call
- Data auto-cached in Redux
- No re-fetches on navigation
*/

// ============================================
// STEP 2: Update List Pages (Projects, Tasks)
// ============================================

/*
Location: /src/app/student/projects/page.tsx

OLD:
```
const projects = useAppSelector(state => state.project.projects);
useEffect(() => {
  dispatch(fetchProjects());
}, [dispatch]);
```

NEW:
```
import { useCachedProjects } from '@/hooks/useCachedResources';

export default function Page() {
  const { projects, loading, error, isCached } = useCachedProjects(page, pageSize);
  
  // Shows skeleton on first load, but NOT on back navigation
  if (loading && !isCached) {
    return <SkeletonLoader />;
  }
  
  return (
    <>
      {isCached && <div>Loaded from cache ✓</div>}
      <ProjectsList projects={projects} />
    </>
  );
}
```

Benefits:
- Automatic cache detection
- Skeleton only on cold load
- Instant navigation with cached data
- Page doesn't re-fetch on back button
*/

// ============================================
// STEP 3: Update Detail Pages ([id])
// ============================================

/*
Location: /src/app/student/projects/[id]/page.tsx

OLD:
```
useEffect(() => {
  dispatch(fetchProjectById(id));
}, [id, dispatch]);
```

NEW:
```
import { useCachedProject } from '@/hooks/useCachedResources';

export default function Page({ params: { id } }) {
  const { project, loading, error, isCached } = useCachedProject(id);
  
  if (loading && !isCached) {
    return <SkeletonDetailLoader />;
  }
  
  return <ProjectDetail project={project} />;
}
```

Cache Behavior:
- First visit to details page → API call
- Go back to list → Cached
- Return to details page → NO API call (instant)
- Another detail page → API call (different cache entry)
- Go back to previous detail → NO API call (already cached)
*/

// ============================================
// STEP 4: Handle Mutations (Create/Update/Delete)
// ============================================

/*
Location: Any component that modifies data

OLD:
```
async function handleDelete(id) {
  await deleteProject(id);
  dispatch(fetchProjects()); // Force full re-fetch
}
```

NEW:
```
import { useInvalidateCache } from '@/hooks/useCachedResources';

function ProjectCard({ project }) {
  const { invalidateProjects } = useInvalidateCache();
  
  async function handleDelete(id) {
    await deleteProject(id);
    // Clear cache so next navigation triggers fresh fetch
    invalidateProjects();
  }
}
```

Or with optimistic updates:
```
async function handleDelete(id) {
  // Update Redux optimistically
  dispatch(removeProject(id));
  
  try {
    await deleteProject(id);
  } catch (error) {
    // Rollback optimistic update
    dispatch(addProject(cachedProject));
    invalidateProjects(); // Force refresh
  }
}
```
*/

// ============================================
// STEP 5: Update Redux Slices
// ============================================

/*
For fetchProjects thunk, ensure it:

1. Checks cache before API call:
   ```
   export const fetchProjects = createAsyncThunk(
     'project/fetchProjects',
     async (params = {}, { getState, rejectWithValue }) => {
       const state = getState();
       const cache = state.cache.projects;
       
       // Return cached data if valid
       if (cache.fetchedPages[params.page] && !isExpired(cache)) {
         return state.project.projects;
       }
       
       // Otherwise fetch from API
       const response = await apiFetch('/api/projects', {params});
       if (!response.success) return rejectWithValue(response.error);
       return response.data;
     }
   );
   ```

2. Handles pagination properly
3. Sets loading states correctly
*/

// ============================================
// STEP 6: CSS/UX: Skeleton Loading Areas
// ============================================

/*
Keep skeleton loaders lightweight on these conditions:

```
if (loading && !isCached) {
  // Only show skeleton on initial data load
  // NOT when navigating back (isCached = true)
  return <Skeleton />;
}

if (loading && isCached) {
  // Background refresh - show old data with subtle indicator
  return (
    <div className="opacity-60">
      <ProjectsList projects={projects} />
      <div className="text-xs text-gray-400">Refreshing...</div>
    </div>
  );
}
```
*/

// ============================================
// STEP 7: Global Settings (Optional)
// ============================================

/*
In store initialization or app layout:

```
import { setGlobalCacheDuration } from '@/redux/slice/cache.slice';

// Set cache to 10 minutes
dispatch(setGlobalCacheDuration(10 * 60 * 1000));

// Or per-resource
dispatch(setCacheDuration({ resource: 'projects', duration: 15 * 60 * 1000 }));
```
*/

// ============================================
// STEP 8: Testing & Verification
// ============================================

/*
1. Open app → Login → Overview page loads
   ✓ Single API call to /api/student/overview
   ✓ Redux state populated with all data
   
2. Click Projects tab
   ✓ NO API call (data from Redux)
   ✓ Projects list shows immediately
   ✓ Browser dev tools show no network requests
   
3. Click Project card → Detail page
   ✓ API call to fetch that specific project if not cached
   ✓ Redux updated with detail
   
4. Navigate back to Projects
   ✓ NO API call
   ✓ List from Redux cache
   
5. Click different Project detail
   ✓ Maybe API call (if not in detail cache)
   ✓ Redux updated
   
6. Go back to first Project detail
   ✓ NO API call (cached from step 3)
   ✓ Instant load
   
7. Create/Update/Delete project
   ✓ Mutation happens
   ✓ Cache invalidated for list
   ✓ Next navigation to list fetches fresh data
*/

// ============================================
// FILE CHECKLIST (All files to update)
// ============================================

/*
Core Infrastructure (✓ Complete):
- [x] /src/hooks/useCachedData.ts (Base hooks)
- [x] /src/hooks/useCachedResources.ts (Resource-specific)
- [x] /src/redux/slice/cache.slice.ts (Cache state)
- [x] /src/redux/store.ts (Add cache reducer)
- [x] /src/lib/apiHelpers.ts (Unified API calls)

Pages to Update (→ Next):
- [ ] /src/app/student/page.tsx (Overview)
- [ ] /src/app/student/projects/page.tsx (List)
- [ ] /src/app/student/projects/[id]/page.tsx (Detail)
- [ ] /src/app/student/tasks/page.tsx (List)
- [ ] /src/app/student/tasks/[id]/page.tsx (Detail)
- [ ] /src/app/college/page.tsx (Same pattern)
- [ ] /src/app/college/projects/page.tsx
- [ ] /src/app/college/projects/[id]/page.tsx
- [ ] /src/app/college/tasks/page.tsx
- [ ] /src/app/college/tasks/[id]/page.tsx
- [ ] /src/app/company/[company_id]/projects/page.tsx
- [ ] /src/app/company/[company_id]/projects/[id]/page.tsx
- [ ] /src/app/company/[company_id]/tasks/page.tsx
- [ ] /src/app/company/[company_id]/tasks/[id]/page.tsx
- [ ] Any other detail pages

Hooks to Update:
- [ ] /src/hooks/useProjects.ts (Use useCachedProjects)
- [ ] /src/hooks/useTasks.ts (Use useCachedTasks)
- [ ] /src/hooks/useUser.ts (Use Redux-first)

Redux Slices to Update:
- [ ] /src/redux/slice/project.slice.ts (Add cache checking)
- [ ] /src/redux/slice/task.slice.ts (Add cache checking)
- [ ] /src/redux/slice/user.slice.ts (Use overview endpoint)
*/

export const implementationGuide = {
  architecture: "Redux-first data fetching with intelligent caching",
  benefits: [
    "Zero redundant API calls when navigating",
    "Instant page transitions",
    "Single endpoint aggregation",
    "Memory-efficient caching",
    "Automatic cache invalidation",
  ],
  timeline: "Phase 1: Infrastructure ✓ | Phase 2: Pages (Next) | Phase 3: Testing",
};
