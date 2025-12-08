import { Server as IOServer, Socket } from 'socket.io';
import { handleGetConversations } from './chat/getConversation';
import { handleMessagePage } from './chat/getMessages';
import { handleSendMessage } from './chat/handleSendMessage';
import conversations from '../app/modules/conversation/conversation.model';
import AppError from '../app/errors/AppError';
import status from 'http-status';
import mongoose from 'mongoose';
import { handleSingleSendMessage } from './chat/handleSingleSendMessage';



const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  currentUserId: string,
): Promise<void> => {
  // join conversation

  // console.log('currentUserId: ',currentUserId)
 socket.on('join-conversation', async (data: { conversationId: string }) => {
  const { conversationId } = data;

  const isExistConversation = await conversations.exists({
    _id: new mongoose.Types.ObjectId(conversationId), participants:currentUserId
  });

  if (!isExistConversation) {
    throw new AppError(status.NOT_FOUND, 'Conversation not found', '');
  }

  const updatedConversation = await conversations.findByIdAndUpdate(
    conversationId,
    { $addToSet: { participants: currentUserId } },
    { new: true }
  );

  if (!updatedConversation) {
    throw new AppError(status.NOT_EXTENDED, 'Failed to add participant', '');
  }

  console.log("✅ Successfully added new participant:", currentUserId);
});


  socket.on('get-conversations', async(query) => {
    try {
      console.log({currentUserId, query})

      const conversations = await handleGetConversations(currentUserId, query);

      socket.emit('conversation-list', conversations);

    
    } catch (err: any) {
      socket.emit('socket-error', { errorMessage: err.message });
    }
  });
  // handleMessagePage(socket,currentUserId, data);

  socket.on('message-page', (data) => handleMessagePage(socket,currentUserId, data));

  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user-typing', { conversationId, userId });
  });

  socket.on('stop-typing', ({ conversationId, userId }) => {
    socket
      .to(conversationId)
      .emit('user-stop-typing', { conversationId, userId });
  });

  // handleSendMessage(io, socket, currentUserId, data)
 // group chat 
  socket.on('send-message', (data) =>handleSendMessage(io, socket, currentUserId, data));
// single chat 
    socket.on('single-chat-send-message', (data)=>handleSingleSendMessage(io, socket, currentUserId, data))
};

export default handleChatEvents;
