/* eslint-disable @typescript-eslint/no-explicit-any */

import mongoose, { Types } from 'mongoose';
import conversations from './conversation.model';
import QueryBuilder from '../../builder/QueryBuilder';
import messages from '../message/message.model';
import AppError from '../../errors/AppError';
import status from 'http-status';
import users from '../users/users.model';
import { IConversation } from './conversation.interface';
import currentsubscriptions from '../current_subscription/current_subscription.model';
import { CHAT_TYPE } from './conversation.constant';
import cryptoUtils from '../../utils/cryptoUtils/cryptoUtils';
import crypto from 'crypto';
import fs from "fs/promises";
import path from "path";
import { deleteFromS3 } from '../../utils/deleteFromS3';



const getConversation = async (
  profileId: string,
  query: Record<string, unknown>,
) => {
  const profileObjectId = new mongoose.Types.ObjectId(profileId);
  const searchTerm = query.searchTerm as string;

  let userSearchFilter = {};

  if (searchTerm) {
    const matchingUsers = await users.find(
      { name: { $regex: searchTerm, $options: 'i' } },
      '_id',
    );

    const matchingUserIds = matchingUsers.map((user) => user._id);
    userSearchFilter = {
      participants: { $in: matchingUserIds },
    };
  }






  const currentUserConversationQuery = new QueryBuilder(
    conversations.find({
      participants: profileObjectId,
      ...userSearchFilter,
    })
      .sort({ updatedAt: -1 })
      .populate({ path: 'participants', select: 'name photo _id email' })
      .populate('lastMessage'),
    query,
  ).search(["chat"])
    .fields()
    .filter()
    .paginate()
    .sort();

  const currentUserConversation = await currentUserConversationQuery.modelQuery;

  const conversationList = await Promise.all(
    currentUserConversation.map(async (conv: any) => {
      const otherUser = conv.participants.find(
        (user: any) => user._id.toString() !== profileId,
      );

      const unseenCount = await messages.countDocuments({
        conversationId: conv._id,
        msgByUserId: { $ne: profileObjectId },
        seen: false,
      });

      return {
        _id: conv._id,
        userData: {
          _id: otherUser?._id,
          name: otherUser?.name,
          profileImage: otherUser?.photo,
          email: otherUser?.email,
        },
        unseenMsg: unseenCount,
        lastMsg: conv.lastMessage,
      };
    }),
  );

  const meta = await currentUserConversationQuery.countTotal();

  return {
    meta,
    result: conversationList,
  };
};

const allConversationIntoDb=async(currentSubId:string)=>{

  try{

    return currentSubId

  }
  catch(error:any){
    throw new AppError(status.INTERNAL_SERVER_ERROR,'server error all conversation','')
  }

      
}

/* {
      chat: CHAT_TYPE.singlechat,
      participants: { $all: [currentUserId, data.receiverId], $size: 2 },
    }*/


const getSingleConversationListIntoDb = async (currentUserId: string, query:  Record<string, unknown>) => {
  try {
    
        

    const conversationQuery = new QueryBuilder(conversations
      .find({
        // chat: CHAT_TYPE.singlechat || CHAT_TYPE.groupchat,
        participants: currentUserId,
      }).populate([
          {
             path: "participants",
        match: { _id: { $ne: currentUserId } }, 
        select: "name photo online",
          },
        //  {
        //   path: "lastMessage",
        //   select: "text  createdAt",
         
        // },
        ]) .sort({ updatedAt: -1 })
, query).search(["chat"])
      .filter()
      .paginate()
      .fields();

    const allConversations = await conversationQuery.modelQuery;
    const meta = await conversationQuery.countTotal();
  


    return { meta, allConversations};
  } catch (error: any) {
    
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      error.message || 'Issue while fetching conversation list — server unavailable'
    );
  }
};

// group conversation list
 
const getGroupConversationListIntoDb = async (eventId: string, currentUserId:string, query:  Record<string, unknown>) => {
  try {
    const baseQuery = conversations
      .find({
        eventId
      }).populate([
          {
             path: "participants",
       
        select: "name photo email",
          },
         {
          path: "lastMessage",
          select: "text  createdAt",
         
        },
        ]) 
   
      .sort({ updatedAt: -1 })
      

    const conversationQuery = new QueryBuilder(baseQuery, query)
      .filter()
      .sort()
      .paginate()
      .fields();

    const allConversations = await conversationQuery.modelQuery;
    const meta = await conversationQuery.countTotal();

    return { meta, allConversations };
  } catch (error: any) {
    
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      error.message || 'Issue while fetching conversation list — server unavailable'
    );
  }
};


