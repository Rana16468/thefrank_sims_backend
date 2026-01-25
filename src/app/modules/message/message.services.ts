


import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';

import AppError from '../../errors/AppError';
import { getSocketIO, onlineUsers } from '../../../socket/socketConnection';
import conversations from '../conversation/conversation.model';
import messages from './message.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { CHAT_TYPE } from '../conversation/conversation.constant';
import users from '../users/users.model';
import crypto from 'crypto';
import cryptoUtils from '../../utils/cryptoUtils/cryptoUtils';
import { deleteFromS3 } from '../../utils/deleteFromS3';


interface JwtPayloads {
  id: string;
}

interface NewMessagePayload {
  receiverId: string;
  conversationId: string;
  currentSubId: string;
  text?: string; // optional now
  imageUrl?: string[];
  audioUrl?: string;
  chat?: "singlechat" | "groupchat";
}

 const new_message_IntoDb = async (
  user: JwtPayloads,
  data: NewMessagePayload
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
   
    if (!user?.id) throw new AppError(httpStatus.UNAUTHORIZED, "User ID missing", "");
    if (!data?.receiverId) throw new AppError(httpStatus.BAD_REQUEST, "Receiver ID required", "");

   
    const receiver = await users
      .findById(data.receiverId)
      .select("publicKey")
      .session(session);

    if (!receiver) throw new AppError(httpStatus.NOT_FOUND, "Receiver not found", "");
    if (!receiver.publicKey) throw new AppError(httpStatus.BAD_REQUEST, "Receiver public key missing", "");

 
    let conversation = await conversations
      .findOne({
        _id: data.conversationId,
        currentSubId: data.currentSubId,
        participants: { $all: [user.id, data.receiverId] },
      })
      .session(session);

    

    let isNewConversation = false;

    if (!conversation) {
      const created = await conversations.create(
        [
          {
            currentSubId: data.currentSubId,
            participants: [user.id, data.receiverId],
            chat: data.chat,
          },
        ],
        { session }
      );
      conversation = created[0];
      isNewConversation = true;
    }

    if (!conversation || !conversation._id) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Conversation creation failed", "");
    }

    const recipientPub = Buffer.from(receiver.publicKey, "base64");
    const ephem = crypto.createECDH("prime256v1");
    ephem.generateKeys();
    const sharedSecret = ephem.computeSecret(recipientPub);

  
    let encryptedText
    if (data.text) {
      encryptedText = cryptoUtils.encryptMessage(sharedSecret, data.text);
    }

    
    let imageUrlEncrypted: { ciphertext: string; iv: string; tag: string }[] = [];
    if (Array.isArray(data.imageUrl) && data.imageUrl.length > 0) {
      imageUrlEncrypted = data.imageUrl.map((img) =>
        cryptoUtils.encryptMessage(sharedSecret, img)
      );
    }

    
    let audioEncrypted: { ciphertext: string; iv: string; tag: string } | undefined;
    if (data.audioUrl) {
      audioEncrypted = cryptoUtils.encryptMessage(sharedSecret, data.audioUrl);
    }

    
    if (!encryptedText && imageUrlEncrypted.length === 0 && !audioEncrypted) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Message must contain text, images, or audio",
        ""
      );
    }

    
    const newMessage = await messages.create(
      [
        {
          text: encryptedText || null,
          imageUrl: imageUrlEncrypted,
          audioUrl: audioEncrypted || null,
          seen: false,
          ephemPublicKey: ephem.getPublicKey().toString("base64"),
          msgByUserId: new mongoose.Types.ObjectId(user.id),
          conversationId: conversation._id,
          receiverId: data.receiverId
        },
      ],
      { session }
    );

    const savedMessage = newMessage[0];

   
    await conversations.updateOne(
      { _id: conversation._id },
      { lastMessage: savedMessage._id },
      { session }
    );

   
    await session.commitTransaction();
    session.endSession();

    
    const io = getSocketIO();
    const roomId = conversation._id.toString();

    const senderSocketId = onlineUsers.get(user.id.toString());
    if (senderSocketId) {
      const senderSocket = io.sockets.sockets.get(senderSocketId);
      if (senderSocket) {
        senderSocket.join(roomId);
        senderSocket.data.currentConversationId = roomId;
      }
    }

    const populatedMsg = await messages
      .findById(savedMessage._id)
      .populate("msgByUserId", "name photo email");

    io.to(roomId).emit("new-message", populatedMsg);

    
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.data?.currentConversationId === roomId && s.id !== senderSocketId) {
          await messages.updateOne({ _id: savedMessage._id }, { $set: { seen: true } });

          io.to(roomId).emit("messages-seen", {
            conversationId: conversation._id,
            seenBy: data.receiverId,
            messageIds: [savedMessage._id],
          });

          break;
        }
      }
    }

    
    if (isNewConversation) {
      io.to(data.receiverId.toString()).emit("conversation-created", {
        conversationId: conversation._id,
        lastMessage: populatedMsg,
      });

      io.to(data.receiverId.toString()).emit("new-message", populatedMsg);

      if (senderSocketId) {
        const senderSocket = io.sockets.sockets.get(senderSocketId);
        senderSocket?.emit("conversation-created", {
          conversationId: conversation._id,
          lastMessage: populatedMsg,
        });
      }
    }

    return { status: true, message: "Successfully sent message", data: populatedMsg };
  } catch (err: any) {
    try {
      await session.abortTransaction();
    } catch {}
    session.endSession();

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      err.message || "Message sending failed",
      ""
    );
  }
};

