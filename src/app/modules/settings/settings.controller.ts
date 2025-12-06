import { RequestHandler } from "express";

import httpStatus from "http-status";
import catchAsync from "../../utils/asyncCatch";
import SettingServices from "./settings.services";
import sendResponse from "../../utils/sendResponse";

const updateAboutUs: RequestHandler = catchAsync(async (req, res) => {
  const result = await SettingServices.updateAboutUsIntoDb(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Updated ",
    data: result,
  });
});

const findByAboutUs: RequestHandler = catchAsync(async (req, res) => {
  const result = await SettingServices.findByAboutUsIntoDb();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find AboutUs",
    data: result,
  });
});

const privacyPolicys: RequestHandler = catchAsync(async (req, res) => {
  const result = await SettingServices.privacyPolicysIntoDb(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Recorded",
    data: result,
  });
});

const findByPrivacyPolicyss: RequestHandler = catchAsync(async (req, res) => {
  const result = await SettingServices.findByPrivacyPolicyssIntoDb();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find By Privacy Policy ",
    data: result,
  });
});

const termsConditions: RequestHandler = catchAsync(async (req, res) => {
  const result = await SettingServices.termsConditionsIntoDb(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Recorded",
    data: result,
  });
});

const findByTermsConditions: RequestHandler = catchAsync(async (req, res) => {
  const result = await SettingServices.findBytermsConditionsIntoDb();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find By Terms Conditions ",
    data: result,
  });
});

const SettingController = {
  updateAboutUs,
  findByAboutUs,
  privacyPolicys,
  findByPrivacyPolicyss,
  termsConditions,
  findByTermsConditions,
};

export default SettingController;
