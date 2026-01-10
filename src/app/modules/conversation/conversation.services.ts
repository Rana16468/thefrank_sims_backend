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


  console.log(query)



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
        ]) 
, query).search(["chat"])
      .filter()
      .sort()
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

const addedNewUserConversationIntoDb=async(payload:{conversationId:string, userId:string})=>{


  try{

    return payload

  }
  catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      error.message ||
        "Issue while creating added New User Conversation intoDb"
    );
  }

   
}










const ConversationService = {
  getConversation,
  allConversationIntoDb,
   getSingleConversationListIntoDb,
   getGroupConversationListIntoDb,
 createGroupConversationIntoDb,
 addedNewUserConversationIntoDb
};

export default ConversationService;
