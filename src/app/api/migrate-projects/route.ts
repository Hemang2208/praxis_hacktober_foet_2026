// API route to migrate projects and add missing status/progress fields
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";

export async function POST() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB');
    
    // Find projects without status or progress fields
    const projectsToUpdate = await Project.find({
      $or: [
        { status: { $exists: false } },
        { progress: { $exists: false } }
      ]
    });
    
    console.log(`Found ${projectsToUpdate.length} projects that need migration`);
    
    if (projectsToUpdate.length > 0) {
      // Update projects to add missing fields
      const result = await Project.updateMany(
        {
          $or: [
            { status: { $exists: false } },
            { progress: { $exists: false } }
          ]
        },
        {
          $set: {
            status: "planning",  // Default status
            progress: 0         // Default progress
          }
        }
      );
      
      console.log(`Updated ${result.modifiedCount} projects`);
      
      return NextResponse.json({
        success: true,
        message: `Migration completed successfully. Updated ${result.modifiedCount} projects.`,
        projectsFound: projectsToUpdate.length,
        projectsUpdated: result.modifiedCount
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'No projects need migration',
        projectsFound: 0,
        projectsUpdated: 0
      });
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Migration failed", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
