import dbConnect from '@/lib/dbConnect';
import pull_request from "@/models/PullRequest";
import { NextResponse } from 'next/server';

// GET: Fetch PRs (by student or task)
export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');
  const task_id = searchParams.get('task_id');

  const query: any = {};
  if (user_id) query.user_id = user_id;
  if (task_id) query.task_id = task_id;

  if (Object.keys(query).length === 0) {
    return NextResponse.json({ success: false, error: 'user_id or task_id required' }, { status: 400 });
  }

  try {
    // Find pull requests and populate user details
    const prs = await pull_request.find(query)
      .populate({ path: 'user_id', model: 'User', select: '-password -githubToken' });
    return NextResponse.json({ success: true, prs });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  const data = await request.json();
  try {
    const pr = new pull_request({
      user_id: data.user_id,
      task_id: data.task_id,
      pull_request: {
        url: data.pull_request.url,
        branch: data.pull_request.branch,
        status: data.pull_request.status,
      },
      submitted_at: data.submitted_at ? new Date(data.submitted_at) : new Date(),
      status: data.status || 'submitted',
    });
    await pr.save();
    return NextResponse.json({ success: true, pr });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
