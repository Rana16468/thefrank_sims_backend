import mongoose from 'mongoose';

import httpStatus from 'http-status';
import { TErrorSources } from '../interface/error';



const handelCastError = (err: mongoose.Error.CastError) => {
  const errorSources: TErrorSources = [
    { path: err?.path, message: err?.message },
  ];

  const statusCode = Number(httpStatus.NOT_FOUND);
  return {
    statusCode,
    message: ' InValidate id',
    errorSources,
  };
};

export default handelCastError;