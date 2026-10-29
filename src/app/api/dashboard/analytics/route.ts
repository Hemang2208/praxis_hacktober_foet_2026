import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET() {
  try {
    await dbConnect();

    // Get project statistics
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'in-progress' });
    const completedProjects = await Project.countDocuments({ status: 'completed' });

    // Get task statistics
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const overdueTasks = await Task.countDocuments({
      due_date: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    // Calculate productivity score (0-100)
    const productivityScore = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Get recent activity (last 10 activities)
    const recentProjects = await Project.find()
      .sort({ updated_at: -1 })
      .limit(5)
      .select('title description updated_at status');

    const recentTasks = await Task.find()
      .sort({ updated_at: -1 })
      .limit(5)
      .select('title description updated_at status');

    const recentActivity = [
      ...recentProjects.map(project => ({
        id: project._id.toString(),
        type: 'project' as const,
        title: project.title,
        description: `Project ${project.status}`,
        timestamp: project.updated_at,
        icon: 'folder',
      })),
      ...recentTasks.map(task => ({
        id: task._id.toString(),
        type: 'task' as const,
        title: task.title,
        description: `Task ${task.status}`,
        timestamp: task.updated_at,
        icon: 'check-circle',
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Get upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingProjectDeadlines = await Project.find({
      deadline: { $gte: new Date(), $lte: thirtyDaysFromNow },
      status: { $ne: 'completed' }
    })
      .sort({ deadline: 1 })
      .limit(5)
      .select('title deadline status');

    const upcomingTaskDeadlines = await Task.find({
      due_date: { $gte: new Date(), $lte: thirtyDaysFromNow },
      status: { $ne: 'completed' }
    })
      .sort({ due_date: 1 })
      .limit(5)
      .select('title due_date status');

    const upcomingDeadlines = [
      ...upcomingProjectDeadlines.map(project => ({
        id: project._id.toString(),
        title: project.title,
        type: 'project' as const,
        deadline: project.deadline,
        status: project.status,
      })),
      ...upcomingTaskDeadlines.map(task => ({
        id: task._id.toString(),
        title: task.title,
        type: 'task' as const,
        deadline: task.due_date,
        status: task.status,
      }))
    ]
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 10);

    const analytics = {
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      productivityScore,
      recentActivity,
      upcomingDeadlines,
    };

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    console.error("Fetch Analytics Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
