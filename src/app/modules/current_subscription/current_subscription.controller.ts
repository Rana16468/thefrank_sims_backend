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


const findByAllActiveSubscriptionList:RequestHandler=catchAsync(async(req , res)=>{

     const result=await currentSubscriptionServices.findByAllActiveSubscriptionListIntoDb(req.query);
     sendResponse(res, {
         success: true,
         statusCode: status.OK,
         message: "Successfully Find By All Active Subscriber List",
         data: result,
       });  

});


const updateActiveStatusAdmin:RequestHandler=catchAsync(async(req , res)=>{

     const result=await currentSubscriptionServices.updateActiveStatusAdminIntoDb(req.params.currentSubscriberId, req.body);
     sendResponse(res, {
         success: true,
         statusCode: status.OK,
         message: "Successfully Change Status",
         data: result,
       });  

});


const getCurrentSubscriberGrowth:RequestHandler=catchAsync(async(req , res)=>{

     const result=await currentSubscriptionServices.getCurrentSubscriberGrowthIntoDb(req.query);
      sendResponse(res, {
         success: true,
         statusCode: status.OK,
         message: "Successfully Find By Current Subscriber Growth",
         data: result,
       });  
})




const currentSubscriptionController={
     recorded_subscription,
      findByMyActiveCurrentSubscription,
      findByAllActiveSubscriptionList,
      updateActiveStatusAdmin,
      getCurrentSubscriberGrowth
};

export default currentSubscriptionController;
