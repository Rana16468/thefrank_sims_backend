import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import currentSubscriptionServices from "./current_subscription.services";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";



const recorded_subscription:RequestHandler=catchAsync(async(req , res)=>{

       const result=await currentSubscriptionServices.recorded_subscription_IntoDb(req.body, req.user.id);
         sendResponse(res, {
         success: true,
         statusCode: status.CREATED,
         message: "Successfully Recorded Subscription",
         data: result,
       });

});


const currentSubscriptionController={
     recorded_subscription
};

export default currentSubscriptionController;
