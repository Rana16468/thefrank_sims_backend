import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import messages from "../../app/modules/message/message.model";
import users from "../../app/modules/users/users.model";
import conversations from "../../app/modules/conversation/conversation.model";
import { CHAT_TYPE } from "../../app/modules/conversation/conversation.constant";
import crypto from "crypto";
import cryptoUtils from "../../app/utils/cryptoUtils/cryptoUtils";
import { onlineUsers } from "../socketConnection";

export const handleSingleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: any,
  publicKey: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // -------------------------------
    // 1️⃣ Validate receiver
    // -------------------------------
    if (!data?.receiverId) {
      throw new Error("Receiver ID is required");
    }

    const receiver = await users.findById(data.receiverId).session(session);
    if (!receiver) {
      throw new Error("Receiver not found");
    }

    // -------------------------------
    // 2️⃣ Find or create conversation
    // -------------------------------
    let conversation = await conversations
      .findOne({
        _id: data?.conversationId,
        chat: CHAT_TYPE.singlechat,
        participants: { $all: [currentUserId, data.receiverId], $size: 2 },
      })
      .session(session);

    let isNewConversation = false;
    if (!conversation) {
      const c = await conversations.create(
        [
          {
            chat: CHAT_TYPE.singlechat,
            participants: [currentUserId, data.receiverId],
          },
        ],
        { session }
      );
      conversation = c[0];
      isNewConversation = true;
    }

    // -------------------------------
    // 3️⃣ Encrypt message
    // -------------------------------
    const recipientPub = Buffer.from(publicKey, "base64");
    const ephem = crypto.createECDH("prime256v1");
    ephem.generateKeys();
    const sharedSecret = ephem.computeSecret(recipientPub);

    // Encrypt text
    const encryptedText = cryptoUtils.encryptMessage(sharedSecret, data.text);

    // Encrypt image URLs
    const imageUrlEncrypted =
      Array.isArray(data.imageUrl) && data.imageUrl.length > 0
        ? data.imageUrl.map((img: string) =>
            cryptoUtils.encryptMessage(sharedSecret, img)
          )
        : [];

    // Encrypt audio
    const audioEncrypted = data.audioUrl
      ? cryptoUtils.encryptMessage(sharedSecret, data.audioUrl)
      : undefined;

    // -------------------------------
    // 4️⃣ Save message
    // -------------------------------
    const newMessage = await messages.create(
      [
        {
          text: encryptedText,
          imageUrl: imageUrlEncrypted,
          audioUrl: audioEncrypted,
          iv: encryptedText.iv,
          tag: encryptedText.tag,
          ephemPublicKey: ephem.getPublicKey().toString("base64"),
          msgByUserId: new mongoose.Types.ObjectId(currentUserId),
          conversationId: conversation._id,
          seen: false,
        },
      ],
      { session }
    );

    const savedMessage = newMessage[0];

    // -------------------------------
    // 5️⃣ Update conversation lastMessage
    // -------------------------------
    await conversations.updateOne(
      { _id: conversation._id },
      { lastMessage: savedMessage._id },
      { session }
    );

    // -------------------------------
    // 6️⃣ Commit transaction
    // -------------------------------
    await session.commitTransaction();
    session.endSession();

    // -------------------------------
    // 7️⃣ Socket.io emits
    // -------------------------------
    const ioRoomId = conversation._id.toString();

    // Join sender socket
    const senderSocketId = onlineUsers.get(currentUserId);
    if (senderSocketId) {
      const senderSocket = io.sockets.sockets.get(senderSocketId);
      senderSocket?.join(ioRoomId);
      if (senderSocket) senderSocket.data.currentConversationId = ioRoomId;
    }

    // Populate message for emitting
    const populatedMsg = await messages
      .findById(savedMessage._id)
      .populate("msgByUserId", "name photo email");

    // Emit to room
    io.to(ioRoomId).emit("new-message", populatedMsg);

    // -------------------------------
    // 8️⃣ Auto-seen logic
    // -------------------------------
    const room = io.sockets.adapter.rooms.get(ioRoomId);
    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.data?.currentConversationId === ioRoomId && s.id !== senderSocketId) {
          await messages.updateOne({ _id: savedMessage._id }, { $set: { seen: true } });
          io.to(ioRoomId).emit("messages-seen", {
            conversationId: conversation._id,
            seenBy: data.receiverId,
            messageIds: [savedMessage._id],
          });
          break;
        }
      }
    }

    // -------------------------------
    // 9️⃣ Notify new conversation
    // -------------------------------
    if (isNewConversation) {
      // Notify receiver
      io.to(data.receiverId.toString()).emit("conversation-created", {
        conversationId: conversation._id,
        lastMessage: populatedMsg,
      });
      io.to(data.receiverId.toString()).emit("new-message", populatedMsg);

      // Notify sender
      if (senderSocketId) {
        const senderSocket = io.sockets.sockets.get(senderSocketId);
        senderSocket?.emit("conversation-created", {
          conversationId: conversation._id,
          lastMessage: populatedMsg,
        });
      }
    }

    return populatedMsg;
  } catch (error: any) {
    console.error("handleSingleSendMessage Error:", error);
    await session.abortTransaction();
    session.endSession();

    socket.emit("socket-error", {
      event: "new-message",
      message: error.message || "Something went wrong sending message",
    });
  }
};