//update message
const updateMessageById_IntoDb = async (
  messageId: string,
  updateData: Partial<{ text: string; imageUrl: string[] }>
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updated = await messages.findByIdAndUpdate(
      messageId,
      { $set: updateData },
      { new: true, session }
    );

    if (!updated) {
      throw new AppError(httpStatus.NOT_FOUND, 'Message not found', 'd');
    }

   
    await conversations.updateMany(
      { lastMessage: messageId },
      { $set: { lastMessage: updated._id } },
      { session }
    );

    const conversation = await conversations.findById(
      updated.conversationId
    ).session(session);

    if (!conversation) {
      throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found', '');
    }

    await session.commitTransaction();
    session.endSession();


    const io = getSocketIO();
    conversation.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('message-updated', updated);
    });

    return updated;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error updating message',
      error
    );
  }
};


const deleteMessageById_IntoDb = async (
  messageId: string,
  userId: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /* ----------------------------
        💬 Load message
    ----------------------------- */
    const message = await messages.findById(messageId).session(session);
    console.log(message);
    

    if (!message) {
      throw new AppError(httpStatus.NOT_FOUND, "Message not found");
    }

    if (!message.ephemPublicKey) {
      throw new AppError(httpStatus.BAD_REQUEST, "Missing ephemPublicKey");
    }

    /* ----------------------------
        👤 Load MESSAGE OWNER (sender)
    ----------------------------- */
    const owner = await users
      .findById(message.msgByUserId) // ✅ MUST be sender
      .select("privateKey")
      .lean<{ privateKey: string }>();

    if (!owner?.privateKey) {
      throw new AppError(httpStatus.NOT_FOUND, "Sender private key not found");
    }

    /* ----------------------------
        🔐 Prepare ECDH
    ----------------------------- */
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from("/qW04wZKbSna1ohCacr48TTzhbzYHx9A2EcOgq9LGgY=", "base64"));

    const sharedSecret = ecdh.computeSecret(
      Buffer.from(message.ephemPublicKey, "base64")
    );

    const filesToDelete: string[] = [];

    const decryptPayload = (
      payload?: { ciphertext: string; iv: string; tag: string }
    ): string | null => {

   

      if (!payload) return null;
      return cryptoUtils.decryptMessage(sharedSecret, payload);
    };

   

    if (Array.isArray(message.imageUrl)) {
      for (const img of message.imageUrl) {
        console.log("img", img);

        const url = decryptPayload(img);
        if (url) filesToDelete.push(url);
      }
    }

    if (message.audioUrl) {
      const url = decryptPayload(message.audioUrl);
      if (url) filesToDelete.push(url);
    }

    /* ----------------------------
        🗑 Delete files (S3)
    ----------------------------- */
    for (const fileUrl of filesToDelete) {
      console.log("Deleting:", fileUrl);
      // await deleteFromS3(fileUrl);
    }

    /* ----------------------------
        🗑 Delete message
    ----------------------------- */
    // await messages.deleteOne({ _id: messageId }).session(session);

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Message deleted successfully",
      messageId,
      deletedFiles: filesToDelete,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Error deleting message",
      error
    );
  }
};







