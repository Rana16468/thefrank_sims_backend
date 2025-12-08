

import { RequestHandler } from 'express';
import MessageService from './message.services';
import httpStatus from 'http-status';
import catchAsync from '../../utils/asyncCatch';
import sendResponse from '../../utils/sendResponse';



const new_message: RequestHandler = catchAsync(async (req, res) => {

  const result = await MessageService.new_message_IntoDb(req.user as any,req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully Send By The Message',
    data: result,
  });
});

const updateMessageById: RequestHandler = catchAsync(async (req, res) => {
  const result = await MessageService.updateMessageById_IntoDb(
 
    req.params.messageId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully Update The Message',
    data: result,
  });
});

const deleteMessageById: RequestHandler = catchAsync(async (req, res) => {
  const result = await MessageService.deleteMessageById_IntoDb(
    req.params.messageId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully Delete Message',
    data: result,
  });
});


const findBySpecificConversation:RequestHandler=catchAsync(async(req , res)=>{

     const result=await MessageService.findBySpecificConversationInDb(req.params.conversationId, req.query);
       sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully  Find All Messages',
    data: result,
  });
});

const single_new_message:RequestHandler=catchAsync(async(req , res)=>{

    const result=await  MessageService.single_new_message_IntoDb(req.user,req.body);
           sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully  Send By The Message',
    data: result,
  });

});

const MessageController = {
  new_message,
  updateMessageById,
  deleteMessageById,
  findBySpecificConversation,
  single_new_message
};

export default MessageController;
