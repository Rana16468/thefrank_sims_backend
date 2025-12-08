import { Model, Types } from "mongoose";

export interface TCurrentSubscription {

    subscriptionId: Types.ObjectId;
    userId:Types.ObjectId;
    isActive: Boolean;
    typesubscription?: "free" | "paid"
    subscriptionPriceId: Types.ObjectId;
    isDelete:Boolean;   
};

export interface CurrentSubscriptionModel extends Model<TCurrentSubscription> {
  isCurrentSubscriptionCustomId(id: string): Promise<TCurrentSubscription>;
};
