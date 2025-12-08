import { RequestHandler } from 'express';

import httpStatus from 'http-status';
import catchAsync from '../../utils/asyncCatch';
import ConversationService from './conversation.services';
import sendResponse from '../../utils/sendResponse';
import { getConversationList } from '../../helper/getConversationList';


const getChatList: RequestHandler = catchAsync(async (req, res) => {
  const result = await ConversationService.getConversation(
    req?.user?.id,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversation retrieved successfully',
    data: result,
  });
});


const allConversation:RequestHandler=catchAsync(async(req , res)=>{

     const result=await ConversationService. allConversationIntoDb(req.params.eventId);
       sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'event Conversation',
    data: result,
  });
});


const  specificAllGetConversations :RequestHandler=catchAsync(async(req , res)=>{

     const result= await  getConversationList(req.params.eventId, req.query);
sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'specific event waise conversation',
    data: result,
  });     
});


const getSingleConversationList:RequestHandler=catchAsync(async(req , res)=>{

     const result=await  ConversationService.getSingleConversationListIntoDb(req.user.id, req.query);
     sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully  find  my conversation list',
    data: result,
  }); 
});
const getGroupConversationList:RequestHandler=catchAsync(async(req , res)=>{

     const result=await  ConversationService.getGroupConversationListIntoDb(req.params.eventId,req.user.id, req.query);
     sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'successfully  find  group conversation list',
    data: result,
  }); 
});



const ConversationController = {
  getChatList,
   allConversation,
   specificAllGetConversations,
    getSingleConversationList,
    getGroupConversationList
};

export default ConversationController;