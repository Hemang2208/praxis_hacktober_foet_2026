import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProjectPlan from '@/models/ProjectPlan';

export async function POST() {
  try {
    await dbConnect();

    console.log('🔧 Starting project plan migration...');

    // Find all project plans with null or missing project_id
    const plansWithNullproject_id = await ProjectPlan.find({
      $or: [
        { project_id: null },
        { project_id: { $exists: false } },
        { project_id: '' }
      ]
    });

    console.log(`📋 Found ${plansWithNullproject_id.length} plans with null/missing project_id`);

    const updateResults = [];

    for (const plan of plansWithNullproject_id) {
      try {
        // Use the document's _id as the project_id
        const updatedPlan = await ProjectPlan.findByIdAndUpdate(
          plan._id,
          { 
            project_id: plan._id.toString(),
            updated_at: new Date().toISOString()
          },
          { new: true }
        );

        updateResults.push({
          _id: plan._id.toString(),
          oldproject_id: plan.project_id,
          newproject_id: updatedPlan?.project_id,
          status: 'updated'
        });

        console.log(`✅ Updated plan ${plan._id} with project_id: ${plan._id}`);
      } catch (error) {
        updateResults.push({
          _id: plan._id.toString(),
          oldproject_id: plan.project_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        });

        console.error(`❌ Failed to update plan ${plan._id}:`, error);
      }
    }

    // Get updated stats
    const totalPlans = await ProjectPlan.countDocuments();
    const plansWithValidproject_id = await ProjectPlan.countDocuments({
      $and: [
        { project_id: { $exists: true } },
        { project_id: { $ne: null } },
        { project_id: { $ne: '' } }
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Project plan migration completed',
      results: {
        totalProcessed: plansWithNullproject_id.length,
        successful: updateResults.filter(r => r.status === 'updated').length,
        failed: updateResults.filter(r => r.status === 'failed').length,
        details: updateResults
      },
      stats: {
        totalPlans,
        plansWithValidproject_id,
        plansWithInvalidproject_id: totalPlans - plansWithValidproject_id
      }
    });

  } catch (error) {
    console.error('Error during project plan migration:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();

    // Get stats about project plans
    const totalPlans = await ProjectPlan.countDocuments();
    const plansWithValidproject_id = await ProjectPlan.countDocuments({
      $and: [
        { project_id: { $exists: true } },
        { project_id: { $ne: null } },
        { project_id: { $ne: '' } }
      ]
    });
    const plansWithNullproject_id = await ProjectPlan.countDocuments({
      $or: [
        { project_id: null },
        { project_id: { $exists: false } },
        { project_id: '' }
      ]
    });

    // Get sample plans for debugging
    const samplePlans = await ProjectPlan.find({}).select('_id project_id summary').limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        totalPlans,
        plansWithValidproject_id,
        plansWithNullproject_id,
        needsMigration: plansWithNullproject_id > 0
      },
      samplePlans: samplePlans.map(p => ({
        _id: p._id?.toString(),
        project_id: p.project_id,
        hasSummary: !!p.summary
      }))
    });

  } catch (error) {
    console.error('Error getting migration stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get migration stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}