const findBySpecificConversationInDb = async (
  conversationId: string,
  query: Record<string, unknown>
) => {
  try {
    const conversation = await conversations
      .findById(conversationId)
      .select("participants -_id")
      .lean();

    if (!conversation) {
      throw new Error("Conversation not found");
    }
const userPrivateKeyList = await users.find(
  { _id: { $in: conversation.participants } },
  {  privateKey: 1 }
).lean();


    const baseQuery = messages
      .find({ conversationId })
      .populate({
        path: "msgByUserId",
        select: "name photo online ", 
      });



    const messagerQuery = new QueryBuilder(baseQuery, query)
      .search(["msgByUserId.name"])
      .filter()
      .sort()
      .paginate()
      .fields();

    const allmessage = await messagerQuery.modelQuery.lean();
    const meta = await messagerQuery.countTotal();

 const decrypted = allmessage?.map((msg: any) => {
  const { iv, tag, ephemPublicKey, ...rest } = msg;

  if (!ephemPublicKey) {
    return { ...rest, text: "[Missing ephem key]" };
  }

  const ephemKeyBuffer = Buffer.from(ephemPublicKey, "base64");

  // all possible private keys (sender + receiver)
  const possiblePrivateKeys = userPrivateKeyList
    .map((u: any) => u?.privateKey)
    .filter(Boolean);

  let decryptedText = "[Unable to decrypt]";
  let decryptedImages: any[] = [];
  let decryptedAudio: any = null;

  for (const privateKey of possiblePrivateKeys) {
    try {
      const ecdh = crypto.createECDH("prime256v1");
      ecdh.setPrivateKey(Buffer.from(privateKey, "base64"));

      const sharedSecret = ecdh.computeSecret(ephemKeyBuffer);

      // try decrypting text
      decryptedText = msg.text
        ? cryptoUtils.decryptMessage(sharedSecret, msg.text)
        : "";

      // try decrypting images
      decryptedImages = Array.isArray(msg.imageUrl)
        ? msg.imageUrl.map((img: any) =>
            cryptoUtils.decryptMessage(sharedSecret, img)
          )
        : [];

      // try decrypting audio
      decryptedAudio = msg.audioUrl
        ? cryptoUtils.decryptMessage(sharedSecret, msg.audioUrl)
        : null;

      // ✅ success → stop trying other keys
      break;
    } catch (err) {
      // ❌ wrong private key → try next one
      continue;
    };  
  }

  return {
    ...rest,
    text: decryptedText,
    imageUrl: decryptedImages,
    audioUrl: decryptedAudio,
  };
});


    return { meta, allmessage: decrypted };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Error find By Specific Conversation InDb",
      error
    );
  }
};







const single_new_message_IntoDb = async (
  user: JwtPayload,
  data: NewMessagePayload
) => {
  try {
    
    const senderId = user._id || user.id;
    if (!senderId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Sender ID missing from token");
    }

    
    if (senderId.toString() === data.receiverId.toString()) {
      throw new AppError(httpStatus.BAD_REQUEST, "You can't chat with yourself");
    }

    const receiver = await users.findById(data.receiverId).select("_id");
    if (!receiver) {
      throw new AppError(httpStatus.NOT_FOUND, "Receiver not found");
    }

    let isNewConversation = false;
    let conversation = await conversations.findOne({
      chat: CHAT_TYPE.singlechat,
      participants: { $all: [senderId, data.receiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = await conversations.create({
        chat: CHAT_TYPE.singlechat,
        participants: [senderId, data.receiverId],
      });
      isNewConversation = true;
    }


    const messageData = {
      text: data.text?.trim() || "",
      imageUrl: data.imageUrl || [],
      audioUrl: data.audioUrl || "",
      eventId: data.currentSubId || null,
      msgByUserId: senderId, // always provided
      conversationId: conversation._id,
      receiverId: data.receiverId
    };

    const savedMessage = await messages.create(messageData);

   
    await conversations.updateOne(
      { _id: conversation._id },
      { lastMessage: savedMessage._id, updatedAt: new Date() }
    );

 

    return {
      success: true,
      message: "Message sent successfully",
      data: {
        isNewConversation,
        conversationId: conversation._id,
        message: "successfully recorded",
      },
    };
  } catch (error: any) {
    console.error("Error single_new_message_IntoDb:", error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Error sending single chat message",
      error
    );
  }
};





const MessageService = {
  new_message_IntoDb,
  updateMessageById_IntoDb,
  deleteMessageById_IntoDb,
  findBySpecificConversationInDb,
  single_new_message_IntoDb 
};

export default MessageService;
