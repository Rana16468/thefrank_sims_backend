
import httpStatus, { status } from "http-status";

import users from "../users/users.model";
import { USER_ACCESSIBILITY, USER_ROLE } from "../users/user.constant";
import AppError from "../../errors/AppError";
import { jwtHelpers } from "../../helper/jwtHelpers";
import config from "../../config";
import QueryBuilder from "../../builder/QueryBuilder";
import { TUser } from "../users/users.interface";
import { ProfileUpdateResponse, RequestWithFile, user_search_filed } from './auth.constant';
import path from "path";
import fs from "fs/promises";
import currentsubscriptions from "../current_subscription/current_subscription.model";
import securefolders from "../secure_folder/secure_folder.model";
import crypto from 'crypto';
import securemediastores from "../secure_media_stores/secure_media_stores.model";
import cryptoUtils from "../../utils/cryptoUtils/cryptoUtils";
import conversations from "../conversation/conversation.model";
import messages from "../message/message.model";
import { uploadToS3 } from "../../utils/uploadToS3";
const loginUserIntoDb = async (payload: {
  email: string;
  password: string;
  fcm?: string;
  uid?: string;
}) => {
  // Fetch user by email only
  const user: any = await users.findOne({
    email: payload.email,
    isVerify: true,
    status: USER_ACCESSIBILITY.isProgress,
  }, {
    password: 1,
    email: 1,
    role: 1,
    uid: 1,
    photo:1
  });

  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `User with email "${payload.email}" not found`
    );
  }

  // Check UID mismatch for new device
  if (payload.uid && user.uid !== payload.uid) {
    return {
      status: false,
      message:
        "It seems you are using a new device. Please provide your recovery key.",
      recoveryKey: true,
    };
  }

  // Update FCM token if provided
  if (payload.fcm) {
    await users.updateOne({ _id: user._id }, { $set: { fcm: payload.fcm } });
  }

  // Validate password
  const isMatched = await users.isPasswordMatched(payload.password, user.password);
  if (!isMatched) {
    throw new AppError(httpStatus.FORBIDDEN, "Password does not match");
  }

  // Generate JWT tokens
  const jwtPayload = { id: user._id, role: user.role, email: user.email, uid: user.uid };
  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.expires_in
  );
  const refreshToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.refresh_expires_in
  );

  return { accessToken, refreshToken };
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
      .select("name email location photo manufacturer model updatedA ");
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
      updateData.photo = await uploadToS3(file, config.file_path);
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
          "name email  location photo recoveryKey  createdAt status",
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

const recoveryKeyIntoDb = async (payload: Partial<TUser>) => {

  const user = await users.findOne(
    {
      email: payload.email,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress,
    },
    { email: 1, role: 1, uid: 1, recoveryKey:1 }
  ) as any;

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  if (payload.recoveryKey && user?.recoveryKey!== payload.recoveryKey) {
    return {
      status: false,
      message: "UID mismatch, this looks like a new device. Please login normally.",
      recoveryKeyRequired: true
    };
  };


  const updatePayload = {
    recoveryKey: payload.recoveryKey,
    model: payload.model,
    manufacturer: payload.manufacturer,
    uid: payload.uid,
    fcm: payload.fcm
  };

  const updated = await users.findByIdAndUpdate(
    user._id,
    { $set: updatePayload },
    { new: true }
  );

  if (!updated) {
    throw new AppError(status.NOT_EXTENDED, "Failed updating recovery data");
  }

  return {
    status: true,
    message: "Recovery data updated successfully"
  };
};

const findByAllUserChatListIntoDb=async(query: Record<string, unknown>)=>{

    try{

       const allUsersdQuery = new QueryBuilder(
      users
        .find({ isVerify: true, role:USER_ROLE.user })
        .select(
          "name  photo   _id online",
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

    }
    catch(error:any){
      throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Block account operation failed",
      error,
    );
    }
};

const findBySpecificUserProfileIntoDb=async(userId:string)=>{


    try{

      return  await users.findById(userId).select("name photo online");


    }
     catch(error:any){
      throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "find B Specific User Profile IntoDb failed",
      error,
    );
    }
};


const deleteLocalFile = async (filePath?: string) => {
  if (!filePath) return;
  try {
    const localPath = path.resolve(filePath);
    await fs.access(localPath);
    await fs.unlink(localPath);
  } catch {
    // ignore if not exists
  }
};


