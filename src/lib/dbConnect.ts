import mongoose from "mongoose";
import process from "process";

declare global {
  var mongooseCache:
    | {
      conn: typeof mongoose | null;
      promise: Promise<typeof mongoose> | null;
    }
    | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

const connectToDb = async () => {
  const mongoUri: string | undefined = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("❌ MongoDB URI is not defined in environment variables.");
    throw new Error("MongoDB URI is not defined in environment variables");
  }

  try {
    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      // Add connection options for better reliability
      cached.promise = mongoose.connect(mongoUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }

    const conn: typeof mongoose = await cached.promise;

    cached.conn = conn;
    console.log("✅ Connected to MongoDB Database:", conn.connection.host);

    // Add connection event listeners
    conn.connection.on("error", (error) => {
      cached.conn = null;
      cached.promise = null;
      console.error("❌ MongoDB connection error:", error);
    });

    conn.connection.on("disconnected", () => {
      cached.conn = null;
      cached.promise = null;
      console.log("⚠️  MongoDB disconnected");
    });

    return conn;
  } catch (error: unknown) {
    cached.promise = null;
    if (error instanceof Error) {
      console.error("❌ Error Connecting to Database:", error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    } else {
      console.error("❌ Error Connecting to Database:", error);
      throw new Error("Database connection failed: Unknown error");
    }
  }
};

const dbConnect = async () => {
  try {
    if (mongoose.connection.readyState === 1 && cached.conn) {
      console.log("✅ Using existing MongoDB connection");
      return cached.conn;
    }

    if (cached.promise) {
      console.log("🔄 Waiting for existing MongoDB connection attempt...");
      cached.conn = await cached.promise;
      return cached.conn;
    }

    console.log("🔄 Establishing new MongoDB connection...");
    return await connectToDb();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw new Error("Database connection failed");
  }
};

export default dbConnect;
