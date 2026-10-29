# Automatic 401 Authentication Error Handling

This update implements automatic logout and redirect functionality when any API call returns a 401 Unauthorized status code.

## What's New

### 1. Global API Client (`/src/lib/api-client.ts`)

A new API client library that automatically handles 401 errors:

- `fetchWithAuth()` - Enhanced fetch with automatic 401 handling
- `fetchJsonWithAuth()` - Automatically parses JSON and handles 401s
- `swrFetcherWithAuth()` - SWR-compatible fetcher with 401 handling
- `performLogout()` - Centralized logout function that redirects to appropriate login page based on user role

### 2. Updated Components & Hooks

All authentication-related components and hooks have been updated to use the new API client:

- All SWR hooks (`useUser`, `useSupportAgent`, `useNotifications`, etc.)
- Redux slices (`user.slice.ts`, `company.slice.ts`)
- Dashboard components (`profile/page.tsx`)
- Support agent components
- Logout button component

### 3. Global Error Handler (`/src/components/GlobalAuthErrorHandler.tsx`)

A client-side component that:

- Listens for unhandled promise rejections containing 401 errors
- Intercepts global fetch calls to catch 401 responses
- Automatically triggers logout and redirect
- Added to the root layout for app-wide coverage

## How It Works

1. **API Calls**: When any fetch call returns 401 Unauthorized, the API client automatically:
   - Calls `/api/logout` to clear server-side session
   - Determines user role from JWT token
   - Redirects to appropriate login page:
     - Students: `/login`
     - Colleges: `/college/login`
     - Companies: `/company/login`

2. **SWR Integration**: All SWR hooks use `swrFetcherWithAuth` which handles 401s seamlessly

3. **Global Safety Net**: The `GlobalAuthErrorHandler` catches any 401 errors that might slip through individual components

## User Experience

When a user's session expires (token becomes invalid):

- Any API call that returns 401 will automatically log them out
- They'll be redirected to the appropriate login page for their role
- No manual logout button clicking required
- Seamless experience with no hanging authentication states

## Implementation Details

- **Zero breaking changes** - All existing API calls continue to work
- **Role-based routing** - Automatically detects user role and redirects appropriately
- **Server-side cleanup** - Calls logout API to properly clear server-side sessions
- **Client-side cleanup** - Can be extended to clear localStorage/sessionStorage if needed
- **Error prevention** - Prevents authentication errors from being logged to console

## Files Modified

- `/src/lib/api-client.ts` (new)
- `/src/components/GlobalAuthErrorHandler.tsx` (new)
- `/src/app/layout.tsx`
- `/src/redux/hooks.ts`
- `/src/hooks/useUser.ts`
- `/src/hooks/useSupportAgent.ts`
- `/src/hooks/useNotifications.ts`
- `/src/components/support-agent/SupportAgentChat.tsx`
- `/src/components/LogoutButton.tsx`
- `/src/lib/support-agent.ts`
- `/src/redux/slice/user.slice.ts`
- `/src/redux/slice/company.slice.ts`
- `/src/app/dashboard/profile/page.tsx`

## Testing

To test the automatic 401 handling:

1. Log in to the application
2. Manually expire or delete the JWT token from cookies
3. Make any API call (navigate to profile, dashboard, etc.)
4. You should be automatically redirected to the appropriate login page

The system will handle all transitions from authenticated to unauthenticated states seamlessly.
