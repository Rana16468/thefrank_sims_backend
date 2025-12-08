import { Schema, model, Types } from "mongoose";
import { CurrentSubscriptionModel, TCurrentSubscription } from "./current_subscription.interface";
import { subscriptionStatus } from "./current_subscription.constant";


const CurrentSubscriptionSchema = new Schema<TCurrentSubscription, CurrentSubscriptionModel>(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      required: [false ,'subscriptionId is required'],
      ref: "subscriptions",
      index:true
    },

    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref:"users",
      index:true
    },

    isActive: {
      type: Boolean,
      default: true,
    },

   typesubscription: {
  type: String,
  index:true,
  enum: {
    values: [subscriptionStatus.free, subscriptionStatus.paid],
    message: "{VALUE} is not a valid subscription type",
  },
  required:false,
  default: subscriptionStatus.free,
},
    subscriptionPriceId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "subscriptions",
    },

    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
     versionKey: false,
  }
);


CurrentSubscriptionSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

CurrentSubscriptionSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

CurrentSubscriptionSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

CurrentSubscriptionSchema.statics.isCurrentSubscriptionCustomId = async function (
  id: string
) {
  return await this.findOne({ _id: id, isDelete: false });
};

 const currentsubscriptions = model<TCurrentSubscription, CurrentSubscriptionModel>(
  "currentsubscriptions",
  CurrentSubscriptionSchema
);

export default currentsubscriptions
