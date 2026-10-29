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
const TOTAL_EMAILS = 10; // Start with a smaller number to avoid restrictions
const BATCH_SIZE = 5; // Smaller batches for better stability
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay between batches

console.log("🧪 Starting SMTP Spam Test...");
console.log("⚠️  WARNING: Bulk email sending can trigger spam filters and account restrictions!");
console.log("⚠️  Start with small numbers (10-20 emails) to test your limits.");
console.log(`📧 Environment: ${isProduction ? "production" : "development"}`);
console.log(`📧 Target email: ${TEST_EMAIL}`);
console.log(`📧 Total emails to send: ${TOTAL_EMAILS}`);
console.log(`📧 Batch size: ${BATCH_SIZE}`);
console.log("=".repeat(50));

function createTestTransporter() {
  // Priority 1: Use GoDaddy SMTP if credentials are available
  if (process.env.GODADDY_USER && process.env.GODADDY_PASS) {
    console.log("📧 Testing GoDaddy SMTP configuration...");
    console.log(`   User: ${process.env.GODADDY_USER}`);
    console.log("   Using port 465 (SSL)...");

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
    // Debug environment variables
    console.log("\n🔍 Checking environment variables...");
    console.log(`   GODADDY_USER: ${process.env.GODADDY_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`   GODADDY_PASS: ${process.env.GODADDY_PASS ? '✅ Set' : '❌ Not set'}`);
    console.log(`   GMAIL_USER: ${process.env.GMAIL_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`   GMAIL_APP_PASS: ${process.env.GMAIL_APP_PASS ? '✅ Set' : '❌ Not set'}`);

    // Check if any credentials are available
    if (!process.env.GODADDY_USER && !process.env.GMAIL_USER) {
      throw new Error("❌ No email credentials found! Please set either GODADDY_* or GMAIL_* environment variables.");
    }

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

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    console.log(`\n📤 Starting bulk email sending - ${TOTAL_EMAILS} emails...`);
    console.log("=".repeat(50));

    // Send emails in batches
    for (let i = 0; i < TOTAL_EMAILS; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(TOTAL_EMAILS / BATCH_SIZE);
      const emailsInBatch = Math.min(BATCH_SIZE, TOTAL_EMAILS - i);

      console.log(
        `\n🔄 Processing Batch ${batchNumber}/${totalBatches} (${emailsInBatch} emails)...`
      );

      const batchPromises = [];

      for (let j = 0; j < emailsInBatch; j++) {
        const emailNumber = i + j + 1;
        const mailOptions = {
          from: fromAddress,
          to: TEST_EMAIL,
          subject: `🧪 SMTP Spam Test #${emailNumber} - Kiyo [${new Date().toISOString()}]`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">🧪 SMTP Spam Test Email #${emailNumber}</h2>
              
              <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>✅ This is test email ${emailNumber} of ${TOTAL_EMAILS}</strong></p>
                
                <h3>Test Details:</h3>
                <ul>
                  <li><strong>Email Number:</strong> ${emailNumber}/${TOTAL_EMAILS}</li>
                  <li><strong>Batch:</strong> ${batchNumber}/${totalBatches}</li>
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
                <p style="margin: 0;"><strong>📝 Note:</strong> This is test email #${emailNumber} from Kiyo's SMTP spam test script.</p>
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
              
              <p style="color: #6B7280; font-size: 14px;">
                Sent from Kiyo Spam Test #${emailNumber}<br>
                <a href="https://kiyoai.in" style="color: #4F46E5;">kiyoai.in</a>
              </p>
            </div>
          `,
          text: `
🧪 SMTP Spam Test Email #${emailNumber}

✅ This is test email ${emailNumber} of ${TOTAL_EMAILS}

Test Details:
- Email Number: ${emailNumber}/${TOTAL_EMAILS}
- Batch: ${batchNumber}/${totalBatches}
- Environment: ${isProduction ? "Production" : "Development"}
- Timestamp: ${new Date().toLocaleString()}
- From: ${fromAddress}
- SMTP Provider: ${process.env.GODADDY_USER ? "GoDaddy" : "Gmail"}

📝 Note: This is test email #${emailNumber} from Kiyo's SMTP spam test script.

Sent from Kiyo Spam Test #${emailNumber}
https://kiyoai.in
          `,
        };

        // Add each email send operation to the batch
        batchPromises.push(
          transporter
            .sendMail(mailOptions)
            .then((info) => {
              successCount++;
              console.log(
                `   ✅ Email ${emailNumber} sent successfully - ID: ${info.messageId}`
              );
              return { success: true, emailNumber, messageId: info.messageId };
            })
            .catch((error) => {
              errorCount++;
              console.error(
                `   ❌ Email ${emailNumber} failed: ${error.message}`
              );
              return { success: false, emailNumber, error: error.message };
            })
        );
      }

      // Wait for the current batch to complete
      await Promise.all(batchPromises);

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < TOTAL_EMAILS) {
        console.log(
          `   ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES)
        );
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n" + "=".repeat(50));
    console.log("🎉 BULK EMAIL SENDING COMPLETED!");
    console.log("=".repeat(50));
    console.log(`📊 Results Summary:`);
    console.log(`   ✅ Successful emails: ${successCount}/${TOTAL_EMAILS}`);
    console.log(`   ❌ Failed emails: ${errorCount}/${TOTAL_EMAILS}`);
    console.log(`   ⏱️  Total duration: ${duration.toFixed(2)} seconds`);
    console.log(
      `   📧 Average: ${(TOTAL_EMAILS / duration).toFixed(2)} emails/second`
    );
    console.log(`📧 Check ${TEST_EMAIL} for all ${successCount} test emails.`);
    console.log("=".repeat(50));

    if (errorCount > 0) {
      console.warn(
        `⚠️  Warning: ${errorCount} emails failed to send. Check the logs above for details.`
      );
    }
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("❌ SMTP BULK TEST FAILED!");
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
    console.error(
      "   • Rate limiting: Your email provider might be blocking bulk sends"
    );
    console.error(
      "   • Account restriction: The email account may have been temporarily restricted"
    );
    console.error(
      "   • Try using Gmail credentials instead if GoDaddy is restricted"
    );
    
    console.error("\n🔧 Quick fixes to try:");
    console.error("   1. Set GMAIL_USER and GMAIL_APP_PASS in your .env file");
    console.error("   2. Generate an App Password for Gmail (not your regular password)");
    console.error("   3. Reduce TOTAL_EMAILS to a smaller number (e.g., 10) for testing");
    console.error("   4. Wait 24-48 hours if account has been restricted");
    console.error("   5. Contact your email provider if account remains restricted");

    process.exit(1);
  }
}

// Run the test
console.log("🚀 Initializing SMTP bulk test...");
testSMTP()
  .then(() => {
    console.log("🏁 Bulk test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Unexpected error during bulk test:", error);
    process.exit(1);
  });
