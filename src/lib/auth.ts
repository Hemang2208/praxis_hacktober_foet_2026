import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import { User, IUser, College, Company } from "@/models/User";

// Update user password by email (for password reset)
export async function updateUserPasswordByEmail(email: string, newPassword: string): Promise<void> {
  await dbConnect();
  const hashed = await bcrypt.hash(newPassword, 10);
  const normalizedEmail = email.toLowerCase().trim();

  // Try User collection
  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    { password: hashed },
    { new: true }
  );
  if (user) return;

  // Try College collection
  const college = await College.findOneAndUpdate(
    { email: normalizedEmail },
    { password: hashed },
    { new: true }
  );
  if (college) return;

  // Try Company collection
  const company = await Company.findOneAndUpdate(
    { email: normalizedEmail },
    { password: hashed },
    { new: true }
  );
  if (company) return;

  throw new Error("User, College, or Company not found");
}
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { UserProfileData } from "@/redux/slice/user.slice";

// Get current user from JWT in cookies
export async function getCurrentUser(): Promise<IUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) return null;
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) return null;
    await dbConnect();
    const user = await User.findById(payload.id);
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Get user profile data serialized for client components
export async function getUserProfile(): Promise<UserProfileData | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Convert Mongoose document to plain object and fully serialize for client
    // Using JSON.parse(JSON.stringify()) ensures all special types (ObjectId, Date) are serialized
    const serializedUser = JSON.parse(JSON.stringify(user.toObject()));

    return serializedUser as UserProfileData;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}
