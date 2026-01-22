import status from "http-status";
import AppError from "../../errors/AppError";
import { TSubscription } from "./subscription.interface";
import subscriptions from "./subscription.model";
import QueryBuilder from "../../builder/QueryBuilder";



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

   const findByAllSubscriptionIntoDb=async(query: Record<string, unknown>)=>{

 try {
    const allSubscriptionQuery = new QueryBuilder(
      subscriptions
        .find({  }),
        
      query,
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_subscription_list = await allSubscriptionQuery.modelQuery;
    const meta = await allSubscriptionQuery.countTotal();

    return { meta, all_subscription_list };
  } catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "find By All Subscription IntoDb server unavailable",
      error,
    );
   }
}

 const updateSubscriptionIntoDb=async(id:string, payload:TSubscription )=>{


    try{

        const result=await subscriptions.findByIdAndUpdate(id, payload,{new:true, upsert:true});

        if(!result){
          throw new AppError(status.NOT_EXTENDED, 'issues  by the  subscription update section')
        }

         return {
          status:true , message:"successfully update"
         }
         

    }
    catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "find By All Subscription IntoDb server unavailable",
      error,
    );
   }
 }


const subscriptionServices={
    createSubscriptionIntoDb,
    findByAllSubscriptionIntoDb,
    updateSubscriptionIntoDb
};
export default subscriptionServices