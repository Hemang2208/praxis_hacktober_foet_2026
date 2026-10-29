import { NextResponse } from "next/server";
import { inngest } from "../../../../../inngest/client";

/**
 * 🔥 Inngest Email Test API
 * ============================================================
 * Hit this endpoint to test Inngest + Gmail integration
 *
 * Expected Result:
 *   - Browser shows success response
 *   - Inngest Dashboard shows "kiyo/email.test" event in Runs
 *   - Gmail sent to hemang.2208@gmail.com
 *
 * Required Environment Variables:
 *   - GMAIL_USER (your Gmail address)  
 *   - GMAIL_APP_PASS (Gmail app password - not your regular password)
 *   - INNGEST_APP_ID, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
 */

export async function GET() {
  try {
    // Validate required environment variables
    const requiredVars = ["GMAIL_USER", "GMAIL_APP_PASS", "INNGEST_APP_ID"];
    const missing = requiredVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.error(
        `[KIYO/API] Missing environment variables: ${missing.join(", ")}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Missing required environment variables: ${missing.join(", ")}`,
          message: "Cannot send test email without proper configuration",
          setup: [
            "1. Set GMAIL_USER to your Gmail address",
            "2. Set GMAIL_APP_PASS to your Gmail app password (not regular password)",
            "3. Ensure Inngest environment variables are configured",
          ],
        },
        { status: 400 },
      );
    }

    const testData = {
      live: true,
      time: Date.now(),
      message: "Kiyo email test via Inngest! 📧",
      timestamp: new Date().toISOString(),
      recipient: "hemang.2208@gmail.com",
      sender: process.env.GMAIL_USER,
    };

    // Send email test event to Inngest
    const eventResult = await inngest.send({
      name: "kiyo/email.test",
      data: testData,
    });

    console.log(
      `[KIYO/API] Email test event queued successfully - Event ID: ${eventResult.ids?.[0] || "unknown"}`,
    );

    return NextResponse.json({
      success: true,
      message: "📧 Email test event sent to Inngest!",
      eventQueued: true,
      eventId: eventResult.ids?.[0] || null,
      data: testData,
      instructions: [
        "1. Go to your Inngest Dashboard",
        "2. Navigate to 'Runs'",
        "3. You should see 'kiyo/email.test' event appear in real-time",
        "4. Check hemang.2208@gmail.com inbox for test email",
        "5. If email fails, check console logs for detailed error messages",
      ],
      nextSteps: [
        "The Inngest function will now attempt to send the email",
        "Check your Gmail sent folder and the recipient's inbox",
        "Monitor Inngest dashboard for function execution status",
      ],
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[KIYO/API] Inngest email test failed: ${errorMessage}`);
    return NextResponse.json(
      {
        success: false,
        eventQueued: false,
        error: errorMessage,
        message: "Failed to send email test event to Inngest",
        troubleshooting: [
          "Verify all environment variables are set correctly",
          "Check Inngest service status and configuration",
          "Ensure Gmail app password is valid (not regular password)",
          "Check network connectivity and firewall settings",
        ],
      },
      { status: 500 },
    );
  }
}
