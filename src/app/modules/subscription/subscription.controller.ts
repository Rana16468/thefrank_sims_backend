import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import subscriptionServices from "./subscription.services";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";



const createSubscription:RequestHandler=catchAsync(async(req , res)=>{

     const result=await subscriptionServices.createSubscriptionIntoDb(req.body);
     sendResponse(res, {
         success: true,
         statusCode: status.CREATED,
         message: "Successfully Recorded",
         data: result,
       });


});

const subscriptionController={
    createSubscription
};
export default subscriptionController;