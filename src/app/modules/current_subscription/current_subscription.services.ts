import status from "http-status";
import AppError from "../../errors/AppError";
import { TCurrentSubscription } from "./current_subscription.interface";
import { subscriptionStatus } from "./current_subscription.constant";
import currentsubscriptions from "./current_subscription.model";
import QueryBuilder from "../../builder/QueryBuilder";
import mongoose from "mongoose";

const recorded_subscription_IntoDb = async (
  payload: TCurrentSubscription,
  userId: string
) => {
  try {
    // Prepare payload
    const cleanedPayload =
      payload.typesubscription === subscriptionStatus.paid
        ? {
            subscriptionId: payload.subscriptionId,
            subscriptionPriceId: payload.subscriptionPriceId,
            typesubscription: subscriptionStatus.paid,
          }
        : {
            typesubscription: subscriptionStatus.free,
          };

    // Check if user already has this subscription type
    const existingSubscription = await currentsubscriptions.findOne({
      typesubscription: payload.typesubscription,
      userId,
    });

    if (existingSubscription) {
      return {
        success: false,
        message: `You already have ${payload.typesubscription} subscription`,
        data: {
          payload: cleanedPayload,
          userId,
        },
      };
    }

    // Record subscription
    const result = await currentsubscriptions.create({
      ...cleanedPayload,
      userId,
    });

    if (!result) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "Failed to record current subscription"
      );
    }

    return {
      success: true,
      message:
        payload.typesubscription === subscriptionStatus.free
          ? "Enjoy Your Free Trial 60 Days Subscription"
          : "Successfully recorded your Paid Subscription",
      data: {
        payload: cleanedPayload,
        userId,
      },
    };
  } catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      error?.message || "Some issues in recorded subscription section"
    );
  }
};


const findByMyActiveCurrentSubscriptionIntoDb = async (
  userId: string
) => {
  try {
    let userIdMatch: any;

    if (mongoose.Types.ObjectId.isValid(userId)) {
      userIdMatch = new mongoose.Types.ObjectId(userId);
    } else {
      userIdMatch = userId;
    }

    const agg = await currentsubscriptions.aggregate([
      {
        $match: {
          userId: userIdMatch,
          isActive: true,
          isDelete: false
        }
      },
      {
        $facet: {
          paid: [
            { $match: { typesubscription: "paid" } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          free: [
            { $match: { typesubscription: "free" } },
            { $sort: { createdAt: -1 } }
          ]
        }
      },
      {
        $project: {
          result: {
            $cond: [
              { $gt: [{ $size: "$paid" }, 0] },
              "$paid",
              "$free"
            ]
          }
        }
      },
      { $unwind: { path: "$result", preserveNullAndEmptyArrays: true } },
      { $replaceRoot: { newRoot: "$result" } },

      {
        $lookup: {
          from: "subscriptions",         
          localField: "subscriptionId",  
          foreignField: "_id",           
          as: "subscriptionDetails"
        }
      },

      // flatten
      {
        $unwind: {
          path: "$subscriptionDetails",
          preserveNullAndEmptyArrays: true
        }
      },

   {
  $project: {
    _id: 1,
    isActive: 1,
    typesubscription: 1,
    subscriptionId: 1,
    subscriptionPriceId: 1,

    subscriptionPrice: {
      $arrayElemAt: [
        {
          $filter: {
            input: "$subscriptionDetails.subscriptionPrice",
            as: "p",
            cond: { $eq: ["$$p._id", "$subscriptionPriceId"] }
          }
        },
        0
      ]
    }
  }
}

    ]);

    return agg;

  } catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "find By All User Admin IntoDb server unavailable",
      error
    );
  }
};

const findByAllActiveSubscriptionListIntoDb=async(query: Record<string, unknown>)=>{
  const allActiveSubscriptionQuery = new QueryBuilder(
      currentsubscriptions
        .find({ isActive:true }).populate(
          [
          {
            path: 'userId',
            select: 'name email  photo',
          }  
        ]
        ),
      query,
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    const allActiveSubscriber = await allActiveSubscriptionQuery.modelQuery;
    const meta = await allActiveSubscriptionQuery.countTotal();

    return { meta, allActiveSubscriber };

}




const currentSubscriptionServices={ recorded_subscription_IntoDb, findByMyActiveCurrentSubscriptionIntoDb, findByAllActiveSubscriptionListIntoDb }

export default currentSubscriptionServices;
