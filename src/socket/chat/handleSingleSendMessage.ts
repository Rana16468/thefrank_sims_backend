import mongoose from "mongoose";
import conversations from "../../app/modules/conversation/conversation.model";
import messages from "../../app/modules/message/message.model";
import { onlineUsers } from "../socketConnection";
import cryptoUtils from "../../app/utils/cryptoUtils/cryptoUtils";
import { CHAT_TYPE } from "../../app/modules/conversation/conversation.constant";
import { Server, Socket } from "socket.io";
import  crypto from 'crypto'
;
import users from "../../app/modules/users/users.model";
export const handleSingleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: any,
  publicKey:string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ------------------ 1) Validate ------------------
    if (!data?.receiverId) throw new Error("Receiver ID is required");

    const receiver = await users
      .findById(data.receiverId)
      .select("publicKey")
      .session(session);

    if (!receiver?.publicKey) throw new Error("Receiver public key missing");

    // ------------------ 2) Find existing conversation ------------------
    let conversation = null;
    let isNewConversation = false;

    // Try to find by conversationId if provided
    if (data.conversationId) {

      conversation = await conversations
        .findOne({
          _id: data.conversationId,
          chat: CHAT_TYPE.singlechat,
          participants: { $all: [currentUserId, data.receiverId], $size: 2 },
        })
        .session(session);
    }

    // If not found by ID, check if a single-chat between the two exists
    if (!conversation) {
      conversation = await conversations
        .findOne({
          chat: CHAT_TYPE.singlechat,
          participants: { $all: [currentUserId, data.receiverId], $size: 2 },
        })
        .session(session);
    }

    // Only create if no conversation exists
    if (!conversation) {
      const [created] = await conversations.create(
        [
          {
            chat: CHAT_TYPE.singlechat,
            participants: [currentUserId, data.receiverId],
          },
        ],
        { session }
      );
      conversation = created;
      isNewConversation = true;
    }

    // ------------------ 3) Encrypt ------------------
    const recipientPub = Buffer.from( publicKey, "base64");
    const ephem = crypto.createECDH("prime256v1");
    ephem.generateKeys();
    const sharedSecret = ephem.computeSecret(recipientPub);

    const encryptedText = cryptoUtils.encryptMessage(sharedSecret, data.text);

    const encryptedImages = Array.isArray(data.imageUrl)
      ? data.imageUrl.map((img: string) =>
          cryptoUtils.encryptMessage(sharedSecret, img)
        )
      : [];

    const encryptedAudio = data.audioUrl
      ? cryptoUtils.encryptMessage(sharedSecret, data.audioUrl)
      : null;

    // ------------------ 4) Save message ------------------
    const [savedMessage] = await messages.create(
      [
        {
          text: encryptedText,
          imageUrl: encryptedImages,
          audioUrl: encryptedAudio,
          ephemPublicKey: ephem.getPublicKey().toString("base64"),
          msgByUserId: new mongoose.Types.ObjectId(currentUserId),
          conversationId: conversation._id,
          seen: false,
        },
      ],
      { session }
    );

    await conversations.updateOne(
      { _id: conversation._id },
      { lastMessage: savedMessage._id },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // ------------------ 5) Socket handling ------------------
    const roomId = conversation._id.toString();

    // Join sender
    socket.join(roomId);
    socket.data.currentConversationId = roomId;

    // Join receiver if online
    const receiverSocketId = onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.sockets.sockets.get(receiverSocketId)?.join(roomId);
    }

    const populatedMsg = await messages
      .findById(savedMessage._id)
      .populate("msgByUserId", "name photo email");

    io.to(roomId).emit("new-message", populatedMsg);

    // ------------------ 6) Seen logic ------------------
    if (receiverSocketId) {
      const rSocket = io.sockets.sockets.get(receiverSocketId);
      if (rSocket?.data?.currentConversationId === roomId) {
        await messages.updateOne({ _id: savedMessage._id }, { seen: true });

        io.to(roomId).emit("messages-seen", {
          conversationId: conversation._id,
          seenBy: data.receiverId,
          messageIds: [savedMessage._id],
        });
      }
    }

    // ------------------ 7) New conversation notify ------------------
    if (isNewConversation && receiverSocketId) {
      io.to(receiverSocketId).emit("conversation-created", {
        conversationId: conversation._id,
        lastMessage: populatedMsg,
      });
    }

    return populatedMsg;
  } catch (error: any) {
    await session.abortTransaction().catch(() => {});
    session.endSession();

    socket.emit("socket-error", {
      event: "new-message",
      message: error.message || "Message send failed",
    });
  }
};

