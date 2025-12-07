import { Model } from "mongoose";


export interface TSubscription {

     title: string;
     description: string;
     subscriptionType30:{
        title:string;
        features:string[]
     };
       subscriptionType15:{
        title:string;
        features:string[]
     },
     subscriptionPrice: {pricetype:string}[]
     isDelete:Boolean;


};

export interface SubscriptionModel extends Model<TSubscription> {
  isSubscriptionCustomId(id: string): Promise<TSubscription>;
};



