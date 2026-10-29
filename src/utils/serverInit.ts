'use server';

import { executeResultRelease } from '@/utils/executeResultRelease';

/**
 * Server-side initialization function that starts the automatic result release system
 * This is called during app startup and periodically checks for projects ready for result release
 */
export async function initializeResultReleaseSystem() {
  if (typeof window !== 'undefined') {
    // Don't run on client side
    return;
  }

  console.log('Initializing automatic result release system...');

  // Only run in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AUTO_RESULT_RELEASE === 'true') {
    console.log('Auto result release is enabled');
    
    // Import and start the scheduler dynamically to avoid client-side execution
    try {
      const { default: scheduler } = await import('@/utils/resultReleaseScheduler');
      
      // Add a small delay to ensure database connections are ready
      setTimeout(() => {
        scheduler.start();
        console.log('Result release scheduler started successfully');
      }, 5000);
    } catch (error) {
      console.error('Failed to start result release scheduler:', error);
    }
  } else {
    console.log('Auto result release is disabled (set ENABLE_AUTO_RESULT_RELEASE=true to enable)');
  }
}

/**
 * Server action to manually trigger result release
 */
export async function triggerResultRelease() {
  try {
    console.log('Manual result release triggered');
    const result = await executeResultRelease();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Manual result release failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
