import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import ConversationController from './conversation.controller';





const router = express.Router();

router.get(
  '/get-chat-list',
  auth(USER_ROLE.user),
  ConversationController.getChatList,
);

router.get("/allConversation", ConversationController. allConversation);
router.get("/specific_event_wise_conversation/:currentSubId", auth(USER_ROLE.user,USER_ROLE.admin,USER_ROLE.superAdmin), ConversationController.specificAllGetConversations);
router.get("/get_single_conversation", auth(USER_ROLE.user),ConversationController.getSingleConversationList)
router.get("/get_group_conversation/:eventId", auth(USER_ROLE.user,USER_ROLE.admin,USER_ROLE.superAdmin), ConversationController.getGroupConversationList)

export const conversationRoutes = router;