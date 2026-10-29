import { transporter } from "@/lib/mailer";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { User } from "@/models/User";
import { Assessment } from "@/redux/slice/assessment.slice";
import { executeResultReleaseCycle } from "./resultReleaseCycleManager";

interface ParticipantResult {
  user_id: string;
  userEmail: string;
  userName: string;
  project_id: string;
  projectTitle: string;
  assessment: Assessment;
  isSelected: boolean;
  rank: number;
  totalParticipants: number;
}

/**
 * Send result notification emails to participants
 */
async function sendResultMail(
  participant: ParticipantResult,
  projectResources: number,
): Promise<ReturnType<typeof transporter.sendMail>> {
  const {
    isSelected,
    userEmail,
    projectTitle,
    assessment,
    rank,
    totalParticipants,
  } = participant;

  const baseEmailContent = {
    from: `"Kiyo Results" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: `Project Selection Results - ${projectTitle}`,
  };

  if (isSelected) {
    // Selected candidate email template
    return await transporter.sendMail({
      ...baseEmailContent,
      subject: `🎉 Congratulations! You've been selected for ${projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎉 Congratulations ${
                participant.userName
              }!</h1>
              <p style="color: #6b7280; font-size: 18px; margin: 10px 0 0 0;">You've been selected for the project</p>
            </div>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
              <h2 style="color: #065f46; margin: 0 0 15px 0; font-size: 22px;">${projectTitle}</h2>
              <p style="color: #047857; margin: 0; font-size: 16px;">We're excited to have you join this project!</p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Your Assessment Performance:</h3>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px;">
                <p style="margin: 5px 0; color: #4b5563;"><strong>Score:</strong> ${
                  assessment.score?.total_score
                }/${assessment.score?.max_score} (${
                  assessment.score?.percentage
                }%)</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Rank:</strong> ${rank} out of ${totalParticipants} participants</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Selected</span></p>
              </div>
            </div>

            ${
              assessment.feedback?.overall
                ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Feedback:</h3>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #475569; line-height: 1.6;">${
                  assessment.feedback.overall
                }</p>
                ${
                  assessment.feedback.strengths &&
                  assessment.feedback.strengths.length > 0
                    ? `
                <div style="margin-top: 15px;">
                  <strong style="color: #10b981;">Strengths:</strong>
                  <ul style="margin: 5px 0; padding-left: 20px; color: #475569;">
                    ${assessment.feedback.strengths
                      .map((strength) => `<li>${strength}</li>`)
                      .join("")}
                  </ul>
                </div>
                `
                    : ""
                }
              </div>
            </div>
            `
                : ""
            }

            <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">Next Steps:</h3>
              <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>You will receive project details and team information soon</li>
                <li>Keep an eye on your email for further instructions</li>
                <li>Prepare for an exciting learning journey ahead!</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Best regards,<br>
                <strong>The Kiyo Team</strong>
              </p>
            </div>
          </div>
        </div>
      `,
    });
  } else {
    // Rejected candidate email template
    return await transporter.sendMail({
      ...baseEmailContent,
      subject: `Project Selection Results - ${projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #374151; margin: 0; font-size: 28px;">Project Selection Results</h1>
              <p style="color: #6b7280; font-size: 18px; margin: 10px 0 0 0;">Thank you for your participation, ${
                participant.userName
              }</p>
            </div>
            
            <div style="background-color: #fef3f2; padding: 20px; border-radius: 8px; border-left: 4px solid #f87171; margin-bottom: 25px;">
              <h2 style="color: #7f1d1d; margin: 0 0 15px 0; font-size: 22px;">${projectTitle}</h2>
              <p style="color: #991b1b; margin: 0; font-size: 16px;">Unfortunately, you were not selected for this project.</p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Your Assessment Performance:</h3>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px;">
                <p style="margin: 5px 0; color: #4b5563;"><strong>Score:</strong> ${
                  assessment.score?.total_score
                }/${assessment.score?.max_score} (${
                  assessment.score?.percentage
                }%)</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Rank:</strong> ${rank} out of ${totalParticipants} participants</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Available Slots:</strong> ${projectResources}</p>
              </div>
            </div>

            ${
              assessment.feedback?.overall
                ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Feedback for Improvement:</h3>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #475569; line-height: 1.6;">${
                  assessment.feedback.overall
                }</p>
                ${
                  assessment.feedback.improvements &&
                  assessment.feedback.improvements.length > 0
                    ? `
                <div style="margin-top: 15px;">
                  <strong style="color: #dc2626;">Areas for Improvement:</strong>
                  <ul style="margin: 5px 0; padding-left: 20px; color: #475569;">
                    ${assessment.feedback.improvements
                      .map((improvement) => `<li>${improvement}</li>`)
                      .join("")}
                  </ul>
                </div>
                `
                    : ""
                }
                ${
                  assessment.feedback.recommendations &&
                  assessment.feedback.recommendations.length > 0
                    ? `
                <div style="margin-top: 15px;">
                  <strong style="color: #2563eb;">Recommendations:</strong>
                  <ul style="margin: 5px 0; padding-left: 20px; color: #475569;">
                    ${assessment.feedback.recommendations
                      .map((rec) => `<li>${rec}</li>`)
                      .join("")}
                  </ul>
                </div>
                `
                    : ""
                }
              </div>
            </div>
            `
                : ""
            }

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #0c4a6e; margin: 0 0 10px 0;">Don't Give Up!</h3>
              <ul style="color: #0369a1; margin: 0; padding-left: 20px;">
                <li>Keep improving your skills and apply for future projects</li>
                <li>Use the feedback to focus your learning efforts</li>
                <li>More exciting opportunities are coming your way!</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Best regards,<br>
                <strong>The Kiyo Team</strong>
              </p>
            </div>
          </div>
        </div>
      `,
    });
  }
}

/**
 * Execute the result release process using the cycle-based approach
 * This replaces the old date-based lookup with a more structured cycle system
 */
export async function executeResultRelease(): Promise<{
  success: boolean;
  message: string;
  processedProjects: number;
  emailsSent: number;
}> {
  try {
    console.log(
      `[${new Date().toISOString()}] Starting cycle-based result release process`,
    );

    // Use the new cycle-based approach
    const result = await executeResultReleaseCycle();

    return {
      success: result.success,
      message: result.message,
      processedProjects: result.processedCycles || 0,
      emailsSent: result.totalEmailsSent || 0,
    };
  } catch (error) {
    console.error("Error in executeResultRelease:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      processedProjects: 0,
      emailsSent: 0,
    };
  }
}

/**
 * Manually trigger result release for a specific project (for testing/admin use)
 */
export async function executeResultReleaseForProject(
  project_id: string,
): Promise<{
  success: boolean;
  message: string;
  emailsSent: number;
}> {
  try {
    await dbConnect();

    const project = await Project.findById(project_id).populate(
      "user",
      "full_name email",
    );

    if (!project) {
      return {
        success: false,
        message: "Project not found",
        emailsSent: 0,
      };
    }

    if (project.status === "results-released") {
      return {
        success: false,
        message: "Results have already been released for this project",
        emailsSent: 0,
      };
    }

    const availableSlots = project.resources?.length || 1;

    // Fetch student results for this specific project from the assessment agent
    const pythonBackendUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.kiyoai.in/agent/assessment-agent";
    const resultsApiUrl = `${pythonBackendUrl}/projects/${project_id}/results`;
    console.log(
      `Attempting to fetch student results from assessment agent: ${resultsApiUrl}`,
    );

    const resultsResponse = await fetch(resultsApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!resultsResponse.ok) {
      return {
        success: false,
        message: "No results found for this project",
        emailsSent: 0,
      };
    }

    // Check if response is JSON before parsing
    const contentType = resultsResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await resultsResponse.text();
      return {
        success: false,
        message: `API returned non-JSON response. Content-Type: ${contentType}. Response: ${responseText.substring(
          0,
          200,
        )}`,
        emailsSent: 0,
      };
    }

    const resultsData = await resultsResponse.json();

    // Check if we have a results field or if the data is directly an array
    let assessments;
    if (resultsData.results && Array.isArray(resultsData.results)) {
      assessments = resultsData.results;
    } else if (Array.isArray(resultsData)) {
      assessments = resultsData;
    } else {
      return {
        success: false,
        message: "Invalid results data structure from Python backend",
        emailsSent: 0,
      };
    }

    if (assessments.length === 0) {
      return {
        success: false,
        message: "No results found for this project",
        emailsSent: 0,
      };
    }

    const sortedAssessments = assessments
      .filter(
        (assessment: Assessment) => {
          const validStatus = ["completed", "Completed", "submitted", "Submitted"];
          return (
            assessment.score &&
            assessment.score.percentage !== undefined &&
            validStatus.includes(assessment.status) &&
            assessment.user_id
          );
        }
      )
      .sort(
        (a: Assessment, b: Assessment) =>
          (b.score?.percentage || 0) - (a.score?.percentage || 0),
      );

    let emailsSent = 0;

    // Track sent emails to avoid duplicates
    const sentEmails = new Set();
    for (let i = 0; i < sortedAssessments.length; i++) {
      const assessment = sortedAssessments[i];
        // Debug log: show assessment info
        console.log('[ResultRelease] Processing assessment:', {
          user_id: assessment.user_id,
          user_email: assessment.user_email,
          submission_id: assessment.submission_id,
          assessment_id: assessment.assessment_id,
          status: assessment.status
        });

      let user = null;

      // Try to find user by different assessment fields
      if (assessment.user_id) {
        user = await User.findById(assessment.user_id);
        console.log('[ResultRelease] User lookup by user_id:', assessment.user_id, 'Result:', user);
      } else if (assessment.user_id) {
        user = await User.findById(assessment.user_id);
          console.log('[ResultRelease] User lookup by user_id:', assessment.user_id, 'Result:', user);
      } else if (assessment.submission_id) {
        user = await User.findOne({
          $or: [
            { _id: assessment.submission_id },
            { email: assessment.user_email },
            { username: assessment.username },
          ],
        });
          console.log('[ResultRelease] User lookup by submission_id/email/username:', {
            submission_id: assessment.submission_id,
            user_email: assessment.user_email,
            username: assessment.username
          }, 'Result:', user);
      }

      if (!user || !user.email) {
        // Additional fallback: try to find user by any email field in assessment
        if (assessment.user_email || assessment.email) {
          user = await User.findOne({
            email: assessment.user_email || assessment.email,
          });
            console.log('[ResultRelease] Fallback user lookup by email:', assessment.user_email || assessment.email, 'Result:', user);
        }

        if (!user) {
          console.log(`Skipping: No user found for assessment ${assessment._id || assessment.submission_id}`);
          continue;
        }
      }

        // Debug log: found user for email sending
        if (user && user.email) {
          console.log('[ResultRelease] Found user for email:', user.email, 'User:', user);
        }
      // Prevent duplicate emails
      if (sentEmails.has(user.email)) {
        console.log(`Skipping duplicate email for user: ${user.email}`);
        continue;
      }

      const isSelected = i < availableSlots;
      const rank = i + 1;

      // Update assessment status based on selection
      const finalStatus = isSelected ? "Selected" : "Not Selected";

      const participantResult: ParticipantResult = {
        user_id: user._id.toString(),
        userEmail: user.email,
        userName: user.full_name,
        project_id: project._id.toString(),
        projectTitle: project.title,
        assessment: {
          ...assessment,
          status: finalStatus, // Override status based on selection
        },
        isSelected,
        rank,
        totalParticipants: sortedAssessments.length,
      };

      try {
        const info = await sendResultMail(participantResult, availableSlots);
        emailsSent++;
        sentEmails.add(user.email);
        if (info && typeof info === 'object' && 'response' in info) {
          console.log(`Email sent to ${user.email}:`, info.response);
        } else {
          console.log(`Email sent to ${user.email}:`, info);
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
        if (emailError && emailError.response) {
          console.error(`SMTP response for ${user.email}:`, emailError.response);
        }
        if (emailError && emailError.code) {
          console.error(`SMTP error code for ${user.email}:`, emailError.code);
        }
        if (emailError && emailError.command) {
          console.error(`SMTP command for ${user.email}:`, emailError.command);
        }
        if (emailError && emailError.rejected) {
          console.error(`Rejected recipients for ${user.email}:`, emailError.rejected);
        }
        if (emailError && emailError.stack) {
          console.error(`Error stack for ${user.email}:`, emailError.stack);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update project status
    await Project.findByIdAndUpdate(project_id, {
      status: "results-released",
      updated_at: new Date(),
    });

    return {
      success: true,
      message: `Results released successfully for project "${project.title}". Sent ${emailsSent} emails.`,
      emailsSent,
    };
  } catch (error) {
    console.error("Error in executeResultReleaseForProject:", error);
    return {
      success: false,
      message: `Failed to release results: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      emailsSent: 0,
    };
  }
}
