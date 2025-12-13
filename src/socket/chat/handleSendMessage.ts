import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import crypto from "crypto";

import conversations from "../../app/modules/conversation/conversation.model";
import messages from "../../app/modules/message/message.model";
import users from "../../app/modules/users/users.model";
import { USER_ROLE } from "../../app/modules/users/user.constant";
import cryptoUtils from "../../app/utils/cryptoUtils/cryptoUtils";


interface MessagePayload {
  conversationId:string
  receiverId?: string;
  currentSubId: string;
  text: string;
  imageUrl?: string[];
  audioUrl?: string;
}

export const handleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: MessagePayload,
  publicKey: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // -----------------------------------
    // 1️⃣ Validate payload
    // -----------------------------------
    if (!data.currentSubId) {
      throw new Error("currentSubId is required");
    }

    const rawText = (data.text || "").trim();
    if (!rawText) {
      throw new Error("Message text is empty");
    }

    // -----------------------------------
    // 2️⃣ Resolve receiver (fallback admin)
    // -----------------------------------
    if (!data.receiverId) {
      const admin = await users
        .findOne({ role: USER_ROLE.admin })
        .select("_id")
        .lean();

      data.receiverId = admin?._id.toString() || "69347be2a8744afe3e2ec8b8";
    }

    if (data.receiverId === currentUserId) {
      throw new Error("You can't send message to yourself");
    }

    const receiverExists = await users
      .exists({ _id: data.receiverId })
      .session(session);

    if (!receiverExists) {
      throw new Error("Receiver not found");
    }



    // -----------------------------------
    // 3️⃣ Find or create conversation
    // -----------------------------------
    const participants = [currentUserId, data.receiverId];

    const conversation = await conversations.findOneAndUpdate(
      {_id: data?.conversationId, currentSubId: data.currentSubId },
      {
        $setOnInsert: {
          currentSubId: data.currentSubId,
          createdAt: new Date(),
        },
        $addToSet: { participants: { $each: participants } },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    ) as any;

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    // -----------------------------------
    // 4️⃣ Encrypt message (ECDH)
    // -----------------------------------
    const recipientPub = Buffer.from(publicKey, "base64");
    const ephem = crypto.createECDH("prime256v1");
    ephem.generateKeys();

    const sharedSecret = ephem.computeSecret(recipientPub);

    const encryptedText = cryptoUtils.encryptMessage(sharedSecret, rawText);

    const encryptedImages =
      Array.isArray(data.imageUrl) && data.imageUrl.length > 0
        ? data.imageUrl.map(img =>
            cryptoUtils.encryptMessage(sharedSecret, img)
          )
        : [];

    const encryptedAudio = data.audioUrl
      ? cryptoUtils.encryptMessage(sharedSecret, data.audioUrl)
      : undefined;

    // -----------------------------------
    // 5️⃣ Save message
    // -----------------------------------
    const created = await messages.create(
      [
        {
          text: encryptedText,
          imageUrl: encryptedImages,
          audioUrl: encryptedAudio,
          iv: encryptedText.iv,
          tag: encryptedText.tag,
          ephemPublicKey: ephem.getPublicKey().toString("base64"),
          msgByUserId: new mongoose.Types.ObjectId(currentUserId),
          conversationId: conversation._id,
          seen: false,
          createdAt: new Date(),
        },
      ],
      { session }
    );

    const savedMessage = created[0];

    // -----------------------------------
    // 6️⃣ Update conversation lastMessage
    // -----------------------------------
    await conversations.updateOne(
      { _id: conversation._id },
      { lastMessage: savedMessage._id, updatedAt: new Date() },
      { session }
    );

    // -----------------------------------
    // 7️⃣ Commit transaction
    // -----------------------------------
    await session.commitTransaction();
    session.endSession();

    // -----------------------------------
    // 8️⃣ Socket room join
    // -----------------------------------
    const roomId = conversation._id.toString();

    socket.join(roomId);
    socket.data.currentConversationId = roomId;

    // -----------------------------------
    // 9️⃣ Populate message
    // -----------------------------------
    const populatedMsg = await messages
      .findById(savedMessage._id)
      .populate("msgByUserId", "name photo email");

    // -----------------------------------
    // 🔟 Emit new message
    // -----------------------------------
    io.to(roomId).emit("new-message", populatedMsg);

    // -----------------------------------
    // 1️⃣1️⃣ Auto-seen logic
    // -----------------------------------
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (
          s &&
          s.data?.currentConversationId === roomId &&
          s.data?.userId !== currentUserId
        ) {
          await messages.updateOne(
            { _id: savedMessage._id },
            { $set: { seen: true } }
          );

          io.to(roomId).emit("messages-seen", {
            conversationId: conversation._id,
            seenBy: data.receiverId,
            messageIds: [savedMessage._id],
          });
          break;
        }
      }
    }

    // -----------------------------------
    // 1️⃣2️⃣ New conversation notify
    // -----------------------------------
    const justCreated =
      Date.now() - new Date(conversation.createdAt).getTime() < 5000;

    if (justCreated) {
      const participantIds = conversation.participants.map(String);

      for (const uid of participantIds) {
        io.to(uid).emit("conversation-created", {
          conversationId: conversation._id,
          lastMessage: populatedMsg,
        });
      }
    }

    return populatedMsg;
  } catch (error: any) {
    console.error("handleSendMessage error:", error);

    await session.abortTransaction();
    session.endSession();

    socket.emit("socket-error", {
      event: "new-message",
      message: error.message || "Failed to send message",
    });
  }
};
