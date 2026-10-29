import { sendVerificationEmail } from "@/lib/mailer";
// Send OTP to email (for password reset)
export async function sendOtpToEmail(email: string, otp: string) {
  await sendVerificationEmail({ email, otp });
}

// Store OTP for email (for password reset)
export async function storeOtpForEmail(email: string, otp: string) {
  await storeOTP(email, otp);
}

// Verify OTP for email (for password reset)
// Only check if OTP is valid (do not delete)
export async function verifyOtpForEmail(email: string, otp: string): Promise<boolean> {
  await dbConnect();
  const normalizedEmail = email.toLowerCase().trim();
  const OTPModel = (await import("@/models/OTP")).default;
  const storedOTP = await OTPModel.findValidOTP(normalizedEmail, otp);
  return !!storedOTP;
}

// Clear OTP for email (after password reset)
export async function clearOtpForEmail(email: string) {
  await deleteOTP(email);
}
// Database-based OTP storage using MongoDB
import dbConnect from "@/lib/dbConnect";
import OTP from "@/models/OTP";

interface OTPData {
  otp: string;
  timestamp: number;
}

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = async (email: string, otp: string): Promise<void> => {
  try {
    await dbConnect();

    // Remove any existing OTP for this email first
    await OTP.deleteMany({ email: email.toLowerCase().trim() });

    // Create new OTP record
    const newOTP = new OTP({
      email: email.toLowerCase().trim(),
      otp,
    });

    await newOTP.save();
  } catch (error) {
    console.error("Error storing OTP:", error);
    throw new Error("Failed to store OTP");
  }
};

export const getStoredOTP = async (
  email: string
): Promise<OTPData | undefined> => {
  try {
    await dbConnect();

    const storedOTP = await OTP.findOne({
      email: email.toLowerCase().trim(),
      expiresAt: { $gt: new Date() },
    });

    if (!storedOTP) {
      return undefined;
    }

    return {
      otp: storedOTP.otp,
      timestamp: storedOTP.created_at.getTime(),
    };
  } catch (error) {
    console.error("Error retrieving OTP:", error);
    return undefined;
  }
};

export const deleteOTP = async (email: string): Promise<void> => {
  try {
    await dbConnect();
    await OTP.deleteMany({ email: email.toLowerCase().trim() });
  } catch (error) {
    console.error("Error deleting OTP:", error);
  }
};

export const isOTPExpired = (
  timestamp: number,
  expirationMinutes: number = 60
): boolean => {
  const currentTime = Date.now();
  const otpAge = currentTime - timestamp;
  const expirationTime = expirationMinutes * 60 * 1000;
  return otpAge > expirationTime;
};

export const verifyOTP = async (
  email: string,
  inputOtp: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();

    // Use the static method to find valid OTP
    const storedOTP = await OTP.findValidOTP(normalizedEmail, inputOtp);

    if (!storedOTP) {
      // Check if there's any OTP for this email (expired or not)
      const anyOTP = await OTP.findOne({ email: normalizedEmail });
      if (anyOTP) {
        if (anyOTP.isExpired()) {
          await deleteOTP(normalizedEmail);
          return {
            success: false,
            message: "OTP has expired. Please request a new one.",
          };
        } else if (anyOTP.otp !== inputOtp) {
          return { success: false, message: "Invalid OTP." };
        }
      }
      return { success: false, message: "OTP not found or expired." };
    }

    // OTP is valid, remove it from database
    await deleteOTP(normalizedEmail);
    return { success: true, message: "OTP verified successfully!" };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return {
      success: false,
      message: "Failed to verify OTP due to server error.",
    };
  }
};
