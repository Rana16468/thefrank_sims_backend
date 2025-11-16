import mongoose from "mongoose";

import httpStatus from "http-status";
import { TErrorSources, TGenericErrorResponse } from "../interface/error";


const handelValidationError = (
  err: mongoose.Error.ValidationError
): TGenericErrorResponse => {
  const errorSources: TErrorSources = Object.values(err.errors).map(
    (val: mongoose.Error.ValidatorError | mongoose.Error.CastError) => {
      return {
        path: val?.path,
        message: val?.message,
      };
    }
  );

  const statusCode = Number(httpStatus.NOT_FOUND);
  return {
    statusCode,
    message: " Validation error",
    errorSources,
  };
};

export default handelValidationError;