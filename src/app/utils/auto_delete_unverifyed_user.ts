import httpStatus from "http-status";
import users from "../modules/users/users.model";
import AppError from "../errors/AppError";


const auto_delete_unverifyed_user = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(currentTime.getTime() - 10 * 60 * 1000);

    const unverifyedUsers = await users
      .find(
        {
          isVerify: false,
          isDelete: false,
          createdAt: { $lt: timeThreshold },
        },
        { _id: 1 }
      )
      .lean();

    if (unverifyedUsers.length === 0) {
      return { deletedCount: 0, message: "unverifyed user to delete" };
    }

    const userIds = unverifyedUsers?.map((userId) => userId._id);

    const deleteResult = await users.deleteMany({
      _id: { $in: userIds },
    });

    if (!deleteResult || deleteResult?.deletedCount === 0) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to delete unVarifyed account ",
        ""
      );
    }
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "unverifyed user request  cron under issues ",
      error
    );
  }
};

export default auto_delete_unverifyed_user;
