import express, { Application, Request, Response } from "express";
import cors from "cors";
import config from "./app/config";
import router from "./app/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
const app: Application = express();

// parsers
app.use(express.json());
app.use(
  cors({
    origin: [""],
    credentials: true,
  })
);


// router setup
app.use("/api/v1", router);

app.get("/", (_req, res) => {
  res.send({
    status: true,
    message: "Welcome to thefrank_sims_backend backend Api",
  });
});

// global error handler middleware
app.use(globalErrorHandler);

// not found middleware
app.use(notFound);

export default app;