import type { CompanySubrole } from "@/lib/company-rbac";
import path from "path";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kiyoai.in";

export const sendCompanyInviteEmail = async ({
  email,
  companyName,
  inviteToken,
  subrole,
}: {
  email: string;
  companyName: string;
  inviteToken: string;
  subrole: CompanySubrole;
}) => {
  const fromAddress =
    process.env.GODADDY_USER || process.env.GMAIL_USER || defaultFrom;
  const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://kiyoai.in"}/invite/accept?token=${inviteToken}`;
  await transporter.sendMail({
    from: `Kiyo Company Invite <${fromAddress}>`,
    to: email,
    subject: `Invitation to join ${companyName} on Kiyo`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
        <div style="margin-bottom: 32px;">
          <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height: 32px; display: block; border: none;" />
        </div>
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">Company Invitation</h1>
          <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 0;">
            You have been invited to join the professional workspace of <strong>${companyName}</strong> on Kiyo. By joining, you'll be able to collaborate with your team, manage assessments, review candidate profiles, and work together on project boards.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
            Role: <strong>${subrole}</strong>
          </p>
        </div>
        <div style="margin: 32px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; text-align: center; transition: background 0.2s;">
            Accept Invitation
          </a>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
          <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 8px 0;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
            &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });
};
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