const createGroupConversationIntoDb = async (
  payload: Partial<IConversation>,
  userId: string
): Promise<{
  status: true;
  message: string;
}> => {
  try {
    if (!payload.groupname || !payload.currentSubId) {
      throw new AppError(
        status.BAD_REQUEST,
        "Group name and subscription ID are required"
      );
    }
    const participants = payload.participants ?? [];
    const uniqueParticipants = Array.from(
      new Set([...participants, userId])
    );
    const participantObjectIds = uniqueParticipants.map(
      id => new Types.ObjectId(id)
    );

    const validParticipantsCount = await users.countDocuments({
      _id: { $in: participantObjectIds },
      isVerify: true,
    });

    if (validParticipantsCount !== participantObjectIds.length) {
      throw new AppError(
        status.BAD_REQUEST,
        "One or more participants are invalid or not verified"
      );
    }

    const finalPayload = {
      groupname: payload.groupname,
      currentSubId: payload.currentSubId,
      participants: participantObjectIds,
      chat: payload.chat ?? "groupchat",
    };

    const isExistSubscription=await currentsubscriptions.exists({_id:payload.currentSubId, isActive:true});
    if(!isExistSubscription){
      throw new AppError(status.NOT_EXTENDED, 'issues by the subscription expire ')
    }

    const result = await conversations.create(finalPayload); 

    if (!result) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "Failed to create group conversation"
      );
    }

    return {
      status: true,
      message: "Successfully created group conversation",
    };
  } catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      error.message ||
        "Issue while creating conversation group — server unavailable"
    );
  }
};

const addedNewUserConversationIntoDb = async (payload: {
  conversationId: string;
  userId: string;
}) => {
  try {
    const conversation = await conversations
      .findById(payload.conversationId)
      .select("chat participants");

    if (!conversation) {
      return {
        status: false,
        message: "Conversation not found",
      };
    }

    if (conversation.chat !== CHAT_TYPE.groupchat) {
      return {
        status: false,
        message: "This is not a group chat",
      };
    }

    const userObjectId = new Types.ObjectId(payload.userId);

    // ✅ Type-safe ObjectId comparison
    const isAlreadyJoined = conversation.participants.some(
      (id: Types.ObjectId) => id.equals(userObjectId)
    );

    if (isAlreadyJoined) {
      return {
        status: false,
        message: "User already joined this group",
      };
    }

    await conversations.updateOne(
      { _id: payload.conversationId },
      { $addToSet: { participants: userObjectId } }
    );

    return {
      status: true,
      message: "User added to group conversation successfully",
    };
  } catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      error.message || "Issue while adding user to conversation"
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





const delete_all_conversation_IntoDb = async (userId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
 
    const user = await users
      .findById(userId)
      .select("privateKey")
      .lean<{ privateKey: string }>();

    if (!user?.privateKey) {
      throw new Error("User private key not found");
    }

   
    const conversationDocs = await conversations
      .find({ participants: userId }, { _id: 1, participants: 1 })
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
    const messageDocs = await messages
      .find({ conversationId: { $in: conversationIds } })
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
              deleteFromS3(decryptedPath);
               
            }
          }

          // 🎧 Delete audio
          if (msg.audioUrl) {
            const decryptedAudio =
              cryptoUtils.decryptMessage(sharedSecret, msg.audioUrl);
            // deleteLocalFile(decryptedAudio);
             deleteFromS3(decryptedAudio);
          }

          break; // ✅ correct key found
        } catch {
          continue; // ❌ try next private key
        }
      }
    }

    /* --------------------------------------------------
     🗑 Delete messages & conversations
    -------------------------------------------------- */
    // await messages.deleteMany(
    //   { conversationId: { $in: conversationIds } },
    //   { session }
    // );

    // await conversations.deleteMany(
    //   { _id: { $in: conversationIds } },
    //   { session }
    // );

    await session.commitTransaction();
    session.endSession();

    return {
      status: true,
      message: "All conversations and related data deleted successfully",
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      error.message || "Failed to delete conversations"
    );
  }
};



const ConversationService = {
  getConversation,
  allConversationIntoDb,
  getSingleConversationListIntoDb,
  getGroupConversationListIntoDb,
  createGroupConversationIntoDb,
  addedNewUserConversationIntoDb,
  delete_all_conversation_IntoDb
};

export default ConversationService;
