import { ZodError, ZodIssue } from "zod";
import httpStatus from "http-status";
import { TErrorSources, TGenericErrorResponse } from "../interface/error";


const handelZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSources = err.issues.map((issue: ZodIssue) => {
    const lastPath = issue.path[issue.path.length - 1];

    return {
      path:
        typeof lastPath === "string" || typeof lastPath === "number"
          ? lastPath
          : String(lastPath),
      message: issue.message,
    };
  });

  return {
    statusCode: httpStatus.NOT_FOUND,
    message: "Zod Validation error",
    errorSources,
  };
};

export default handelZodError;