function createTransporter() {
  // Priority 1: Use GoDaddy SMTP if credentials are available
  if (process.env.GODADDY_USER && process.env.GODADDY_PASS) {
    return nodemailer.createTransport({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      secureConnection: false, // TLS requires secureConnection to be false
      requireTLS: true,
      auth: {
        user: process.env.GODADDY_USER,
        pass: process.env.GODADDY_PASS,
      },
      // TLS settings for GoDaddy
      tls: {
        ciphers: "SSLv3",
      },
      // Connection pool settings to prevent ECONNRESET
      pool: true,
      maxConnections: 1, // Reduced to 1 for better stability
      maxMessages: 10, // Reduced messages per connection
      rateDelta: 1000, // 1 second
      rateLimit: 1, // 1 email per second
      // Connection timeout settings
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
      // Debug settings disabled
      debug: false,
      logger: false,
    });
  }

  // Priority 2: Fallback to Gmail if credentials are available
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  // No credentials available
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

export const transporter = createTransporter();

// Transporter exported directly without attachment wrapping

// Derive a sensible default 'from' address that matches the transporter credentials
const defaultFrom =
  process.env.GODADDY_USER || process.env.GMAIL_USER || "support@kiyoai.in";

// Verify transporter connectivity silently
(async () => {
  try {
    await transporter.verify();
  } catch {
    // Silent verification - errors will be handled when actually sending emails
  }
})();

export const sendVerificationEmail = async ({
  email,
  name,
  otp,
}: {
  email: string;
  name?: string;
  otp: string;
}) => {
  const fromAddress =
    process.env.GODADDY_USER || process.env.GMAIL_USER || defaultFrom;

  await transporter.sendMail({
    from: `"Kiyo Support" <${fromAddress}>`,
    to: email,
    subject: "🔐 Verify Your Kiyo Account - OTP Inside",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
        <div style="margin-bottom: 32px;">
          <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height: 32px; display: block; border: none;" />
        </div>
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">Verify your email address</h1>
          <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 0;">
            Hello ${name || "there"},
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
            Thank you for signing up for Kiyo. To secure your account and verify your email address, please enter the following single-use verification code in your browser window.
          </p>
        </div>
        <div style="margin: 32px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center; border: 1px solid #eeeeee;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #000000; display: inline-block;">${otp}</span>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
          <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 8px 0;">
            For security purposes, this code is only valid for the next 10 minutes. If you did not request this verification code, someone may have entered your email address by mistake, and you can safely ignore this message.
          </p>
          <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 16px 0;">
            Need help? Contact us at <a href="mailto:support@kiyoai.in" style="color: #1a1a1a; text-decoration: underline;">support@kiyoai.in</a>.
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
            &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
          </p>
        </div>
      </div>
    `,
    text: `Welcome to Kiyo!\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this verification, please ignore this email.\n\nBest regards,\nKiyo Support Team`,
  });
};

export const sendWelcomeEmail = async ({
  email,
  name,
}: {
  email: string;
  name?: string;
}) => {
  const fromAddress =
    process.env.GODADDY_USER || process.env.GMAIL_USER || defaultFrom;

  await transporter.sendMail({
    from: `"Kiyo Team" <${fromAddress}>`,
    to: email,
    subject: "🎉 Welcome to Kiyo - Let's Get Started!",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
        <div style="margin-bottom: 32px;">
          <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height: 32px; display: block; border: none;" />
        </div>
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">Welcome to Kiyo</h1>
          <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 0;">
            Hello ${name || "there"},
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
            We're thrilled to welcome you to Kiyo—your AI-powered platform for career advancement, portfolio building, and internship matching. Your account has been verified, and you can now unlock the full power of Kiyo.
          </p>
        </div>
        <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
          <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 12px 0; color: #111111;">Recommended Next Steps</h3>
          <ul style="font-size: 14px; line-height: 1.8; color: #555555; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;"><strong>Complete Your Profile</strong>: Fill in your education, experience, and career goals to get highly personalized recommendations.</li>
            <li style="margin-bottom: 6px;"><strong>Upload Your Resume</strong>: Add your latest resume so companies and placement officers can discover your work.</li>
            <li style="margin-bottom: 6px;"><strong>Explore Project Boards</strong>: Join virtual projects, collaborate with other learners, and work on real-world assignments.</li>
            <li style="margin-bottom: 6px;"><strong>Review Code Feedback</strong>: Submit your work to receive detailed, line-by-line code reviews generated by our AI agent.</li>
          </ul>
        </div>
        <div style="margin: 32px 0;">
          <a href="${process.env.NEXTAUTH_URL || "https://kiyoai.in"}/dashboard" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; text-align: center;">
            Go to Dashboard
          </a>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
          <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 16px 0;">
            Need help? Reach out to us at <a href="mailto:support@kiyoai.in" style="color: #1a1a1a; text-decoration: underline;">support@kiyoai.in</a>.
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
            &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
          </p>
        </div>
      </div>
    `,
    text: `Welcome to Kiyo!\n\nHello ${
      name || "there"
    }!\n\nWe're thrilled to have you join the Kiyo community! Your account has been successfully verified and you're now ready to explore all the amazing features we have to offer.\n\nWhat's Next?\n- Complete your profile setup\n- Explore our AI-powered features\n- Join our community discussions\n- Check out our getting started guide\n\nGet started: ${
      process.env.NEXTAUTH_URL || "https://kiyoai.in"
    }/dashboard\n\nNeed help? Contact us at support@kiyoai.in\n\nBest regards,\nKiyo Team`,
  });
};

export const sendContactEmail = async ({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  const fromAddress =
    process.env.GODADDY_USER || process.env.GMAIL_USER || defaultFrom;

  await transporter.sendMail({
    from: `"Kiyo Contact Form" <${fromAddress}>`,
    to: process.env.CONTACT_EMAIL || fromAddress,
    replyTo: email,
    subject: `📨 Contact Form: ${subject}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
        <div style="margin-bottom: 32px;">
          <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height: 32px; display: block; border: none;" />
        </div>
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">New Contact Form Submission</h1>
        </div>
        <div style="margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
          <p style="font-size: 14px; margin: 0 0 8px 0; color: #555555;"><strong>Name:</strong> ${name}</p>
          <p style="font-size: 14px; margin: 0 0 8px 0; color: #555555;"><strong>Email:</strong> ${email}</p>
          <p style="font-size: 14px; margin: 0; color: #555555;"><strong>Subject:</strong> ${subject}</p>
        </div>
        <div style="margin: 24px 0; padding: 20px; background: #ffffff; border-radius: 8px; border: 1px solid #eeeeee;">
          <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #111111;">Message:</h4>
          <p style="font-size: 14px; line-height: 1.6; color: #444444; margin: 0; white-space: pre-line;">${message}</p>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
          <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
            &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
          </p>
        </div>
      </div>
    `,
    text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
  });
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}) => {
  const fromAddress =
    from || process.env.GODADDY_USER || process.env.GMAIL_USER || defaultFrom;

  try {
    const info = await transporter.sendMail({
      from: `"Kiyo" <${fromAddress}>`,
      to,
      subject,
      html,
      text,
      replyTo,
    });

    return info;
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
};

export const generateProjectInviteHtml = ({
  recipientName,
  inviterName,
  projectTitle,
  projectUrl,
  role,
}: {
  recipientName?: string;
  inviterName?: string;
  projectTitle: string;
  projectUrl?: string;
  role?: string;
}) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
      <div style="margin-bottom: 32px;">
        <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height: 32px; display: block; border: none;" />
      </div>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">Added to Project</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 0;">
          Hello ${recipientName || "there"},
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
          ${inviterName ? `${inviterName} has` : `You have been`} added to the project board for <strong>${projectTitle}</strong>${role ? ` in the role of <strong>${role}</strong>` : ""}.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
          As a member of this project, you will be able to pick up tasks from the board, collaborate with team members, link your GitHub pull requests, and receive automated feedback on your submissions.
        </p>
      </div>
      ${projectUrl ? `
      <div style="margin: 32px 0;">
        <a href="${projectUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; text-align: center;">
          Open Project
        </a>
      </div>
      ` : ""}
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
        <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 8px 0;">
          If you don't have access, please contact your project owner.
        </p>
        <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
          &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const generateProjectInviteText = ({
  recipientName,
  inviterName,
  projectTitle,
  projectUrl,
  role,
}: {
  recipientName?: string;
  inviterName?: string;
  projectTitle: string;
  projectUrl?: string;
  role?: string;
}) => {
  return `${recipientName || "Hello"},\n\n${
    inviterName ? `${inviterName} has` : `You have been`
  } added to the project "${projectTitle}"${role ? ` as ${role}` : ""}.
${projectUrl ? `Open project: ${projectUrl}\n` : ""}\nRegards,\nKiyo`;
};

export const generateProjectRemovalHtml = ({
  recipientName,
  removerName,
  projectTitle,
  projectUrl,
  role,
}: {
  recipientName?: string;
  removerName?: string;
  projectTitle: string;
  projectUrl?: string;
  role?: string;
}) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
      <div style="margin-bottom: 32px;">
        <img src="${BASE_URL}/logo.png" alt="Kiyo Logo" style="height: 32px; display: block; border: none;" />
      </div>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; color: #111111; margin: 0 0 12px 0;">Removed from Project</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 0;">
          Hello ${recipientName || "there"},
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
          This email is to notify you that you have been removed from the project <strong>${projectTitle}</strong>${role ? ` (previously assigned as <strong>${role}</strong>)` : ""}.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #444444; margin: 12px 0 0 0;">
          As a result, you will no longer have access to this project's tasks, board, or submissions. If you believe this removal was made in error, or if you need to retain access to certain materials, please reach out to the project owner or administrator.
        </p>
      </div>
      ${projectUrl ? `
      <div style="margin: 32px 0;">
        <a href="${projectUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; text-align: center;">
          View Project
        </a>
      </div>
      ` : ""}
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
        <p style="font-size: 12px; line-height: 1.5; color: #b5b5b5; margin: 0;">
          &copy; ${new Date().getFullYear()} Kiyo. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

export const generateProjectRemovalText = ({
  recipientName,
  removerName,
  projectTitle,
  projectUrl,
  role,
}: {
  recipientName?: string;
  removerName?: string;
  projectTitle: string;
  projectUrl?: string;
  role?: string;
}) => {
  return `${recipientName || "Hello"},\n\n${
    removerName ? `${removerName} has` : `You have been`
  } removed from the project "${projectTitle}"${role ? ` (role: ${role})` : ""}.
${projectUrl ? `Project: ${projectUrl}\n` : ""}\nRegards,\nKiyo`;
};
