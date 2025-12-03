import express from "express";
import { TestRoutes } from "../modules/testModule/test.route";
import UserRouters from "../modules/users/users.route";
import AuthRouter from "../modules/auth/auth.route";

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
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;