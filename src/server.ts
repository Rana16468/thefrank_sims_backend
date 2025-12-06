import http, { Server } from "http";
import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import AppError from "./app/errors/AppError";
import httpStatus from "http-status";

let server: Server;

// prevent listener leak warnings
require("events").EventEmitter.defaultMaxListeners = 20;

// ==============================
// Global graceful shutdown handlers
// ==============================

// Handle unexpected promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  shutdownServer(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdownServer(1);
});

// Handle OS signals (Manual server stop) - PM2
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  shutdownServer(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received");
  shutdownServer(0);
});


// ==============================
// Main Function
// ==============================
async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log("Database connected successfully");

    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on http://${config.host}:${config.port}`);
    });

  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Server unavailable",
      error
    );
  }
}


// =================================
// Unified graceful shutdown function
// =================================
function shutdownServer(exitCode: number) {
  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(exitCode);
    });
  } else {
    process.exit(exitCode);
  }
}


// ==============================
// Start server
// ==============================
main().then(() => {
  console.log("--- Omerabashar Server is running ---");
});
