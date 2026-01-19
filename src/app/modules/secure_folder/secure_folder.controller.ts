import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import SecureFolderServices from "./secure_folder.services";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";



const createSecureFolder:RequestHandler=catchAsync(async(req , res)=>{

      const result=await SecureFolderServices.createSecureFolderIntoDb(req.body, req.user.id);
     sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'successfully login folder',
    data: result,
  }); 

});

const getUserMediaMessages:RequestHandler=catchAsync(async(req , res)=>{

      const result=await SecureFolderServices.getUserMediaMessagesIntoDb(req.user.id);
      sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'successfully login folder',
    data: result,
  }); 
});


const uploadContentSecureFolder:RequestHandler=catchAsync(async(req , res)=>{

      const  result=await SecureFolderServices.uploadContentSecureFolderIntoDb(req.user.id, req.body);
       sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'successfully upload',
    data: result,
  }); 
});

const isCreateAccountSecureFolder:RequestHandler=catchAsync(async(req , res)=>{

     const result=await SecureFolderServices.isCreateAccountSecureFolderIntoDb(req.user.id);
            sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'successfully find by folder ',
    data: result,
  }); 
})

const SecureFolderController={
    createSecureFolder,
    getUserMediaMessages,
    uploadContentSecureFolder,
    isCreateAccountSecureFolder
};


export default SecureFolderController