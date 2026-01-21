
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
    const user = await users.findById(id).select("photo role privateKey").lean();

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User account not found.");
    }

    if (user.role === USER_ROLE.superAdmin) {
      throw new AppError(httpStatus.FORBIDDEN, "Super Admin cannot be deleted.");
    };

    if(user?.photo){

      //await deleteLocalFile(user?.photo);
      // delete aws account at a time 

    };

    // delete current subscription

    // await currentsubscriptions.deleteMany({userId:id});

    // delete secure folder 

    // await securefolders.deleteMany({userId:id});


     // 🔐 Fetch user private key
       
    
        if (!user?.privateKey) {
          throw new AppError(status.NOT_EXTENDED,"User private key not found");
        }
    
    
        const ecdh = crypto.createECDH("prime256v1");
        ecdh.setPrivateKey(Buffer.from(user.privateKey, "base64"));
    
        // 📦 Query data (lean for performance)
        const qb = new QueryBuilder(
          securemediastores.find({ userId:id }).lean(),
          {}
        )
          .search([])
          .filter()
          .sort()
          .fields();
    
        const messagesMedia = await qb.modelQuery;
        const decryptPayload = (
          sharedSecret: Buffer,
          payload?: { ciphertext: string; iv: string; tag: string }
        ) => {
          if (!payload) return null;
          return cryptoUtils.decryptMessage(sharedSecret, payload);
        };
    
        const decryptedMessages =messagesMedia.map((msg: any) => {
          if (!msg.ephemPublicKey) {
            return {
              ...msg,
              text: "[Missing ephem key]",
            };
          }
    
          try {
            const sharedSecret = ecdh.computeSecret(
              Buffer.from(msg.ephemPublicKey, "base64")
            );
    
            return {
              _id: msg._id,
              userId: msg.userId,
              createdAt: msg.createdAt,
              updatedAt: msg.updatedAt,
    
              text: msg.text
                ? decryptPayload(sharedSecret, msg.text)
                : "",
    
              imageUrl: Array.isArray(msg.imageUrl)
                ? msg.imageUrl.map((img: any) =>
                    decryptPayload(sharedSecret, img)
                  )
                : [],
    
              audioUrl: decryptPayload(sharedSecret, msg.audioUrl),
            };
          } catch (err) {
            console.error("Decryption failed for message:", msg._id, err);
            return {
              _id: msg._id,
              error: "Unable to decrypt",
            };
          }
        });

      decryptedMessages?.map(async(media)=>{

    if(media?.imageUrl?.length>=1){
        
       media?.imageUrl?.map(async(image:string)=>{

        // await deleteLocalFile(image)
          console.log(image);
          // connected aws account and at a time connected mongodb database

       });

        if(media?.audioUrl){
       //await deleteLocalFile()
       // connected aws account a delete mongodb database ;
       console.log(media?.audioUrl);
    };
    };
   
});


// delete chatting conversation 

const conversationDocs = await conversations
      .find({ participants:id }, { _id: 1, participants: 1 })
      .lean();

    if (!conversationDocs.length) {
      return { status: true, message: "No conversations found" };
    }

    const conversationIds = conversationDocs.map(c => c._id);

/* --------------------------------------------------
     🔑 Fetch all participant private keys
    -------------------------------------------------- */
    const participantIds = [
      ...new Set(conversationDocs.flatMap(c => c.participants)),
    ];

    const privateKeyDocs = await users
      .find({ _id: { $in: participantIds } })
      .select("privateKey")
      .lean();

    const privateKeys = privateKeyDocs
      .map(u => u.privateKey)
      .filter(Boolean);

   /* --------------------------------------------------
     📦 Fetch messages for media cleanup
    -------------------------------------------------- */
    const messageDocs = await messages.find({ conversationId: { $in: conversationIds } })
      .select("ephemPublicKey imageUrl audioUrl")
      .lean();

/* --------------------------------------------------
     🧹 Decrypt & delete media files
    -------------------------------------------------- */
    for (const msg of messageDocs) {
      if (!msg.ephemPublicKey) continue;

      const ephemKeyBuffer = Buffer.from(msg.ephemPublicKey, "base64");

      for (const privateKey of privateKeys) {
        try {
          const ecdh = crypto.createECDH("prime256v1");
          ecdh.setPrivateKey(Buffer.from(privateKey, "base64"));

          const sharedSecret = ecdh.computeSecret(ephemKeyBuffer);

          // 🖼 Delete images
          if (Array.isArray(msg.imageUrl)) {
            for (const img of msg.imageUrl) {
              const decryptedPath =
                cryptoUtils.decryptMessage(sharedSecret, img);
              // deleteLocalFile(decryptedPath);
              //console.log("............decryptedPath image ...........");
              // deleteLocalFile(decryptedPath);
              //console.log(decryptedPath)
              // connected aws account at a time database delete
            }
          }

          // 🎧 Delete audio
          if (msg.audioUrl) {
            const decryptedAudio =
              cryptoUtils.decryptMessage(sharedSecret, msg.audioUrl);

             //console.log("............decrypted Audio ...........");
              //deleteLocalFile(decryptedAudio);

            // deleteLocalFile(decryptedAudio);
            // connected aws account at a time database delete
          }

          break; // ✅ correct key found
        } catch {
          continue; // ❌ try next private key
        }
      }
    };

    /* --------------------------------------------------
     🗑 Delete messages & conversations
    -------------------------------------------------- */
    // await messages.deleteMany(
    //   { conversationId: { $in: conversationIds } }
    // );

    // await conversations.deleteMany(
    //   { _id: { $in: conversationIds } }
    // );

    if(user?.photo){
       // deleteLocalFile(user?.photo);
    }
     //await users.findByIdAndDelete(id);




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
  findBySpecificUserProfileIntoDb
};

export default AuthServices;
