import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const tasks = await Task.find({
      $or: [{ project: id }, { project_id: id }],
    }).select({
      ai_feedback: 0,
      comments: 0,
      "notes.content": 0,
      "notes.author": 0,
    });
    const project = await Project.findById(id).select({
      title: 1,
      description: 1,
      companyId: 1,
      company_id: 1,
      created_by: 1,
      user: 1,
      team: 1,
      team_members: 1,
    });
    return new Response(JSON.stringify({ tasks, project }), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
