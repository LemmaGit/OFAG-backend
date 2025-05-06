import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({
  path: "./config.env",
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message, err);
  process.exit(1);
});

import app from "./app.js";

const db = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const connectString = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@librarydb.abvxl.mongodb.net/library_mgt`;
      // const localString = "mongodb://localhost:27017/library_mgt";
      await mongoose.connect(connectString, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("Connected ✅");
      break;
    } catch (error) {
      retries++;
      console.error(
        `MongoDB connection failed (attempt ${retries}):`,
        error.message
      );
      if (retries >= maxRetries) {
        console.error("Max retries reached. Exiting...");
        process.exit(1);
      }
      console.log("Retrying connection in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

await db();
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection lost:", err);
});
const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT} ✈️`);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message, err);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM RECEIVED. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated!");
  });
});
