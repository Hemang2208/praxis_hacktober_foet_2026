const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kiyoai.in";
const LOGO_URL = BASE_URL.includes("localhost") ? "https://kiyoai.in/logo.png" : `${BASE_URL}/logo.png`;

function baseLayout(
  title: string,
  bodyContent: string,
  recipientName?: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;margin:0;padding:0;background-color:#ffffff;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff">
    <tr>
      <td align="center" style="padding:40px 10px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;">
          <tr>
            <td style="padding:0 0 32px 0;">
              <img src="${LOGO_URL}" alt="Kiyo Logo" style="height:32px;display:block;border:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 24px 0;">
              <h1 style="color:#111111;margin:0 0 16px 0;font-size:24px;font-weight:700;line-height:1.25;">${title}</h1>
              ${recipientName ? `<p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">Hi ${recipientName},</p>` : ""}
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0 0;border-top:1px solid #e5e5e5;text-align:left">
              <p style="color:#888888;font-size:13px;line-height:1.5;margin:0 0 8px 0">© ${new Date().getFullYear()} Kiyo. All rights reserved.</p>
              <p style="color:#888888;font-size:13px;line-height:1.5;margin:0">
                <a href="${BASE_URL}" style="color:#1a1a1a;text-decoration:underline">${BASE_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(url: string, text: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
  <tr>
    <td align="center">
      <a href="${url}" style="display:inline-block;background:#000000;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;text-align:center;">${text}</a>
    </td>
  </tr>
</table>`;
}

function detailLine(label: string, value: string): string {
  return `<p style="color:#555;font-size:14px;margin:4px 0"><strong>${label}:</strong> ${value}</p>`;
}

export const templates = {
  taskAssigned(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
    assignedBy?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const assignerText = opts.assignedBy ? ` by <strong>${opts.assignedBy}</strong>` : "";
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        You have been assigned a new task${assignerText} on your project board. To begin, please review the task description, check any associated checklist items, and ensure that your local repository is properly linked. Once you start working, you can update the task status directly on the project board so your team is aware of your progress.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        If you have any questions or require clarification about the task's requirements, please reach out to your project supervisor or post a comment directly on the task board.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
        ${opts.assignedBy ? detailLine("Assigned By", opts.assignedBy) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("New Task Assigned 📋", body, opts.recipientName);
  },

  taskDueSoon(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    dueDate?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        This is a friendly reminder that one of your assigned tasks is approaching its deadline. Please review the remaining requirements and verify that your progress is on track. Keeping your project board updated ensures team alignment and timely delivery.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        If you are facing any blockers or need technical support to complete this task on time, we recommend reaching out to your team members or manager as soon as possible to coordinate assistance.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.dueDate ? detailLine("Due Date", opts.dueDate) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("Task Due Soon ⏰", body, opts.recipientName);
  },

  taskOverdue(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    dueDate?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        This is a notification that one of your assigned tasks is currently overdue. Please prioritize this task and update its progress.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        If you require assistance or more time to complete the work, make sure to sync with your team members or manager.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.dueDate ? detailLine("Due Date Passed", opts.dueDate) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("Task Overdue ⚠️", body, opts.recipientName);
  },

  projectApproved(opts: {
    recipientName?: string;
    projectTitle: string;
    projectId: string;
  }) {
    const projectUrl = `${BASE_URL}/user/projects/${opts.projectId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        We are pleased to inform you that your project proposal has been officially reviewed and approved. Congratulations!
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Your project workspace, boards, and task logs are now fully unlocked. You can begin setting up your team workspace, configuring milestones, and planning sprints. To get started, click the button below to access your project dashboard and begin collaborating.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Project", opts.projectTitle)}
      </div>
      ${primaryButton(projectUrl, "View Project Workspace")}
    `;
    return baseLayout("Project Approved ✅", body, opts.recipientName);
  },

  projectRejected(opts: {
    recipientName?: string;
    projectTitle: string;
    projectId: string;
  }) {
    const projectUrl = `${BASE_URL}/user/projects/${opts.projectId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Thank you for submitting your project for review. Our administration team has reviewed the details, and unfortunately, it has not been approved in its current state.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        We encourage you to review the specific feedback and suggestions provided by the administrator. Most rejections are due to missing documentation, scope clarity, or setup issues that can be easily adjusted. You can locate the detailed feedback on your project dashboard and resubmit your proposal once the changes have been made.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Project", opts.projectTitle)}
      </div>
      ${primaryButton(projectUrl, "View Feedback Details")}
    `;
    return baseLayout("Project Update", body, opts.recipientName);
  },

  projectMemberAdded(opts: {
    recipientName?: string;
    projectTitle: string;
    projectId: string;
    role?: string;
  }) {
    const projectUrl = `${BASE_URL}/user/projects/${opts.projectId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        You have been added to the project workspace. As a member of this project, you will be able to review the project roadmap, assign/pick up tasks, collaborate on issues, link pull requests, and receive automated feedback on code submissions.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Please take a moment to access the project board using the link below to familiarize yourself with the current status and team structure.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Project", opts.projectTitle)}
        ${opts.role ? detailLine("Assigned Role", opts.role) : ""}
      </div>
      ${primaryButton(projectUrl, "Open Project Workspace")}
    `;
    return baseLayout("Added to Project", body, opts.recipientName);
  },

  codeReviewReady(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}?tab=feedback`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Your code review is complete and the analysis is ready for your inspection.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Our AI agent has conducted a comprehensive assessment of your submission, analyzing it for architectural consistency, performance efficiency, security best practices, and code cleanliness. Reviewing these line-by-line suggestions is an excellent way to learn, improve code quality, and prepare your project for final approval.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
      </div>
      ${primaryButton(taskUrl, "View Review Feedback")}
    `;
    return baseLayout("Code Review Ready 🎯", body, opts.recipientName);
  },

  codeReviewFailed(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    score?: number;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}?tab=feedback`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        We wanted to let you know that your recent submission did not pass the minimum score threshold required for this task.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Don't worry—code reviews are designed to be iterative learning loops. We highly recommend reviewing the feedback from our AI reviewer, which outlines specific issues, architectural concerns, and security vulnerabilities. Addressing these points will help you write cleaner, more robust code. Once you've made the necessary improvements, you can submit your code again for verification.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.score !== undefined ? detailLine("Submission Score", `${opts.score}/100`) : ""}
      </div>
      ${primaryButton(taskUrl, "View Detailed Feedback")}
    `;
    return baseLayout("Code Review Needs Attention", body, opts.recipientName);
  },

  assessmentReady(opts: {
    recipientName?: string;
    assessmentTitle?: string;
    assessmentId: string;
  }) {
    const assessmentUrl = `${BASE_URL}/user/assessments/${opts.assessmentId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        A new technical assessment has been assigned to you and is now available in your learning dashboard.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        This assessment is designed to evaluate core concepts, coding speed, and problem-solving skills under simulated real-world conditions. Please note that once you start, the environment may be timed and cannot be paused. Ensure you have an uninterrupted window, a stable internet connection, and any required development tools ready before launching the assessment.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${opts.assessmentTitle ? detailLine("Assessment", opts.assessmentTitle) : ""}
      </div>
      ${primaryButton(assessmentUrl, "Start Assessment")}
    `;
    return baseLayout("Assessment Ready 📝", body, opts.recipientName);
  },

  supportEscalation(opts: {
    recipientName?: string;
    reason?: string;
  }) {
    const dashboardUrl = `${BASE_URL}/user/notifications`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Your support request has been escalated and flagged for a detailed review by our senior engineering and operations team.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        We understand the urgency of your query and are investigating it as a priority. You can check the current status of your ticket, view queue position, and review replies from support agents directly in your notification dashboard at any time. We will get back to you with an update as soon as we have a resolution.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${opts.reason ? detailLine("Escalation Reason", opts.reason) : ""}
      </div>
      ${primaryButton(dashboardUrl, "View Support Dashboard")}
    `;
    return baseLayout("Support Escalation 🎫", body, opts.recipientName);
  },

  taskCompleted(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Your assigned task has been marked as completed. Thank you for your work on this task!
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        You can review the task details and status on your project board at any time.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("Task Completed ✅", body, opts.recipientName);
  },

  taskInReview(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Your task has been moved to review. The project administrators and automated code reviewers will assess your submission.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        We will notify you as soon as feedback or results are available.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("Task In Review 🔍", body, opts.recipientName);
  },

  taskRejected(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Your task has been rejected and needs attention. Please review the comments and code analysis feedback, make necessary modifications, and submit it again.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("Task Revision Required ⚠️", body, opts.recipientName);
  },

  taskBlocked(opts: {
    recipientName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
  }) {
    const taskUrl = `${BASE_URL}/user/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Your assigned task has been marked as blocked. This indicates that progress is stalled due to technical issues, dependency on other features, or external constraints.
      </p>
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        Please review the task, update its notes to specify the blocking issue, and collaborate with your team members or manager to resolve the blocker.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("Task Blocked 🛑", body, opts.recipientName);
  },

  supervisorTaskSubmitted(opts: {
    recipientName?: string;
    studentName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
    pullRequestUrl?: string;
  }) {
    const taskUrl = `${BASE_URL}/dashboard/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const studentText = opts.studentName ? `<strong>${opts.studentName}</strong>` : "A student";
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        This is a notification that ${studentText} has submitted a task for review on the project board. Please inspect the code changes and verify the implementation quality.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Student", opts.studentName || "Unknown")}
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
        ${opts.pullRequestUrl ? detailLine("Linked PR", `<a href="${opts.pullRequestUrl}" style="color:#1a1a1a;text-decoration:underline">${opts.pullRequestUrl}</a>`) : ""}
      </div>
      ${primaryButton(taskUrl, "Review Task Submission")}
    `;
    return baseLayout("Task Submitted for Review 🔍", body, opts.recipientName);
  },

  supervisorTaskBlocked(opts: {
    recipientName?: string;
    studentName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
  }) {
    const taskUrl = `${BASE_URL}/dashboard/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}`;
    const studentText = opts.studentName ? `<strong>${opts.studentName}</strong>` : "A student";
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        This is a notification that ${studentText} has marked a task as blocked on the project board. This requires your attention to help resolve the blocker.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Student", opts.studentName || "Unknown")}
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
      </div>
      ${primaryButton(taskUrl, "View Task Details")}
    `;
    return baseLayout("Task Marked as Blocked 🛑", body, opts.recipientName);
  },

  supervisorCodeReviewReady(opts: {
    recipientName?: string;
    studentName?: string;
    taskTitle: string;
    taskId: string;
    projectId?: string;
    projectTitle?: string;
    score?: number;
  }) {
    const taskUrl = `${BASE_URL}/dashboard/projects/${opts.projectId || ""}/board/tasks/${opts.taskId}?tab=feedback`;
    const studentText = opts.studentName ? `<strong>${opts.studentName}</strong>` : "A student";
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        This is a notification that the AI code review has completed for a task submission by ${studentText}. The assessment analysis and feedback are now ready for your review.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${detailLine("Student", opts.studentName || "Unknown")}
        ${detailLine("Task", opts.taskTitle)}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
        ${opts.score !== undefined ? detailLine("Review Score", `${opts.score}/100`) : ""}
      </div>
      ${primaryButton(taskUrl, "View Code Review Feedback")}
    `;
    return baseLayout("Student Code Review Completed 🎯", body, opts.recipientName);
  },

  supervisorAssessmentCreated(opts: {
    recipientName?: string;
    assessmentTitle?: string;
    assessmentId: string;
    projectId: string;
    projectTitle?: string;
  }) {
    const assessmentUrl = `${BASE_URL}/dashboard/projects/${opts.projectId}/assessment/manage`;
    const body = `
      <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 16px 0">
        A new technical assessment has been successfully created and published for your project. Project trainees have been notified to begin the assessment.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
        ${opts.assessmentTitle ? detailLine("Assessment", opts.assessmentTitle) : ""}
        ${opts.projectTitle ? detailLine("Project", opts.projectTitle) : ""}
      </div>
      ${primaryButton(assessmentUrl, "Manage Assessments")}
    `;
    return baseLayout("New Assessment Created 📝", body, opts.recipientName);
  },
};
