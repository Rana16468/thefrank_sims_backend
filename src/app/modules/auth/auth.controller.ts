import { RequestHandler } from "express";

import httpStatus from 'http-status';
import catchAsync from "../../utils/asyncCatch";
import AuthServices from "./auth.services";
import config from "../../config";
import sendResponse from "../../utils/sendResponse";



const loginUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUserIntoDb(req.body);
  res.cookie("refreshToken",  result.refreshToken, {
    secure: config.NODE_ENV === "production",
    httpOnly: true,
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Login",
    data: result
  });
});

const refreshToken: RequestHandler = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  console.log(refreshToken)
  const result = await AuthServices.refreshTokenIntoDb(refreshToken);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Access token is Retrived Successfully",
    data: result,
  });
});

const myprofile: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.myprofileIntoDb(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully find my profile",
    data: result,
  });
});

const chnageMyProfile: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.changeMyProfileIntoDb(
    req as any,
    req.user.id
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Change My Profile",
    data: result,
  });
});

const findByAllUsersAdmin: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.findByAllUsersAdminIntoDb(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find All Users",
    data: result,
  });
});

const deleteAccount: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.deleteAccountIntoDb(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Delete your account ",
    data: result,
  });
});

const isBlockAccount: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.isBlockAccountIntoDb(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Change Status ",
    data: result,
  });
});
const getUserGrowth: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthServices.getUserGrowthIntoDb(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Find User Growth",
    data: result,
  });
});


const recoveryKey:RequestHandler=catchAsync(async(req , res)=>{

   const result=await AuthServices.recoveryKeyIntoDb(req.body);
    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Complete Your Recovery",
    data: result,
  });
});


const findByAllUserChatList:RequestHandler=catchAsync(async(req , res)=>{


    const result=await AuthServices.findByAllUserChatListIntoDb(req.query);
    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find By All Chat List",
    data: result,
  });

});


const findBySpecificUserProfile:RequestHandler=catchAsync(async(req , res)=>{

  const result=await AuthServices.findBySpecificUserProfileIntoDb(req.params.userId);

      sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find By Specific User Profile",
    data: result,
  });


    
});







const AuthController = {
  loginUser,
  refreshToken,
  myprofile,
  chnageMyProfile,
  findByAllUsersAdmin,
  deleteAccount,
   isBlockAccount,
   getUserGrowth,
    recoveryKey,
    findByAllUserChatList,
     findBySpecificUserProfile

};

export default AuthController;
