
import dbConnect from "@/lib/dbConnect";
import {User} from "@/models/User";

// Example stub for JWT-based user creation (implement as needed)
export async function createUserInMongoDB(userData: {
  email: string;
  full_name?: string;
  username?: string;
  image_url?: string;
  role?: string;
  externaluser_id?: string;
}) {
  try {
    await dbConnect();
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log("User already exists in MongoDB:", existingUser._id);
      return existingUser;
    }
    const newUser = new User({
      ...userData,
      role: userData.role || "student",
    });
    const savedUser = await newUser.save();
    console.log("✅ User created in MongoDB:", savedUser._id);
    return savedUser;
  } catch (error) {
    console.error("❌ Error creating user in MongoDB:", error);
    throw error;
  }
}
