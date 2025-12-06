
import mongoose from "mongoose";
import httpStatus from "http-status";
import fs from "fs";

import path from "path";
import users from "../users/users.model";
import { USER_ACCESSIBILITY, USER_ROLE } from "../users/user.constant";
import AppError from "../../errors/AppError";
import { jwtHelpers } from "../../helper/jwtHelpers";
import config from "../../config";
import QueryBuilder from "../../builder/QueryBuilder";
import { TUser } from "../users/users.interface";
import { ProfileUpdateResponse, RequestWithFile, user_search_filed } from './auth.constant';


const loginUserIntoDb = async (payload: {
  email: string;
  password: string;
  fcm?: string;
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const isUserExist = await users.findOne(
      {
        $and: [
          { email: payload.email },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      {
        password: 1,
        _id: 1,
        isVerify: 1,
        email: 1,
        role: 1,
        twoFactorEnabled: 1,
      },
      { session },
    );

    if (!isUserExist) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found", "");
    }

    const checkedFcm = await users.findOneAndUpdate(
      { email: payload.email },
      {
        $set: {
          fcm: payload?.fcm,
        },
      },
      { new: true, upsert: true, session },
    );

    if (!checkedFcm) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "issues by the fcm token updatation",
        "",
      );
    }

    if (
      !(await users.isPasswordMatched(payload?.password, isUserExist.password))
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "This Password Not Matched", "");
    }

    const jwtPayload = {
      id: isUserExist.id,
      role: isUserExist.role,
      email: isUserExist.email,
    };

    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (isUserExist.isVerify) {
      accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );

      refreshToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_refresh_secret as string,
        config.refresh_expires_in as string,
      );
    } else if (isUserExist.isVerify) {
      accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );

      refreshToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_refresh_secret as string,
        config.refresh_expires_in as string,
      );
    }
    await session.commitTransaction();

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const refreshTokenIntoDb = async (token: string) => {
  try {
    const decoded = jwtHelpers.verifyToken(
      token,
      config.jwt_refresh_secret as string,
    );

    const { id } = decoded;

    const isUserExist = await users.findOne(
      {
        $and: [
          { _id: id },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { _id: 1, isVerify: 1, email: 1 },
    );

    if (!isUserExist) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found", "");
    }
    let accessToken: string | null = null;
    if (isUserExist.isVerify) {
      const jwtPayload = {
        id: isUserExist.id,
        role: isUserExist.role,
        email: isUserExist.email,
      };
      accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );
    }

    return {
      accessToken,
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "refresh Token generator error",
      error,
    );
  }
};

const myprofileIntoDb = async (id: string) => {
  try {
    return await users
      .findById(id)
      .select("name email location photo ");
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "issues by the get my profile section server  error",
      error,
    );
  }
};

/**
 * @param req
 * @param id
 * @returns
 */
const changeMyProfileIntoDb = async (
  req: RequestWithFile,
  id: string,
): Promise<ProfileUpdateResponse> => {
  try {
    const file = req.file;
    const { name, location} = req.body as {
      name?: string;
      location?: string;
      
    };

    const updateData: {
      name?: string;
      photo?: string;
      location?: string;
    
    } = {};

    if (name) {
      updateData.name = name;
    }
    if (location) {
      updateData.location = location;
    }
    
    if (file) {
      updateData.photo = file?.path?.replace(/\\/g, "/");
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "No data provided for update",
        "",
      );
    }

    const result = await users.findByIdAndUpdate(
      id,
      { $set: { ...updateData } },
      {
        new: true,
        upsert: true,
      },
    );

    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found", "");
    }

    return {
      status: true,
      message: "Successfully updated profile",
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Profile update failed",
      error.message,
    );
  }
};


const findByAllUsersAdminIntoDb = async (query: Record<string, unknown>) => {
  try {
    const allUsersdQuery = new QueryBuilder(
      users
        .find({ isVerify: true, isDelete: false })
        .select(
          "name email phoneNumber location photo recoveryKey  createdAt status",
        ),
      query,
    )
      .search(user_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_users = await allUsersdQuery.modelQuery;
    const meta = await allUsersdQuery.countTotal();

    return { meta, all_users };
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "find By All User Admin IntoDb server unavailable",
      error,
    );
  }
};



const deleteAccountIntoDb = async (id: string) => {
  try {
    const user = await users
      .findOne({
        _id: id,
        isDelete: false,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
      })
      .lean();

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User account not found.");
    }

    if (user.role === USER_ROLE.superAdmin) {
      throw new AppError(httpStatus.FORBIDDEN, "Super Admin cannot be deleted.");
    }


   

    return {
      status: true,
      message: "User account and all related data deleted successfully.",
    };
  } catch (error:any) {
    console.log("ACCOUNT DELETE ERROR =>", error); // DEBUG

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error?.message || "Delete operation failed."
    );
  }
};



const getUserGrowthIntoDb = async (query: { year?: string }) => {
  try {
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();

    const stats = await users.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: "$_id.month",
          count: 1,
          _id: 0,
        },
      },
      {
        $group: {
          _id: null,
          data: { $push: { month: "$month", count: "$count" } },
        },
      },

      {
        $project: {
          months: {
            $map: {
              input: { $range: [1, 13] },
              as: "m",
              in: {
                year: year,
                month: "$$m",
                count: {
                  $let: {
                    vars: {
                      matched: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$data",
                              as: "d",
                              cond: { $eq: ["$$d.month", "$$m"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: { $ifNull: ["$$matched.count", 0] },
                  },
                },
              },
            },
          },
        },
      },
      { $unwind: "$months" },
      { $replaceRoot: { newRoot: "$months" } },
    ]);

    return { monthlyStats: stats };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch user creation stats",
      error,
    );
  }
};

const isBlockAccountIntoDb = async (id: string, payload: Partial<TUser>) => {
  try {
    const result = await users.findByIdAndUpdate(
      id,
      { status: payload.status },
      { new: true },
    );

    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    return {
      success: true,
      message: `User successfully ${payload.status}`,
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Block account operation failed",
      error,
    );
  }
};

const AuthServices = {
  loginUserIntoDb,
  refreshTokenIntoDb,
  myprofileIntoDb,
  changeMyProfileIntoDb,
  findByAllUsersAdminIntoDb,
  deleteAccountIntoDb,

  getUserGrowthIntoDb,
  isBlockAccountIntoDb,
};

export default AuthServices;
