import httpStatus from "http-status";
import {
  TAboutUs,
  TPrivacyPolicy,
  TTermsConditions,
} from "./settings.interface";
import { aboutus, privacypolicys, termsConditions } from "./settings.modal";
import AppError from "../../errors/AppError";


const updateAboutUsIntoDb = async (payload: TAboutUs) => {
  try {
    const aboutText = payload.aboutUs?.trim() ?? "";

    if (!aboutText) {
      await aboutus.deleteMany();
      return { status: true, message: "AboutUs content cleared successfully" };
    }
    const result = await aboutus.findOneAndUpdate(
      {},
      { aboutUs: aboutText, isDelete: payload.isDelete ?? false },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return result
      ? { status: true, message: "AboutUs successfully saved" }
      : { status: false, message: "Failed to save AboutUs" };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update AboutUs in DB",
      error,
    );
  }
};

const findByAboutUsIntoDb = async () => {
  try {
    const result = await aboutus
      .findOne()
      .select("-isDelete -createdAt -updatedAt");

    return result;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update about into db",
      error,
    );
  }
};

const privacyPolicysIntoDb = async (payload: TPrivacyPolicy) => {
  try {
    const privacyPolicyText = payload.PrivacyPolicy?.trim() ?? "";

    if (!privacyPolicyText) {
      await privacypolicys.deleteMany();
      return {
        status: true,
        message: "Privacy policy content cleared successfully",
      };
    }

    const result = await privacypolicys.findOneAndUpdate(
      {},
      { PrivacyPolicy: privacyPolicyText, isDelete: payload.isDelete ?? false },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return result
      ? { status: true, message: "Privacy policy successfully saved" }
      : { status: false, message: "Failed to save privacy policy" };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to save privacy policy into DB",
      error,
    );
  }
};

const findByPrivacyPolicyssIntoDb = async () => {
  try {
    const result = await privacypolicys
      .findOne()
      .select("-isDelete -createdAt -updatedAt");

    return result;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update about into db",
      error,
    );
  }
};

// termsConditions

const termsConditionsIntoDb = async (payload: TTermsConditions) => {
  try {
    const termsConditionsText = payload.TermsConditions?.trim() ?? "";

    if (!termsConditionsText) {
      await termsConditions.deleteMany();
      return {
        status: true,
        message: "Terms and Conditions content cleared successfully",
      };
    }

    const result = await termsConditions.findOneAndUpdate(
      {},
      {
        TermsConditions: termsConditionsText,
        isDelete: payload.isDelete ?? false,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return result
      ? { status: true, message: "Terms and Conditions successfully saved" }
      : { status: false, message: "Failed to save Terms and Conditions" };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to save Terms and Conditions into DB",
      error,
    );
  }
};

const findBytermsConditionsIntoDb = async () => {
  try {
    const result = await termsConditions
      .findOne()
      .select("-isDelete -createdAt -updatedAt");

    return result;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update  termsConditions into db",
      error,
    );
  }
};

const SettingServices = {
  updateAboutUsIntoDb,
  findByAboutUsIntoDb,
  privacyPolicysIntoDb,
  findByPrivacyPolicyssIntoDb,
  termsConditionsIntoDb,
  findBytermsConditionsIntoDb,
};

export default SettingServices;
