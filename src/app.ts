import express, { Application, Request, Response } from "express";
import cors from "cors";
import router from "./app/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
 import cron from "node-cron";
import auto_delete_unverifyed_user from "./app/utils/auto_delete_unverifyed_user";
import AppError from "./app/errors/AppError";
import status from "http-status";
import auto_detected_subscription_expiry_date from "./app/utils/auto_detected_subscription_expiry_date";
import config from "./app/config";
import path from "path";
import cookieParser from "cookie-parser";

const app: Application = express();

// parsers
app.use(express.json());
app.use(
  cors({
    origin: [""],
    credentials: true,
  })
);
app.use(
  config.file_path as string,
  express.static(path.join(__dirname, 'public')),
);


app.use(cookieParser());
// router setup
app.use("/api/v1", router);

app.get("/", (_req, res) => {
  res.send({
    status: true,
    message: "Welcome to the frank_sims_backend backend Api",
  });
});

cron.schedule("*/10 * * * *", async () => {
  try {
    await auto_delete_unverifyed_user();
  } catch (error: any) {
    throw new AppError(
      status.BAD_REQUEST,
      "Issues in the notification cron job (every 10 minutes)",
      error
    );
  }
});

//  ssh -i thefrank_sims_ssh.pub ubuntu@16.171.28.93



cron.schedule("*/10 * * * *", async () => {
  try {
     await auto_detected_subscription_expiry_date();
    
  } catch (error: any) {
    throw new AppError(
      status.BAD_REQUEST,
        `[Cron] Error in subscription expiry cron job:`,
      error
    );
  }
});

// global error handler middleware
app.use(globalErrorHandler);

// not found middleware
app.use(notFound);

export default app;

// here is my6 aws ubuntu  server

// infos@DESKTOP-2PEJ0GR MINGW64 ~/.ssh
// $  ssh -i thefrank_sims_ssh ubuntu@16.171.28.93