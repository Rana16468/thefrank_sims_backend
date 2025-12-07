import httpStatus from 'http-status';

import { USER_ACCESSIBILITY } from './user.constant';

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import AppError from '../../errors/AppError';
import sendEmail from '../../utils/sendEmail';

import { jwtHelpers } from '../../helper/jwtHelpers';
import config from '../../config';
import { TUser } from './users.interface';
import users from './users.model';
import emailContext from '../../utils/emailcontext/sendVerificationData';

const generateUniqueOTP = async (): Promise<number> => {
  const MAX_ATTEMPTS = 10;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const otp = Math.floor(1000 + Math.random() * 9000); // 4 digit

    const existingUser = await users.findOne({ verificationCode: otp });

    if (!existingUser) {
      return otp;
    }
  }

  throw new AppError(
    httpStatus.NOT_EXTENDED,
    "Failed to generate a unique 4 digit OTP after multiple attempts",
    ""
  );
};



const createUserIntoDb = async (payload: TUser) => {
  try {
    // Normalize email to lowercase
    const email = payload.email;

    // Check if user already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      throw new AppError(
        httpStatus.CONFLICT,
        'This email already exists in our database'
      );
    }

    // Generate unique OTP
    const otp = await generateUniqueOTP();

    // Prepare user payload
    const newUserData = {
      ...payload,
      email,
      verificationCode: otp,
      // TODO: generate unique subname if needed
    };

   


    // Save user
    const newUser = new users(newUserData);
    const result = await newUser.save();
    if (!result) {
      throw new AppError(
        httpStatus.NOT_EXTENDED,
        'Failed to record user information'
      );
    }

    // Send verification email (wrap in try-catch to avoid user left in DB)
    try {
      await sendEmail(
        email,
        emailContext.sendVerificationData(email, otp, 'User Verification Email'),
        'Verification OTP Code'
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Optionally, delete user or mark as unverified
      // await users.deleteOne({ _id: result._id });
    }

    return {
      status: true,
      message: 'Check your email inbox for verification code'
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;

    console.error('Unexpected server error:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Unexpected server error'
    );
  }
};



const userVarificationIntoDb = async (verificationCode: number) => {
  try {
    if (!verificationCode) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Verification code is required',
        '',
      );
    }

    const updatedUser = await users.findOneAndUpdate(
      { verificationCode },
      {
        isVerify: true,
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invalid verification code', '');
    }

    const jwtPayload = {
      id: updatedUser.id,
      role: updatedUser.role,
      email: updatedUser.email,
    };

    let accessToken: string | null = null;

    if (updatedUser.isVerify) {
      accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );
    }

    return {
      message: 'User verification successful',
      accessToken,
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Verification auth error',
      error,
    );
  }
};

const chnagePasswordIntoDb = async (
  payload: {
    newpassword: string;
    oldpassword: string;
  },
  id: string,
) => {
  try {
    const isUserExist = await users.findOne(
      {
        $and: [
          { _id: id },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { password: 1 },
    );

    if (!isUserExist) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    if (
      !(await users.isPasswordMatched(
        payload.oldpassword,
        isUserExist?.password,
      ))
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Old password does not match',
        '',
      );
    }

    const newHashedPassword = await bcrypt.hash(
      payload.newpassword,
      Number(config.bcrypt_salt_rounds),
    );

    const updatedUser = await users.findByIdAndUpdate(
      id,
      { password: newHashedPassword },
      { new: true, upsert: true },
    );
    if (!updatedUser) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'password  change database error',
        '',
      );
    }

    return {
      success: true,
      message: 'Password updated successfully',
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};

// forgot password

const forgotPasswordIntoDb = async (payload: string | { email: string }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let emailString: string;

    if (typeof payload === 'string') {
      emailString = payload;
    } else if (payload && typeof payload === 'object' && 'email' in payload) {
      emailString = payload.email;
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid email format', '');
    }

    const isExistUser = await users.findOne(
      {
        $and: [
          { email: emailString },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { _id: 1, provider: 1 },
      { session },
    );

    if (!isExistUser) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    const otp = await generateUniqueOTP();

    const result = await users.findOneAndUpdate(
      { _id: isExistUser._id },
      { verificationCode: otp },
      {
        new: true,
        upsert: true,
        projection: { _id: 1, email: 1 },
        session,
      },
    );

    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, 'OTP forgot section issues', '');
    }

    try {
      await sendEmail(
        emailString,
        emailContext.sendVerificationData(
          emailString,
          otp,
          ' Forgot Password Email',
        ),
        'Forgot Password Verification OTP Code',
      );
    } catch (emailError: any) {
      await session.abortTransaction();
      session.endSession();
      throw new AppError(
        httpStatus.SERVICE_UNAVAILABLE,
        'Failed to send verification email',
        emailError,
      );
    }

    await session.commitTransaction();
    session.endSession();

    return { status: true, message: 'Checked Your Email' };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};



const verificationForgotUserIntoDb = async (
  otp: number | { verificationCode: number },
): Promise<string> => {



  try {
    let code: number;

    if (typeof otp === 'object' && typeof otp.verificationCode === 'number') {
      code = otp.verificationCode;
    } else if (typeof otp === 'number') {
      code = otp;
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP format', '');
    }

    const isExistOtp: any = await users.findOne(
      {
        $and: [
          { verificationCode: code },
          { isVerify: true },
          { isDelete: false },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1, updatedAt: 1, email: 1, role: 1 },
    );

    if (!isExistOtp) {
      throw new AppError(httpStatus.NOT_FOUND, 'OTP not found', '');
    }

    // const updatedAt =
    //   isExistOtp.updatedAt instanceof Date
    //     ? isExistOtp.updatedAt.getTime()
    //     : new Date(isExistOtp.updatedAt).getTime();

    // const now = Date.now();
    // const FIVE_MINUTES = 5 * 60 * 1000;

    // if (now - updatedAt > FIVE_MINUTES) {
    //   throw new ApiError(
    //     httpStatus.FORBIDDEN,
    //     'OTP has expired. Please request a new one.',
    //     '',
    //   );
    // }

    const jwtPayload = {
      id: isExistOtp._id.toString(),
      role: isExistOtp.role,
      email: isExistOtp.email,
    };

    const accessToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.expires_in as string,
    );

    await users.updateOne(
      { _id: isExistOtp._id },
      { $unset: { verificationCode: '' } },
    );

    return accessToken;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};

const resetPasswordIntoDb = async (payload: {
  userId: string;
  password: string;
}) => {
  try {
    const isExistUser = await users.findOne(
      {
        $and: [
          { _id: payload.userId },
          { isVerify: true },
          { isDelete: false },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1 },
    );
    if (!isExistUser) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'some issues by the  reset password section',
        '',
      );
    }
    payload.password = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds),
    );

    const result = await users.findByIdAndUpdate(
      isExistUser._id,
      { password: payload.password },
      { new: true, upsert: true },
    );
    return result && { status: true, message: 'successfylly reset password' };
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'server unavailable  reset password into db function',
      error,
    );
  }
};

