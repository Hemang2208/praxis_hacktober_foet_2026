import dbConnect from "@/lib/dbConnect";
import { User, College, Company } from "@/models/User";

// Returns the role for a given email: 'student', 'college', or 'company'. Returns null if not found.
export async function getRoleByEmail(
  email: string,
): Promise<"student" | "college" | "company" | null> {
  await dbConnect();

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (user && user.role) return user.role;

  const college = await College.findOne({ email: normalizedEmail });
  if (college) return "college";

  const company = await Company.findOne({ email: normalizedEmail });
  if (company) return "company";
  
  return null;
}
