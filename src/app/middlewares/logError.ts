import { Request } from "express";

const logError = (err: Error, req: Request) => {
  const logerror = {
    timestamps: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  };
  console.log({
    timestamps: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  });
  return logerror;
};

export default logError;