const googleAuthIntoDb = async (payload: TUser) => {
  try {
   
    let user = await users.findOne(
      {
        email: payload.email,
        isVerify: true,
        isDelete: false,
      },
      { _id: 1, role: 1, email: 1, isVerify: 1, },
    );

    let jwtPayload: { id: string; role: string; email: string };

    if (!user) {
     
      payload.isVerify = true;
      
      
      const newUser = new users(payload);
      user = await newUser.save();
    }

    jwtPayload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };
    if (user.isVerify) {
      const accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );

      const refreshToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_refresh_secret as string,
        config.refresh_expires_in as string,
      );

      // Update FCM token if provided
      if (payload?.fcm) {
        await users.findByIdAndUpdate(user._id, { $set: { fcm: payload.fcm } },{new:true, upsert:true});
      }

      return { accessToken, refreshToken };
    }

    // If user is not verified
    return { accessToken: null, refreshToken: null };
  } catch (error: any) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      error.message || "Google auth failed",
      error,
    );
  }
};


const resendVerificationOtpIntoDb = async (email: string) => {
  try {
    // ✅ 1. Check if the user exists and is not yet verified
    const user = await users.findOne(
      {
        email,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { _id: 1, isVerify: 1 }
    );

    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "This user does not exist in our database."
      );
    }

  

    if (user.isVerify) {
      return {
        status:false,
        message:"This user is already verified."
      }
    }


    const otp = await generateUniqueOTP();

    // ✅ 3. Update verification code
    const updatedUser = await users.findByIdAndUpdate(
      user._id,
      { verificationCode: otp },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to update verification code."
      );
    }
          await sendEmail(
        email,
        emailContext.sendVerificationData(
          email,
          otp,
          'User Verification Email',
        ),
        'Verification OTP Code',
      );

    return { status:true ,message:"successfully send email "};
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to resend verification OTP.",
      error
    );
  }
};


const getUserGrowthIntoDb = async (query: { year?: string }) => {
  try {
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();
    const previousYear = year - 1;

    // Get current year stats
    const currentYearStats = await users.aggregate([
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
          totalCount: { $sum: "$count" },
          data: { $push: { month: "$month", count: "$count" } },
        },
      },
      {
        $project: {
          totalCount: 1,
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
    ]);

    // Get previous year total count
    const previousYearStats = await users.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${previousYear}-01-01T00:00:00.000Z`),
            $lte: new Date(`${previousYear}-12-31T23:59:59.999Z`),
          },
        },
      },
      {
        $count: "totalCount",
      },
    ]);

    const currentYearTotal = currentYearStats[0]?.totalCount || 0;
    const previousYearTotal = previousYearStats[0]?.totalCount || 0;

    // Calculate year-over-year growth percentage
    let yearlyGrowth = 0;
    if (previousYearTotal > 0) {
      yearlyGrowth = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
    } else if (currentYearTotal > 0) {
      yearlyGrowth = 100; // If no users in previous year but users exist in current year
    }

    // Extract monthly stats
    const monthlyStats = currentYearStats[0]?.months || [];

    return {
      monthlyStats,
      yearlyGrowth: parseFloat(yearlyGrowth.toFixed(2)),
      year,
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch user creation stats",
      error
    );
  }
};

const insertRecoveryKeyIntoDb = async (recoveryKey: string, userId: string) => {
  try {
    if (!recoveryKey || !userId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Recovery key and user ID are required');
    }

    // Check if recovery key already exists for any user
    const keyExists = await users.exists({ recoveryKey, isDelete: false });
    if (keyExists) {
      return {
        status: false,
        message: "Recovery key already exists"
      };
    }

    // Update the user's recovery key
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { $set: { recoveryKey } },
      { new: true } // return the updated document
    );

    if (!updatedUser) {
      throw new AppError(
        httpStatus.NOT_EXTENDED,
        'Failed to insert recovery key: user not found'
      );
    }

    return {
      status: true,
      message: "Recovery key successfully recorded"
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to insert recovery key into database",
      error
    );
  }
};



 



const UserServices = {
  createUserIntoDb,
  userVarificationIntoDb,
  chnagePasswordIntoDb,
  forgotPasswordIntoDb,
  verificationForgotUserIntoDb,
  resetPasswordIntoDb,
   googleAuthIntoDb,
    resendVerificationOtpIntoDb,
    getUserGrowthIntoDb,
    insertRecoveryKeyIntoDb
   };
export default UserServices;
