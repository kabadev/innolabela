import mongoose from "mongoose";

// Cache the MongoDB connection
let isConnected = false;

export async function connectDB() {
  // If already connected, return the existing connection
  if (isConnected) {
    console.log("Using existing MongoDB connection");
    return;
  }

  try {
    // Connection options
    const options = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
      connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
      retryWrites: true,
      retryReads: true,
    };

    // Connect with options
    await mongoose.connect(
      process.env.MONGO_URL ??
        (() => {
          throw new Error("MONGO_URL is not defined in environment variables");
        })(),
      options
    );

    const connection = mongoose.connection;

    connection.on("connected", () => {
      isConnected = true;
      console.log("MongoDB connected successfully");
    });

    connection.on("error", (err) => {
      console.log("MongoDB connection error: " + err);
      // Don't exit the process, just log the error
      isConnected = false;
    });

    connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      isConnected = false;
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed due to app termination");
      process.exit(0);
    });

    return connection;
  } catch (error) {
    console.log("MongoDB connection error:", error);
    isConnected = false;
    // Don't exit the process, allow for retry
    throw error;
  }
}

export async function disconnect() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    isConnected = false;
    console.log("MongoDB disconnected");
  }
}
