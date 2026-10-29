import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProjectPlan from '@/models/ProjectPlan';

export async function GET() {
  try {
    await dbConnect();

    // Get all project plans to see the actual data
    const allPlans = await ProjectPlan.find({}).limit(10);
    
    console.log('All project plans:', allPlans);

    return NextResponse.json({
      success: true,
      message: 'Debug info for project plans',
      data: {
        totalPlans: allPlans.length,
        plans: allPlans.map(plan => ({
          _id: plan._id,
          project_id: plan.project_id,
          summary: plan.summary ? plan.summary.substring(0, 100) + '...' : null,
          created_at: plan.created_at,
          updated_at: plan.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Debug endpoint error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}