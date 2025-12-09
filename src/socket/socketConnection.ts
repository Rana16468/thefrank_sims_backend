import { Server as HTTPServer } from 'http';
import { Server as ChatServer, Socket } from 'socket.io';
import mongoose from 'mongoose';

import users from '../app/modules/users/users.model';
import conversations from '../app/modules/conversation/conversation.model';
import handleChatEvents from './handleChatEvents';

let io: ChatServer;
const onlineUsers = new Map<string, string>();

const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new ChatServer(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      pingInterval: 30000,
      pingTimeout: 5000,
    });
  }

  io.on('connection', async (socket: Socket) => {
    const userId = String(socket.handshake.query.id || '').trim();
    console.log('Client connected:', socket.id);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      socket.emit('error', 'Invalid or missing userId');
      socket.disconnect();
      return;
    }
    const currentUser = await users.findByIdAndUpdate(
      userId,
      { online: true, updatedAt: new Date() },
      { new: true, select: '_id publicKey' }
    ) as any;

    if (!currentUser) {
      socket.emit('error', 'User not found');
      socket.disconnect();
      return;
    }

    const currentUserId = String(currentUser._id);

    onlineUsers.set(currentUserId, socket.id);

    socket.join(currentUserId);

    const userConversations = await conversations
      .find({ participants: currentUserId })
      .select('_id');

    userConversations.forEach(conv =>
      socket.join(String(conv._id))
    );

    handleChatEvents(io, socket, currentUserId, currentUser.publicKey);

    console.log('User connected and rooms joined:', currentUserId);

    socket.on('disconnect', async () => {
      onlineUsers.delete(currentUserId);

      await users.findByIdAndUpdate(currentUserId, {
        online: false,
        updatedAt: new Date(),
      });

      console.log('Disconnected:', socket.id);
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) throw new Error('socket.io is not initialized');
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };
