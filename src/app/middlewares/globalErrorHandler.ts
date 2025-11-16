import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { TErrorSources } from "../interface/error";

import AppError from "../errors/AppError";
import config from "../config";

import handelZodError from "../error/handelZodError";
import handelValidationError from "../error/handelValidationError";
import handelCastError from "../error/handelCastError";
import handelDuplicateError from "../error/handelDuplicateError";
import logError from "./logError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalErrorHandelar: ErrorRequestHandler = (
  err,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logError(err, req);

  let statusCode = 500;
  let message = err?.message;
  let errorSources: TErrorSources = [{ path: "", message: "" }];

  if (err instanceof ZodError) {
    const simplifiedError = handelZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === "ValidationError") {
    const simplifiedError = handelValidationError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === "CastError") {
    const simplifiedError = handelCastError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.code === 11000) {
    const simplifiedError = handelDuplicateError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err?.message;
    errorSources = [{ path: "", message: err?.message }];
  } else if (err instanceof Error) {
    message = err?.message;
    errorSources = [{ path: "", message: err?.message }];
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: config.NODE_ENV === "development" ? err?.stack : null,
  });

  next();
};

export default globalErrorHandelar;
