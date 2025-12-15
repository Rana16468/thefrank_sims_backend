import status from "http-status";
import AppError from "../../errors/AppError";
import { TSecureFolder } from "./secure_folder.interface";
import securefolders from "./secure_folder.model";
import bcrypt from 'bcrypt';
import messages from "../message/message.model";
import mongoose from "mongoose";
import users from "../users/users.model";
import cryptoUtils from "../../utils/cryptoUtils/cryptoUtils";
import crypto from 'crypto';


const createSecureFolderIntoDb = async (
  payload: TSecureFolder,
  userId: string
) => {
  try {
    // Check if secure folder already exists
    const existingFolder = await securefolders
      .findOne({ userId })
      .select("password")
      .lean();

    // If exists → validate password (login flow)
    if (existingFolder) {
      const isMatched = await bcrypt.compare(
        payload.password,
        existingFolder.password
      );

      if (!isMatched) {
        throw new AppError(status.FORBIDDEN, "Invalid password");
      }

      return {
        status: true,
        message: "Successfully logged in",
      };
    }

    const secureFolder = await securefolders.create({
      ...payload,
      userId,
    });

    if (!secureFolder) {
      throw new AppError(
        status.SERVICE_UNAVAILABLE,
        "Failed to create secure folder"
      );
    }

    return {
      status: true,
      message: "Secure folder created successfully",
    };
  } catch (error: any) {
    // Preserve original AppError
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Error in createSecureFolderIntoDb"
    );
  }
};



interface PaginationOptions {
  page?: number;
  limit?: number;
}

const getUserMediaMessagesIntoDb = async (
  userId: string,
  options: PaginationOptions = {}
) => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, options.limit || 20);
  const skip = (page - 1) * limit;

  // 🔐 Fetch user's private key
  const userKey = await users
    .findOne({ _id: userId })
    .select("privateKey")
    .lean();

    // console.log({userId, userKey})

  if (!userKey?.privateKey) {
    throw new Error("User private key not found");
  }

  // 🔎 Fetch messages with pagination
  const [result] = await messages.aggregate([
    {
      $match: {
        msgByUserId: new mongoose.Types.ObjectId(userId),
        $or: [
          { imageUrl: { $exists: true, $ne: [] } },
          { audioUrl: { $ne: null } },
        ],
      },
    },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              imageUrl: 1,
              audioUrl: 1,
              createdAt: 1,
              ephemPublicKey: 1,
              msgByUserId: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const total = result?.totalCount[0]?.count || 0;



  

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    data: result.data || [],
  };
};

const SecureFolderServices={
     createSecureFolderIntoDb,
     getUserMediaMessagesIntoDb
};

export default SecureFolderServices