import { RequestHandler } from "express";

import UserServices from "./user.services";

import httpStatus from "http-status";
import catchAsync from "../../utils/asyncCatch";
import sendResponse from "../../utils/sendResponse";
import config from "../../config";

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.createUserIntoDb(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Recorded and Send Email",
    data: result,
  });
});
const userVarification: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.userVarificationIntoDb(
    req.body.verificationCode
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Varified Your Account",
    data: result,
  });
});

const chnagePassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.chnagePasswordIntoDb(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Change Password",
    data: result,
  });
});

const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.forgotPasswordIntoDb(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Send Email",
    data: result,
  });
});

const verificationForgotUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.verificationForgotUserIntoDb(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Verify User",
    data: result,
  });
});

const resetPassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.resetPasswordIntoDb(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Reset Password",
    data: result,
  });
});

const googleAuth: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.googleAuthIntoDb(req.body);

  const { refreshToken, accessToken } = result;
  res.cookie("refreshToken", refreshToken, {
    secure: config?.NODE_ENV === "production",
    httpOnly: true,
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Login",
    data: {
      accessToken,
    },
  });
});

const UserController = {
  createUser,
  userVarification,
  chnagePassword,
  forgotPassword,
  verificationForgotUser,
  resetPassword,
  googleAuth,
};

export default UserController;
