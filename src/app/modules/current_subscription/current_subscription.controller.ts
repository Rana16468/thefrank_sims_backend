import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import currentSubscriptionServices from "./current_subscription.services";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";
import { _catch } from "zod/v4/core";



const recorded_subscription:RequestHandler=catchAsync(async(req , res)=>{

       const result=await currentSubscriptionServices.recorded_subscription_IntoDb(req.body, req.user.id);
         sendResponse(res, {
         success: true,
         statusCode: status.CREATED,
         message: "Successfully Recorded Subscription",
         data: result,
       });

});


const findByMyActiveCurrentSubscription:RequestHandler=catchAsync(async(req , res)=>{


  const result=await currentSubscriptionServices.findByMyActiveCurrentSubscriptionIntoDb( req.user.id);
        sendResponse(res, {
         success: true,
         statusCode: status.CREATED,
         message: "Successfully Find By Current Supscription",
         data: result,
       });  
});


const currentSubscriptionController={
     recorded_subscription,
      findByMyActiveCurrentSubscription
};

export default currentSubscriptionController;
