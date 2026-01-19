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
import conversations from "../conversation/conversation.model";
import { IMessage } from "../message/message.interface";
import { error } from "console";


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

interface AggregatedMessage {
  _id: mongoose.Types.ObjectId;
  text?: string;
  imageUrl?: string[];
  audioUrl?: string | null;
  createdAt: Date;
  ephemPublicKey?: string;
  msgByUserId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
}

interface AggregationResult {
  data: AggregatedMessage[];
  totalCount: { count: number }[];
}

interface ConversationDoc {
  participants: mongoose.Types.ObjectId[];
}

interface UserKeyDoc {
  privateKey?: string;
}

interface DecryptedMessage {
  _id: mongoose.Types.ObjectId;
  text: string;
  imageUrl: string[];
  audioUrl: string | null;
  createdAt: Date;
  msgByUserId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
}

const getUserMediaMessagesIntoDb = async (
  userId: string,
  options: PaginationOptions = {}
): Promise<{
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  data: DecryptedMessage[];
}> => {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, options.limit ?? 20);
  const skip = (page - 1) * limit;

  const [result] = await messages.aggregate<AggregationResult>([
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
              _id: 1,
              imageUrl: 1,
              audioUrl: 1,
              text: 1,
              createdAt: 1,
              ephemPublicKey: 1,
              msgByUserId: 1,
              conversationId: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const total = result?.totalCount?.[0]?.count ?? 0;
  const messageData = result?.data ?? [];

  if (!messageData.length) {
    return {
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
      data: [],
    };
  }

  const conversationIds = [
    ...new Set(messageData.map(m => m.conversationId.toString())),
  ].map(id => new mongoose.Types.ObjectId(id));

  const conversationsData = await conversations
    .find({ _id: { $in: conversationIds } })
    .select("participants -_id")
    .lean<ConversationDoc[]>();

  const participantIds = [
    ...new Set(conversationsData.flatMap(c => c.participants.map(p => p.toString()))),
  ].map(id => new mongoose.Types.ObjectId(id));

  const userPrivateKeys = await users
    .find({ _id: { $in: participantIds } }, { privateKey: 1 })
    .lean<UserKeyDoc[]>();

  const privateKeyList = userPrivateKeys
    .map(u => u.privateKey)
    .filter((k): k is string => Boolean(k));

  const decryptedMessages: DecryptedMessage[] = messageData.map((msg : any) => {
    if (!msg.ephemPublicKey) {
      return {
        ...msg,
        text: "[Missing ephem key]",
        imageUrl: [],
        audioUrl: null,
      };
    }

    const ephemKeyBuffer = Buffer.from(msg.ephemPublicKey, "base64");

    for (const privateKey of privateKeyList) {
      try {
        const ecdh = crypto.createECDH("prime256v1");
        ecdh.setPrivateKey(Buffer.from(privateKey, "base64"));
        const sharedSecret = ecdh.computeSecret(ephemKeyBuffer);

        return {
          ...msg,
          text: msg.text
            ? cryptoUtils.decryptMessage(sharedSecret, msg.text)
            : "",
          imageUrl: Array.isArray(msg.imageUrl)
            ? msg.imageUrl.map((img:any)=>
                cryptoUtils.decryptMessage(sharedSecret, img)
              )
            : [],
          audioUrl: msg.audioUrl
            ? cryptoUtils.decryptMessage(sharedSecret, msg.audioUrl)
            : null,
        };
      } catch {
        continue;
      }
    }

    return {
      ...msg,
      text: "[Unable to decrypt]",
      imageUrl: [],
      audioUrl: null,
    };
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    data: decryptedMessages,
  };
};

const uploadContentSecureFolderIntoDb = async (
  userId: string,
  payload: Partial<IMessage>
) => {
  try {

    // -----------------------
        // 1) Basic validations
        // -----------------------
        if (!userId) throw new AppError(status.UNAUTHORIZED, "User ID missing", "");
        // 2) Get receiver (must have publicKey)
    // -----------------------
    const receiver = await users
      .findById(userId)
      .select("publicKey");
     

    if (!receiver) throw new AppError(status.NOT_FOUND, "Receiver not found", "");
    if (!receiver.publicKey) throw new AppError(status.BAD_REQUEST, "Receiver public key missing", "");

    // -----------------------
        // 4) Encryption using receiver's publicKey (ECDH)
        // -----------------------
        const recipientPub = Buffer.from(receiver.publicKey, "base64");
        const ephem = crypto.createECDH("prime256v1");
        ephem.generateKeys();
        const sharedSecret = ephem.computeSecret(recipientPub);
    
   
      
    
    
        // Encrypt images (if exists)
        let imageUrlEncrypted: { ciphertext: string; iv: string; tag: string }[] = [];
        if (Array.isArray(payload.imageUrl) && payload.imageUrl.length > 0) {
          imageUrlEncrypted = payload.imageUrl.map((img:any) =>
            cryptoUtils.encryptMessage(sharedSecret, img)
          );
        }
    
       
    
        // Ensure at least one content exists
        if ( imageUrlEncrypted.length === 0) {
          throw new AppError(
            status.BAD_REQUEST,
            "Message must contain text, images, or audio",
            ""
          );
        }
    
        // -----------------------
        // 5) Persist message inside transaction
        // -----------------------
        const newMessage = await messages.create(
          [
            {
              text:  null,
              imageUrl: imageUrlEncrypted,
              audioUrl: null,
              seen: false,
              ephemPublicKey: ephem.getPublicKey().toString("base64"),
              msgByUserId: new mongoose.Types.ObjectId(userId),
              conversationId: new mongoose.Types.ObjectId()
          
            },
          ]
          
        );

        if(!newMessage){
          throw new AppError(status.NOT_EXTENDED, 'some issues  by  the image url section into server ')
        }


   
    return{
      status: true ,
      message:"successfully upload"
    }
   
    
  

   
  } catch (error: any) {
    throw new AppError(
      error.statusCode || status.INTERNAL_SERVER_ERROR,
      error.message || "Failed to upload content to secure folder"
    );
  }
};

const isCreateAccountSecureFolderIntoDb=async(userId:string)=>{

    try{

      const isExistSecureFolder=await securefolders.exists({userId}).lean();

      return isExistSecureFolder ? {status:true} : {status: false}

    }
    catch(error:any){
        throw new AppError(
      error.statusCode || status.INTERNAL_SERVER_ERROR,
      error.message || "Failed to upload content to secure folder"
    );
    }
}

    





const SecureFolderServices={
     createSecureFolderIntoDb,
     getUserMediaMessagesIntoDb,
     uploadContentSecureFolderIntoDb,
     isCreateAccountSecureFolderIntoDb
};

export default SecureFolderServices