import { executeResultRelease } from './executeResultRelease';

/**
 * Simple in-memory scheduler for automatic result release
 * This runs checks every hour and processes projects that are exactly 7 days old
 */
class ResultReleaseScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.intervalId) {
      console.log('Result release scheduler is already running');
      return;
    }

    console.log('Starting automatic result release scheduler...');
    
    // Run immediately on start
    this.runCheck();
    
    // Then run every hour (3600000 milliseconds)
    this.intervalId = setInterval(() => {
      this.runCheck();
    }, 3600000); // 1 hour

    console.log('Result release scheduler started - will check every hour');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Result release scheduler stopped');
    }
  }

  private async runCheck(): Promise<void> {
    if (this.isRunning) {
      console.log('Result release check already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log(`[${new Date().toISOString()}] Running automatic result release check...`);

    try {
      const result = await executeResultRelease();
      
      if (result.processedProjects > 0 || result.emailsSent > 0) {
        console.log(`[${new Date().toISOString()}] Result release completed:`, {
          processedProjects: result.processedProjects,
          emailsSent: result.emailsSent,
          success: result.success
        });
      } else {
        console.log(`[${new Date().toISOString()}] No projects ready for result release`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in automatic result release:`, error);
    } finally {
      this.isRunning = false;
    }
  }

  getStatus(): { running: boolean; nextCheck: string | null } {
    return {
      running: this.intervalId !== null,
      nextCheck: this.intervalId ? new Date(Date.now() + 3600000).toISOString() : null
    };
  }
}

// Create a singleton instance
const scheduler = new ResultReleaseScheduler();

export default scheduler;

// Auto-start in production or when explicitly enabled (only at server runtime, not during build)
const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-export' ||
  process.env.NEXT_BUILD === 'true';

if (
  !isBuildPhase &&
  (process.env.NODE_ENV === 'production' || process.env.ENABLE_AUTO_RESULT_RELEASE === 'true')
) {
  // Add a small delay to ensure database connections are ready
  setTimeout(() => {
    scheduler.start();
  }, 5000);
}

