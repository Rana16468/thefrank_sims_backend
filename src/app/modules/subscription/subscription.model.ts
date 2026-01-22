import { Schema, model } from "mongoose";
import { TSubscription, SubscriptionModel } from "./subscription.interface";


const TSubscriptionSchema = new Schema<TSubscription, SubscriptionModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    subscriptionType30: {
      title: {
        type: String,
        required: true,
      },
      features: {
        type: [String],
        required: true,
      },
      price:{
        type:String,
        require:false
      }
    },

    subscriptionType15: {
      title: {
        type: String,
        required: true,
      },
      features: {
        type: [String],
        required: true,
      },
       price:{
        type:String,
        require:false
      }
    },

 subscriptionPrice: [
  {
    pricetype: {
      type: String,
      required: true,
    }
  }
],

    isDelete: {
      type: Boolean,
      default: false
    },

  },
  {
    timestamps: true,
    versionKey: false,
  }
);

TSubscriptionSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TSubscriptionSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TSubscriptionSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});


// ----------- Static Method --------------
TSubscriptionSchema.statics.isSubscriptionCustomId = async function (id: string) {
  const subscription = await this.findById(id);

  return subscription;
};


 const subscriptions = model<TSubscription, SubscriptionModel>(
  "subscriptions",
 TSubscriptionSchema
);
export default subscriptions;
