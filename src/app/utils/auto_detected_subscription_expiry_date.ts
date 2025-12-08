import status from "http-status";
import AppError from "../error/AppError";
import currentsubscriptions from "../modules/current_subscription/current_subscription.model";

const auto_detected_subscription_expiry_date = async () => {
  try {
    const currentTime = new Date();
    const expiryThreshold = new Date(currentTime.getTime() - 60 * 24 * 60 * 60 * 1000);

    const expiredSubscriptions = await currentsubscriptions
      .find(
        {
          isActive: true,
          createdAt: { $lt: expiryThreshold },
        },
        { _id: 1 }
      )
      .lean();

    if (expiredSubscriptions.length === 0) {
      return { modifiedCount: 0, message: "No expired subscriptions found" };
    }

    const subscriptionIds = expiredSubscriptions.map((sub) => sub._id);

    const updateResult = await currentsubscriptions.updateMany(
      { _id: { $in: subscriptionIds } },
      { $set: { isActive: false } }
    );

    return {
      modifiedCount: updateResult.modifiedCount,
      message: `${updateResult.modifiedCount} subscription(s) deactivated successfully`,
    };
  } catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "Server error while auto-detecting subscription expiry",
      error?.message
    );
  }
};

export default auto_detected_subscription_expiry_date;
