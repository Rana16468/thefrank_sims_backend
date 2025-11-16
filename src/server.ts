import http, { Server } from "http";
import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import AppError from "./app/errors/AppError";
import httpStatus from "http-status";


let server: Server;

// Prevent multiple event listener memory leaks
process.setMaxListeners(1);

async function main() {
  try {
    // Database Connection
    await mongoose.connect(config.database_url as string);
    console.log("Database connected successfully");

    // Start HTTP Server
    server = app.listen(config.port, () => {
      console.log(` app listening http://${config.host}:${config.port}`);
    });


    // -------------------------
    // Graceful Shutdown Handlers
    // -------------------------

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

    // Handle OS signals (Manual server stop)
    process.on("SIGTERM", () => {
      console.log("SIGTERM received");
      shutdownServer(0);
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received");
      shutdownServer(0);
    });

  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Server unavailable",
      error
    );
  }
}

// Unified shutdown logic
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

main().then(() => {
  console.log("--thefrank_sims  Server is running ---");
});
