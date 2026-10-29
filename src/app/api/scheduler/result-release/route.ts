import { NextRequest, NextResponse } from 'next/server';
import scheduler from '@/utils/resultReleaseScheduler';
import { executeResultRelease } from '@/utils/executeResultRelease';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return NextResponse.json({
          scheduler: scheduler.getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'start':
        scheduler.start();
        return NextResponse.json({
          message: 'Scheduler started',
          scheduler: scheduler.getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          message: 'Scheduler stopped',
          scheduler: scheduler.getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'run':
        console.log('Manual result release triggered via API');
        const result = await executeResultRelease();
        return NextResponse.json({
          message: 'Manual result release completed',
          result,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          message: 'Result Release Scheduler API',
          availableActions: ['status', 'start', 'stop', 'run'],
          currentStatus: scheduler.getStatus(),
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Scheduler API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        scheduler.start();
        return NextResponse.json({
          message: 'Scheduler started',
          scheduler: scheduler.getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          message: 'Scheduler stopped',
          scheduler: scheduler.getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'run':
        console.log('Manual result release triggered via POST API');
        const result = await executeResultRelease();
        return NextResponse.json({
          message: 'Manual result release completed',
          result,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "start", "stop", or "run"'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Scheduler API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
