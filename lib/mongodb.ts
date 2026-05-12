import mongoose from "mongoose";

// Set global configuration
mongoose.set("bufferCommands", true);

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  throw new Error("Please define the MONGO_URL environment variable inside .env");
}

// Log masked URL to verify env loading without leaking secrets
console.log(`[DB] Using MONGO_URL: ${MONGO_URL.substring(0, 20)}...`);

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Set to true to allow Mongoose to queue commands while connecting
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    console.log("Creating new MongoDB connection promise...");
    cached.promise = mongoose.connect(MONGO_URL!, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB connection error:", e);
    throw e;
  }

  return cached.conn;
}

export async function disconnect() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    console.log("MongoDB disconnected manually");
  }
}
