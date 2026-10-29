#!/usr/bin/env node

/**
 * SMTP Test Script for Kiyo
 *
 * This script tests the SMTP configuration by sending a test email
 * to verify that the email service is working correctly.
 */

import "dotenv/config";
import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";
const TEST_EMAIL = "hemang.2208@gmail.com";

console.log("🧪 Starting SMTP Test...");
console.log(`📧 Environment: ${isProduction ? "production" : "development"}`);
console.log(`📧 Target email: ${TEST_EMAIL}`);
console.log("=".repeat(50));

function createTestTransporter() {
  // Priority 1: Use GoDaddy SMTP if credentials are available
  if (process.env.GODADDY_USER && process.env.GODADDY_PASS) {
    console.log("📧 Testing GoDaddy SMTP configuration...");
    console.log(`   User: ${process.env.GODADDY_USER}`);
    console.log("   Using port 465 (SSL)...");

    return nodemailer.createTransport({
      host: "smtpout.secureserver.net",
      // host: "smtp.titan.email",
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
      logger: true, // logs SMTP conversation to console
      debug: true, // include SMTP traffic in the logs
    });
  }

  // Priority 2: Fallback to Gmail if credentials are available
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
    console.log("📧 Testing Gmail SMTP as fallback...");
    console.log(`   User: ${process.env.GMAIL_USER}`);
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

  throw new Error(
    "❌ No SMTP credentials found! Please configure GODADDY_* or GMAIL_* environment variables."
  );
}

async function testSMTP() {
  try {
    // Create transporter
    const transporter = createTestTransporter();

    // Get the 'from' address (matching mailer.ts logic)
    const fromAddress =
      process.env.GODADDY_USER || process.env.GMAIL_USER || "support@kiyoai.in";

    console.log(`📧 From address: ${fromAddress}`);

    // Verify connection
    console.log("\n🔍 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully!");

    // Create test email
    const mailOptions = {
      from: fromAddress,
      to: TEST_EMAIL,
      subject: `🧪 SMTP Test - Kiyo [${new Date().toISOString()}]`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">🧪 SMTP Test Successful!</h2>
          
          <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>✅ Your SMTP configuration is working correctly!</strong></p>
            
            <h3>Test Details:</h3>
            <ul>
              <li><strong>Environment:</strong> ${
                isProduction ? "Production" : "Development"
              }</li>
              <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>From:</strong> ${fromAddress}</li>
              <li><strong>SMTP Provider:</strong> ${
                process.env.GODADDY_USER ? "GoDaddy" : "Gmail"
              }</li>
            </ul>
          </div>

          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📝 Note:</strong> This is an automated test email from Kiyo's SMTP configuration test script.</p>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          
          <p style="color: #6B7280; font-size: 14px;">
            Sent from Kiyo<br>
            <a href="https://kiyoai.in" style="color: #4F46E5;">kiyoai.in</a>
          </p>
        </div>
      `,
      text: `
🧪 SMTP Test Successful!

✅ Your SMTP configuration is working correctly!

Test Details:
- Environment: ${isProduction ? "Production" : "Development"}
- Timestamp: ${new Date().toLocaleString()}
- From: ${fromAddress}
- SMTP Provider: ${process.env.GODADDY_USER ? "GoDaddy" : "Gmail"}

📝 Note: This is an automated test email from Kiyo's SMTP configuration test script.

Sent from Kiyo
https://kiyoai.in
      `,
    };

    // Send test email
    console.log("\n📤 Sending test email...");
    console.log(`   To: ${TEST_EMAIL}`);
    console.log(`   Subject: ${mailOptions.subject}`);

    const info = await transporter.sendMail(mailOptions);

    console.log("\n🎉 Test email sent successfully!");
    console.log(`📨 Message ID: ${info.messageId}`);

    if (info.response) {
      console.log(`📋 Server response: ${info.response}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ SMTP TEST PASSED!");
    console.log(`📧 Check ${TEST_EMAIL} for the test email.`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("❌ SMTP TEST FAILED!");
    console.error("=".repeat(50));

    if (error.code) {
      console.error(`🔍 Error Code: ${error.code}`);
    }

    if (error.command) {
      console.error(`🔍 Failed Command: ${error.command}`);
    }

    console.error(`🔍 Error Message: ${error.message}`);

    if (error.response) {
      console.error(`🔍 Server Response: ${error.response}`);
    }

    console.error("\n📋 Common Issues & Solutions:");
    console.error("   • Check your email credentials in .env file");
    console.error("   • Verify GODADDY_USER and GODADDY_PASS are correct");
    console.error("   • Ensure your email service allows SMTP access");
    console.error(
      "   • Check if your firewall/network allows SMTP ports (465, 587)"
    );
    console.error(
      "   • For Gmail: Use App-specific passwords, not regular password"
    );

    process.exit(1);
  }
}

// Run the test
console.log("🚀 Initializing SMTP test...");
testSMTP()
  .then(() => {
    console.log("🏁 Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Unexpected error during test:", error);
    process.exit(1);
  });
