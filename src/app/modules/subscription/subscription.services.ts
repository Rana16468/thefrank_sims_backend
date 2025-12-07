import status from "http-status";
import AppError from "../../errors/AppError";
import { TSubscription } from "./subscription.interface";
import subscriptions from "./subscription.model";



const createSubscriptionIntoDb=async(payload:TSubscription)=>{

    try{
       const result=await subscriptions.create(payload);
       if(!result){
        throw new AppError(status.NOT_EXTENDED,'')
       };

       return {
        status:true, 
        message:"successfully recorded"
       }

    }
    catch(error:any){
        throw new AppError(status.INTERNAL_SERVER_ERROR,'issues by the create subscription section into server')
    }
};


const subscriptionServices={
    createSubscriptionIntoDb
};
export default subscriptionServices