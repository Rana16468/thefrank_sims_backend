import status from "http-status";
import AppError from "../errors/AppError";
import conversations from "../modules/conversation/conversation.model";
import messages from "../modules/message/message.model";
import QueryBuilder from "../builder/QueryBuilder";


export const getConversationList = async (eventId: string, query: any) => {
   try {
    if (!eventId) {
      throw new AppError(status.BAD_REQUEST, "Event ID is required");
    }

    // ✅ Step 1: Find all conversation IDs related to the event
    const relatedConversations = await conversations.find({ eventId }).select("_id");

    if (!relatedConversations.length) {
      return {
        meta: { total: 0 },
        messages: [],
        message: "No conversations found for this event",
      };
    }

    const conversationIds = relatedConversations.map((c) => c._id);

    // ✅ Step 2: Query all messages that belong to these conversations
    const baseQuery = messages
      .find({ conversationId: { $in: conversationIds } })
      .populate([
        {
          path: "msgByUserId",
          select: "name photo email",
        },
        // {
        //   path: "conversationId",
        //   select: "eventId chat participants",
        //   populate: {
        //     path: "participants",
        //     select: "name photo email",
        //   },
        // },
      ])
      .sort({ createdAt: -1 });

    const messageQuery = new QueryBuilder(baseQuery, query)
      .search(["msgByUserId.name", "text"])
      .filter()
      .sort()
      .paginate()
      .fields();

    const allMessages = await messageQuery.modelQuery;
    const meta = await messageQuery.countTotal();

    return {
      success: true,
      message: "Fetched all event-wise messages successfully",
      meta,
      messages: allMessages,
    };
  } catch (error: any) {
    console.error("getEventWiseMessagesIntoDb Error:", error);
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "Issue fetching event-wise messages — server unavailable",
      error
    );
  }
};
