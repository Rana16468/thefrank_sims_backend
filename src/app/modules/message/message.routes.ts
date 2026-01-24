import express, { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';
import auth from '../../middlewares/auth';

import upload from '../../utils/uploadFile';
import AppError from '../../errors/AppError';
import validationRequest from '../../middlewares/validationRequest';
import MessageValidationSchema from './message.validations';
import MessageController from './message.controller';
import { USER_ROLE } from '../users/user.constant';
import { uploadToS3 } from '../../utils/uploadToS3';
import config from '../../config';


const router = express.Router();



router.post(
  "/new_message",
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.fields([
    { name: "imageUrl", maxCount: 10 },
    { name: "audioUrl", maxCount: 1 },
  ]),
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === "string") {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      // ✅ Upload images to S3
      if (files?.imageUrl) {
        const uploadedImages = await Promise.all(
          files.imageUrl.map((file) =>
            uploadToS3(file, config.file_path)
          )
        );

        req.body.imageUrl = uploadedImages; // S3 URLs
      }

      // ✅ Upload audio to S3
      if (files?.audioUrl && files.audioUrl.length > 0) {
        const uploadedAudios = await Promise.all(
          files.audioUrl.map((file) =>
            uploadToS3(file, config.file_path)
          )
        );

        req.body.audioUrl =
          uploadedAudios.length === 1
            ? uploadedAudios[0]
            : uploadedAudios;
      }

      next();
    } catch (error: any) {
      console.error("Upload error:", error);
      next(new AppError(httpStatus.BAD_REQUEST, "File upload failed", error));
    }
  },
  validationRequest(MessageValidationSchema.messageSchema),
  MessageController.new_message
);

router.patch(
  "/update_message_by_Id/:messageId",
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.fields([{ name: "imageUrl", maxCount: 5 }]),
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === "string") {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      // ✅ Upload updated images to S3
      if (files?.imageUrl) {
        const uploadedImages = await Promise.all(
          files.imageUrl.map((file) =>
            uploadToS3(file, config.file_path)
          )
        );

        req.body.imageUrl = uploadedImages; // S3 URLs
      }

      next();
    } catch (error: any) {
      console.error("Update upload error:", error);
      next(new AppError(httpStatus.BAD_REQUEST, "File upload failed", error));
    }
  },
  validationRequest(MessageValidationSchema.messageUpdateSchema),
  MessageController.updateMessageById
);

router.delete(
  '/delete_message/:messageId',
  auth(USER_ROLE.user,USER_ROLE.admin,USER_ROLE.superAdmin),
  MessageController.deleteMessageById,
);

router.get("/find_by_specific_conversation/:conversationId", auth(USER_ROLE.user,USER_ROLE.admin,USER_ROLE.superAdmin), MessageController.findBySpecificConversation);
// single_new_message
router.post(
  "/single_new_message",
  auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.fields([
    { name: "imageUrl", maxCount: 10 },
    { name: "audioUrl", maxCount: 1 },
  ]),
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === "string") {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      // ✅ Upload images to S3
      if (files?.imageUrl) {
        const uploadedImages = await Promise.all(
          files.imageUrl.map((file) =>
            uploadToS3(file, config.file_path)
          )
        );

        req.body.imageUrl = uploadedImages; // S3 URLs
      }

      // ✅ Upload audio to S3
      if (files?.audioUrl && files.audioUrl.length > 0) {
        const uploadedAudios = await Promise.all(
          files.audioUrl.map((file) =>
            uploadToS3(file, config.file_path)
          )
        );

        req.body.audioUrl =
          uploadedAudios.length === 1
            ? uploadedAudios[0]
            : uploadedAudios;
      }

      next();
    } catch (error: any) {
      console.error("Single message upload error:", error);
      next(new AppError(httpStatus.BAD_REQUEST, "File upload failed", error));
    }
  },
  MessageController.single_new_message
);

const messageRoutes = router;

export default messageRoutes;