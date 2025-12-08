import status from "http-status";
import AppError from "../../errors/AppError";
import { TCurrentSubscription } from "./current_subscription.interface";
import { subscriptionStatus } from "./current_subscription.constant";
import currentsubscriptions from "./current_subscription.model";

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



const currentSubscriptionServices={ recorded_subscription_IntoDb }

export default currentSubscriptionServices;
