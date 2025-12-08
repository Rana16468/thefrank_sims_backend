import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import messages from "../../app/modules/message/message.model";
import users from "../../app/modules/users/users.model";
import conversations from "../../app/modules/conversation/conversation.model";
import { CHAT_TYPE } from "../../app/modules/conversation/conversation.constant";


export const handleSingleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: any
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Validate receiver
    if (!data?.receiverId) {
      throw new Error("Receiver ID is required");
    }

   

    const receiver = await users.findById(data.receiverId).session(session);
    if (!receiver) {
      throw new Error("Receiver not found");
    }

    // 2️⃣ Find or create conversation
    let conversation = await conversations
      .findOne({
        chat: CHAT_TYPE.singlechat,
        participants: { $all: [currentUserId, data.receiverId], $size: 2 },
      })
      .session(session) as any;

    let isNewConversation = false;
    if (!conversation) {
      conversation = await conversations.create(
        [
          {
            chat: CHAT_TYPE.singlechat,
            participants: [currentUserId, data.receiverId],
          },
        ],
        { session }
      ) as any;
      conversation = conversation[0];
      isNewConversation = true;
    }

    // 3️⃣ Create message
    const newMessage = await messages.create(
      [
        {
          text: data.text,
          msgByUserId: currentUserId,
          conversationId: conversation._id,
        },
      ],
      { session }
    );
    const savedMessage = newMessage[0];

    // 4️⃣ Update conversation's last message
    await conversations.updateOne(
      { _id: conversation._id },
      { lastMessage: savedMessage._id },
      { session }
    );

    // 5️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    // 6️⃣ Emit socket events after commit
    socket.join(conversation._id.toString());
    socket.data.currentConversationId = conversation._id.toString();

    io.to(conversation._id.toString()).emit("new-message", savedMessage);

    // 7️⃣ Check if message seen in real-time
    const room = io.sockets.adapter.rooms.get(conversation._id.toString());
    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (
          s &&
          s.data?.currentConversationId === conversation._id.toString() &&
          s.id !== socket.id
        ) {
          await messages.updateOne(
            { _id: savedMessage._id },
            { $set: { seen: true } }
          );

          io.to(conversation._id.toString()).emit("messages-seen", {
            conversationId: conversation._id,
            seenBy: data.receiverId,
            messageIds: [savedMessage._id],
          });
        }
      }
    }


    if (isNewConversation) {
      io.to(data.receiverId.toString()).emit("conversation-created", {
        conversationId: conversation._id,
        lastMessage: savedMessage,
      });

      socket.emit("conversation-created", {
        conversationId: conversation._id,
        lastMessage: savedMessage,
      });
    }
  } catch (error: any) {
    console.error("handleSingleSendMessage Error:", error);

    // Rollback transaction
    await session.abortTransaction();
    session.endSession();

    socket.emit("socket-error", {
      event: "new-message",
      message: error.message || "Something went wrong sending message",
    });
  }
};
