import { Socket } from 'socket.io';
import conversations from '../../app/modules/conversation/conversation.model';
import { getSocketIO, onlineUsers } from '../socketConnection';
import QueryBuilder from '../../app/builder/QueryBuilder';
import messages from '../../app/modules/message/message.model';


export const handleMessagePage = async (
  socket: Socket,
  currentUserId: string,
  data: any,
) => {

  console.log(".....message page.....");
  console.log(data);
  const { conversationId, page = 1, limit = 15, search = '' } = data;

  const conversation = await conversations.findById(conversationId).populate(
    'participants',
    '-password',
  );

  // console.log('conversation',conversation)

  if (!conversation) {
    return socket.emit('socket-error', {
      event: 'message-page',
      message: 'Conversation not found',
    });
  }

  const otherUser: any = conversation.participants.find(
    (u: any) => u._id.toString() !== currentUserId,
  );

  const payload = {
    receiverId: otherUser._id,
    name: otherUser.name,
    profileImage: otherUser?.photo,
    online: onlineUsers.has(otherUser._id.toString()),
  };



  socket.emit('message-user', payload);

  const messageQuery = new QueryBuilder(messages.find({ conversationId }), {
    page,
    limit,
    search,
  })
    .search(['text'])
    .sort()
    .paginate();

    

  const messagess = await messageQuery.modelQuery;
  const meta = await messageQuery.countTotal();



  const unseenMessages = messagess.filter(
    (msg: any) =>
      msg.msgByUserId.toString() === otherUser._id.toString() && !msg.seen,
  );

  if (unseenMessages.length > 0) {
    const messageIds = unseenMessages.map((msg: any) => msg._id);

    await messages.updateMany(
      { _id: { $in: messageIds } },
      { $set: { seen: true } },
    );

    const io = getSocketIO();

    io.to(conversationId.toString()).emit('messages-seen', {
      conversationId,
      seenBy: currentUserId,
      messageIds,
    });
  }

  socket.emit('messages', {
    conversationId,
    userData: payload,
    messages: messagess.reverse(), // ✅ Fixed here
    meta,
  });

  socket.join(conversationId.toString());
  socket.data.currentConversationId = conversationId;
};
