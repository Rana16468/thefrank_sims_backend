import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import SecureMediaStoresServices from "./secure_media_stores.services";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";



   const uploadContentSecureFolder:RequestHandler=catchAsync(async(req , res)=>{

      const  result=await SecureMediaStoresServices.uploadContentSecureFolderIntoDb(req.user.id, req.body);
       sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'successfully upload',
    data: result,
  }); 
});
const  findByMySecureFolderMedia:RequestHandler=catchAsync(async(req , res)=>{

       const  result=await SecureMediaStoresServices.findByMySecureFolderMediaIntoDb(req.user.id, req.query);
       sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'successfully  fine all secure data',
    data: result,
  }); 
})


const SecureMediaStoresController={
 uploadContentSecureFolder,
  findByMySecureFolderMedia
};

export default SecureMediaStoresController;

