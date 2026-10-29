# Cycle-Based Result Release System

This document explains the new cycle-based approach for automatic result release, which replaces the old date-based lookup system.

## Overview

The new system follows the same pattern as the payment cycle system, creating scheduled entries for each project when it's created, rather than searching for projects by creation date.

## How It Works

### 1. Project Creation

- When a new project is created via `/api/project/create` or `/api/project`
- A `ResultReleaseCycle` entry is automatically created
- The cycle is scheduled for execution exactly 7 days from project creation
- Processing time is set to 9:00 AM UTC for consistent execution

### 2. Daily Execution

- The cron job runs hourly and processes cycles scheduled for the current day
- Uses the same date range logic as the payment cycle system
- Processes all pending cycles scheduled for the target date

### 3. Result Processing

- For each pending cycle, the system:
  - Fetches assessments from the Python backend
  - Ranks participants by score
  - Determines selected candidates based on available slots
  - Sends personalized emails to all participants
  - Updates the cycle status to "completed" or "failed"

## Database Schema

### ResultReleaseCycle Model

```typescript
{
  project_id: ObjectId,           // Reference to the project
  user_id: ObjectId,              // Reference to project owner
  projectTitle: string,          // Project title for easy identification
  processingDate: Date,          // When results should be released (7 days after creation)
  status: "pending" | "completed" | "failed",
  emailsSent: number,           // Number of emails successfully sent
  error?: string,               // Error message if processing failed
  processedAt?: Date,           // When the cycle was processed
  created_at: Date,              // When the cycle was created
  updated_at: Date               // When the cycle was last updated
}
```

## API Endpoints

### `/api/result-release-cycles`

#### GET - Retrieve Cycles

- `?type=pending` - Get all pending cycles
- `?type=history&limit=50` - Get cycle history (default limit: 50)

#### POST - Execute Cycles

```json
{
  "action": "execute",
  "targetDate": "2025-09-05T00:00:00.000Z" // Optional, defaults to today
}
```

### `/api/cron/result-release`

- Unchanged - automatically uses the new cycle-based system
- Runs hourly via Vercel cron jobs

## Benefits of the New System

### 1. **Better Performance**

- No need to search through all projects by date
- Direct lookup of scheduled cycles
- Indexed queries for fast execution

### 2. **Reliability**

- Each project gets a guaranteed cycle entry
- No missed projects due to date calculation issues
- Clear audit trail of processing attempts

### 3. **Monitoring & Control**

- Easy to see pending cycles
- Clear status tracking (pending/completed/failed)
- Admin dashboard integration ready

### 4. **Consistency**

- Follows the same pattern as payment cycles
- Familiar codebase structure
- Easy to maintain and extend

## Migration from Old System

The old date-based system has been replaced with the new cycle-based approach:

### Old Approach

```typescript
// Search for projects created exactly 7 days ago
const projectsToProcess = await Project.find({
  created_at: {
    $gte: sevenDaysAgo,
    $lte: sevenDaysAgoEnd,
  },
  status: { $ne: "results-released" },
});
```

### New Approach

```typescript
// Process scheduled cycles for today
const pendingCycles = await ResultReleaseCycle.find({
  processingDate: {
    $gte: startOfDay,
    $lte: endOfDay,
  },
  status: "pending",
});
```

## Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Python backend for assessment data
- `CRON_SECRET` - Secret for cron job authentication
- All existing email configuration variables

### Vercel Cron Configuration

No changes required - existing cron job continues to work:

```json
{
  "crons": [
    {
      "path": "/api/cron/result-release",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Error Handling

### Cycle Creation Errors

- Project creation continues even if cycle creation fails
- Error logged but doesn't affect user experience

### Processing Errors

- Individual cycle failures don't stop other cycles
- Detailed error logging and status tracking
- Failed cycles can be retried manually

## Testing

### Manual Execution

```bash
# Execute cycles for today
curl -X POST /api/result-release-cycles \
  -H "Content-Type: application/json" \
  -d '{"action": "execute"}'

# Execute cycles for specific date
curl -X POST /api/result-release-cycles \
  -H "Content-Type: application/json" \
  -d '{"action": "execute", "targetDate": "2025-09-05"}'
```

### Monitoring

```bash
# Get pending cycles
curl /api/result-release-cycles?type=pending

# Get processing history
curl /api/result-release-cycles?type=history&limit=200
```

## Troubleshooting

### No Cycles Being Processed

1. Check if cycles are being created when projects are created
2. Verify the `processingDate` is set correctly
3. Check cron job logs for execution

### Emails Not Being Sent

1. Check Python backend connectivity
2. Verify assessment data availability
3. Check email service configuration

### Failed Cycles

1. Check cycle error messages in the database
2. Verify user data integrity
3. Test manual execution for specific dates

## Future Enhancements

- **Dashboard Integration**: Admin panel for cycle management
- **Retry Mechanism**: Automatic retry for failed cycles
- **Notifications**: Admin alerts for processing failures
- **Analytics**: Success rate tracking and reporting
- **Bulk Operations**: Process multiple dates at once
