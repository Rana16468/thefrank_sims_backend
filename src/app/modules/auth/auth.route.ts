import express, { NextFunction, Request, Response } from "express";

import AuthController from "./auth.controller";

import status from "http-status";
import validationRequest from "../../middlewares/validationRequest";
import { USER_ROLE } from "../users/user.constant";
import auth from "../../middlewares/auth";
import upload from "../../utils/uploadFile";
import AppError from "../../errors/AppError";
import LoginValidationSchema from "./auth.validation";

const router = express.Router();

router.post(
  "/login_user",
  validationRequest(LoginValidationSchema.LoginSchema),
  AuthController.loginUser,
);

router.post(
  "/refresh-token",
  validationRequest(LoginValidationSchema.requestTokenValidationSchema),
  AuthController.refreshToken,
);

router.get(
  "/myprofile",
  auth(USER_ROLE.user, USER_ROLE.superAdmin, USER_ROLE.admin),
  AuthController.myprofile,
);

// Routes file
router.patch(
  "/update_my_profile",
  auth(USER_ROLE.user, USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === "string") {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch (error) {
      next(new AppError(status.BAD_REQUEST, "Invalid JSON data", ""));
    }
  },
  validationRequest(LoginValidationSchema.changeMyProfileSchema),
  AuthController.chnageMyProfile,
);

router.get(
  "/find_by_admin_all_users",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AuthController.findByAllUsersAdmin,
);

router.delete(
  "/delete_account/:id",
  auth(
    USER_ROLE.admin,

    USER_ROLE.superAdmin,
    USER_ROLE.user,
  ),
  AuthController.deleteAccount,
);

router.get(
  "/user_graph",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AuthController.getUserGrowth,
);

router.patch(
  "/change_status/:id",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validationRequest(LoginValidationSchema.changeUserAccountStatus),
  AuthController.isBlockAccount,
);

router.post("/recoveryKey", validationRequest(LoginValidationSchema. recoveryKeySchema), AuthController.recoveryKey);
router.get("/find_by_all_user_chat_list", auth(USER_ROLE.user), AuthController.findByAllUserChatList);
router.get("/find_by_specific_user_profile/:userId", auth(USER_ROLE.user), AuthController.findBySpecificUserProfile);
router.get("/dashboard_entity_count", auth(USER_ROLE.admin), AuthController.dashboardEntityCount);
const AuthRouter = router;
export default AuthRouter;