const deleteAccountIntoDb = async (id: string) => {
  try {
    const user = await users
      .findById(id)
      .select("photo role privateKey")
      .lean();

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    if (user.role === USER_ROLE.superAdmin) {
      throw new AppError(httpStatus.FORBIDDEN, "Super Admin cannot be deleted");
    }

    if (!user.privateKey) {
      throw new AppError(httpStatus.NOT_EXTENDED, "Private key missing");
    }

    /* --------------------------------------------------
      🔐 Prepare ECDH
    -------------------------------------------------- */
    const userECDH = crypto.createECDH("prime256v1");
    userECDH.setPrivateKey(Buffer.from(user.privateKey, "base64"));

    const filesToDelete: string[] = [];

    /* --------------------------------------------------
      📦 Secure media
    -------------------------------------------------- */
    const mediaDocs = await securemediastores
      .find({ userId: id })
      .select("ephemPublicKey imageUrl audioUrl")
      .lean();

    for (const media of mediaDocs) {
      if (!media.ephemPublicKey) continue;

      try {
        const sharedSecret = userECDH.computeSecret(
          Buffer.from(media.ephemPublicKey, "base64")
        );

        if (Array.isArray(media.imageUrl)) {
          media.imageUrl.forEach((img: any) => {
            filesToDelete.push(
              cryptoUtils.decryptMessage(sharedSecret, img)
            );
          });
        }

        if (media.audioUrl) {
          filesToDelete.push(
            cryptoUtils.decryptMessage(sharedSecret, media.audioUrl)
          );
        }
      } catch {}
    }

    /* --------------------------------------------------
      💬 Conversations + messages
    -------------------------------------------------- */
    const conversationDocs = await conversations
      .find({ participants: id })
      .select("_id participants")
      .lean();

    const conversationIds = conversationDocs.map(c => c._id);

    if (conversationIds.length) {
      const participantIds = [
        ...new Set(conversationDocs.flatMap(c => c.participants)),
      ];

      const privateKeys = (
        await users
          .find({ _id: { $in: participantIds } })
          .select("privateKey")
          .lean()
      )
        .map(u => u.privateKey)
        .filter(Boolean);

      const messageDocs = await messages
        .find({ conversationId: { $in: conversationIds } })
        .select("ephemPublicKey imageUrl audioUrl")
        .lean();

      for (const msg of messageDocs) {
        if (!msg.ephemPublicKey) continue;

        const ephemKey = Buffer.from(msg.ephemPublicKey, "base64");

        for (const pk of privateKeys) {
          try {
            const ecdh = crypto.createECDH("prime256v1");
            ecdh.setPrivateKey(Buffer.from(pk, "base64"));
            const secret = ecdh.computeSecret(ephemKey);

            msg.imageUrl?.forEach((img: any) =>
              filesToDelete.push(
                cryptoUtils.decryptMessage(secret, img)
              )
            );

            if (msg.audioUrl) {
              filesToDelete.push(
                cryptoUtils.decryptMessage(secret, msg.audioUrl)
              );
            }

            break;
          } catch {}
        }
      }
    }

    if (user.photo) {
      filesToDelete.push(user.photo);
    }

    /* --------------------------------------------------
      🚀 DELETE EVERYTHING IN PARALLEL
    -------------------------------------------------- */
    await Promise.all([
      // 🧹 files
      Promise.all(filesToDelete.map(deleteLocalFile)),

      // 🗑 DB cleanup
      securemediastores.deleteMany({ userId: id }),
      securefolders.deleteMany({ userId: id }),
      currentsubscriptions.deleteMany({ userId: id }),
      messages.deleteMany({ conversationId: { $in: conversationIds } }),
      conversations.deleteMany({ _id: { $in: conversationIds } }),
      users.findByIdAndDelete(id),
    ]);

    return {
      status: true,
      message: "User account and all data deleted simultaneously.",
    };
  } catch (err: any) {
    console.error("DELETE ERROR:", err);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      err.message || "Delete failed"
    );
  }
};


const dashboardEntityCountIntoDb=async()=>{


     try{


        const userCount= await  users.countDocuments();

        const currentSubscriber=await currentsubscriptions.countDocuments();

        return {
          userCount, currentSubscriber
        }

     }
     catch(error:any){
          throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Delete failed"
    );
     }
}



const AuthServices = {
  loginUserIntoDb,
  refreshTokenIntoDb,
  myprofileIntoDb,
  changeMyProfileIntoDb,
  findByAllUsersAdminIntoDb,
  deleteAccountIntoDb,

  getUserGrowthIntoDb,
  isBlockAccountIntoDb,
  recoveryKeyIntoDb,
  findByAllUserChatListIntoDb,
  findBySpecificUserProfileIntoDb,
  dashboardEntityCountIntoDb
};

export default AuthServices;
