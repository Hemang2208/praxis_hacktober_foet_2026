import { inngest } from "../client";
import { transporter } from "../../src/lib/mailer";

// Environment validation
function validateEmailConfig(): { valid: boolean; missing: string[] } {
  const required = [
    "GODADDY_USER",
    "GODADDY_PASS",
    "GMAIL_USER",
    "GMAIL_APP_PASS",
  ];
  const availableConfigs = [
    // process.env.GODADDY_USER && process.env.GODADDY_PASS,
    process.env.GMAIL_USER && process.env.GMAIL_APP_PASS,
  ];
  const hasValidConfig = availableConfigs.some((config) => config);
  return { valid: hasValidConfig, missing: hasValidConfig ? [] : required };
}

export const sendTestEmail = inngest.createFunction(
  {
    id: "kiyo-email-test",
    name: "Send Test Email via Kiyo Mailer",
    retries: 1, // Retry once on transient errors
  },
  { event: "kiyo/email.test" },
  async ({ event, step }) => {
    console.log("[KIYO/Email] Function triggered with event:", event.name);
    const { data } = event;

    return await step.run("send-test-email", async () => {
      console.log("[KIYO/Email] Starting email send step");

      // Validate environment variables
      const config = validateEmailConfig();
      if (!config.valid) {
        const error = `Missing environment variables: ${config.missing.join(", ")}`;
        console.error(`[KIYO/Email] ${error}`);
        throw new Error(error);
      }

      console.log("[KIYO/Email] Environment variables validated successfully");

      try {
        // Use the existing transporter from mailer.ts
        console.log("[KIYO/Email] Using existing transporter from mailer.ts");

        // Get the default from address
        const defaultFrom =
          process.env.GMAIL_USER ||
          process.env.GODADDY_USER ||
          process.env.GMAIL_USER ||
          "support@kiyoai.in";

        const mailOptions = {
          from: `"Kiyo Test" <${defaultFrom}>`,
          to: "hemang.2208@gmail.com", // Fixed the email format
          subject: "🧪 Kiyo Email Test - " + new Date().toLocaleString(),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🧪 Kiyo Email Test</h1>
              </div>
              
              <div style="padding: 20px; background: #f9f9f9;">
                <h2 style="color: #333;">Test Email Successful!</h2>
                <p>This email was sent via Inngest function triggered at:</p>
                <p><strong>${data.timestamp || new Date().toISOString()}</strong></p>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #667eea; margin: 0 0 10px 0;">Test Data:</h3>
                  <pre style="background: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Sent from Kiyo Platform • Inngest Function ID: kiyo-email-test
                </p>
              </div>
            </div>
          `,
          text: `
            Kiyo Email Test
            
            This email was sent via Inngest function triggered at:
            ${data.timestamp || new Date().toISOString()}
            
            Test Data:
            ${JSON.stringify(data, null, 2)}
            
            Sent from Kiyo Platform
          `,
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(
          `[KIYO/Email] Test email sent successfully to hemang.2208@gmail.com - MessageID: ${result.messageId}`,
        );

        return {
          success: true,
          messageId: result.messageId,
          recipient: "hemang.2208@gmail.com",
          timestamp: new Date().toISOString(),
          response: result.response,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown email error";
        console.error(
          `[KIYO/Email] Failed to send test email: ${errorMessage}`,
        );
        throw new Error(`Email send failed: ${errorMessage}`);
      }
    });
  },
);
