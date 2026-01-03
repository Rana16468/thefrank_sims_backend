import express from "express";
import { TestRoutes } from "../modules/testModule/test.route";
import UserRouters from "../modules/users/users.route";
import AuthRouter from "../modules/auth/auth.route";
import SettingsRoutes from "../modules/settings/settings.routres";
import SubscriptionRoute from "../modules/subscription/subscription.route";
import CurrentSubscriptionRoute from "../modules/current_subscription/current_subscription.route";
import { conversationRoutes } from "../modules/conversation/conversation.route";
import messageRoutes from "../modules/message/message.routes";
import SecureFolderRouter from "../modules/secure_folder/secure_folder.route";
import SecureMediaStoresRoutes from "../modules/secure_media_stores/secure_media_stores.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/test",
    route: TestRoutes,
  },
  {
    path:"/users",
    route:  UserRouters
  },
  {
    path:"/auth",
    route: AuthRouter
  },
  {
    path:"/setting",
    route:SettingsRoutes
  },
  {
    path:"/subscription",
    route: SubscriptionRoute
  },
  {
    path:"/current_subscription",
    route: CurrentSubscriptionRoute
  },
  {
    path:"/conversation",
    route: conversationRoutes
  },
  {
    path:"/message",
    route: messageRoutes
  },
  {
    path:"/secure_folder",
    route: SecureFolderRouter
  },
  {
    path:"/secure_media_stores",
    route:  SecureMediaStoresRoutes
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;