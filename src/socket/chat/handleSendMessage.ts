import { Server, Socket } from "socket.io";
import mongoose from "mongoose";

import conversations from "../../app/modules/conversation/conversation.model";
import messages from "../../app/modules/message/message.model";
import AppError from "../../app/errors/AppError";
import status from "http-status";
import users from "../../app/modules/users/users.model";
import { USER_ROLE } from "../../app/modules/users/user.constant";


interface MessagePayload {
  receiverId?: string; // optional for group chat; may be used to add a participant
  currentSubId: string;
  text: string;
}

export const handleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: MessagePayload
) => {
  const session = await mongoose.startSession();
  try {

   
    // console.log({data, currentUserId})

    if (!data.currentSubId) {
      socket.emit("socket-error", { event: "new-message", message: "Missing eventId" });
      return;
    }
    const rawText = (data.text || "").trim();
    if (!rawText) {
      socket.emit("socket-error", { event: "new-message", message: "Message text is empty" });
      return;
    }
     
    // if receiverId not founded
    if(!data.receiverId){
      const superAdminId=await users.findOne({role:USER_ROLE.admin}).select("_id").lean();
       data.receiverId=superAdminId?._id.toString();
       if(!superAdminId){
          data.receiverId= "69347be2a8744afe3e2ec8b8"
       };
      
    };

    if (data.receiverId && data.receiverId === currentUserId) {
      socket.emit("socket-error", { event: "new-message", message: "You can't target yourself" });
      return;
    }
    
    if (data?.receiverId) {
      const receiverExists = await users.exists({ _id: data.receiverId });
      if (!receiverExists) {
        socket.emit("socket-error", { event: "new-message", message: "Provided receiverId not found" });
        return;
      }
    }
    session.startTransaction();
    const participantsToEnsure: string[] = [currentUserId];
    if (data.receiverId) participantsToEnsure.push(data.receiverId);

    const conversation = await conversations.findOneAndUpdate(
      { currentSubId: data.currentSubId },
      {
        $setOnInsert: {
          currentSubId: data.currentSubId,
          createdAt: new Date(),
        },
        $addToSet: { participants: { $each: participantsToEnsure } },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, session }
    ) as any;

    if (!conversation) {
      throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create or fetch conversation", "");
    }

    const createdMessages = await messages.create(
      [
        {
          text: rawText,
          msgByUserId: currentUserId,
          conversationId: conversation._id,
          seenBy: [],
          createdAt: new Date(),
        },
      ],
      { session }
    );
    const createdMessage = createdMessages[0];

    await conversations.updateOne(
      { _id: conversation._id },
      { $set: { lastMessage: createdMessage._id, updatedAt: new Date() } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const roomId = conversation._id.toString();
    socket.join(roomId);
    socket.data.currentConversationId = roomId;

    const room = io.sockets.adapter.rooms.get(roomId);
    const presentUserIds = new Set<string>();
    if (room && room.size > 0) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (!s) continue;
        const uid = (s.data && s.data.userId) || (s.handshake && s.handshake.auth && s.handshake.auth.userId);
        if (typeof uid === "string" && uid !== currentUserId) {
          
          presentUserIds.add(uid);
        }
      }
    }

    // If some participants are present, mark message as seen by them.
    const presentIdsArray = Array.from(presentUserIds);
    if (presentIdsArray.length > 0) {
      // update message document to add seenBy entries
      await messages.updateOne({ _id: createdMessage._id }, { $addToSet: { seenBy: { $each: presentIdsArray } } });
      // emit messages-seen to the conversation room (so clients can update read receipts)
      io.to(roomId).emit("messages-seen", {
        conversationId: conversation._id,
        seenBy: presentIdsArray,
        messageIds: [createdMessage._id],
      });
    }

    // Populate message for emit (include author info if your schema supports it)
    const updatedMsg = await messages.findById(createdMessage._id).populate([
      { path: "msgByUserId", select: "name photo" },
    ]);

    // Broadcast the new message once to the conversation room
    io.to(roomId).emit("new-message", updatedMsg);

    // If conversation was newly created (we can't directly know from findOneAndUpdate if it was inserted),
    // attempt to detect "new" by checking if conversation.createdAt is very recent (within 5s).
    // This is heuristic; if your schema stores a 'createdBy' or a 'isNew' flag on insert that's better.
    const justCreated = (() => {
      if (!conversation.createdAt) return false;
      const createdAt = new Date(conversation.createdAt).getTime();
      return Date.now() - createdAt < 5000; // 5 seconds
    })();

    if (justCreated) {
      // Notify participants that a conversation was created
      // We emit to participant user rooms (assuming your server has them join a room named by their userId on connect)
      const recipients = Array.from(new Set(conversation.participants.map(String)));
      for (const participantId of recipients) {
        io.to(participantId as any).emit("conversation-created", {
          conversationId: conversation._id,
          lastMessage: updatedMsg,
        });
      }

      // Also emit to sender's socket a local confirmation
      socket.emit("conversation-created", { conversationId: conversation._id, message: updatedMsg });
    }

  
  } catch (err: any) {
    try {
      await session.abortTransaction();
    } catch (abortErr) {
    } finally {
      session.endSession();
    }

    console.error("handleSendMessage (group) error:", err);
    const message = err?.message || "Internal Server Error";
    socket.emit("socket-error", { event: "new-message", message });
  }
};
