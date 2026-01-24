
import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import validationRequest from '../../middlewares/validationRequest';
import SecureFolderValidation from './secure_folder.validation';
import SecureFolderController from './secure_folder.controller';
import upload from '../../utils/uploadFile';
import AppError from '../../errors/AppError';
import status from 'http-status';
import MessageValidationSchema from '../message/message.validations';
import { uploadToS3 } from '../../utils/uploadToS3';
import config from '../../config';


const route=express.Router();

route.post("/create_secure_folder", auth(USER_ROLE.user), validationRequest(SecureFolderValidation.secureFolderSchema), SecureFolderController.createSecureFolder);
route.get("/getUserMediaMessages", auth(USER_ROLE.user), SecureFolderController.getUserMediaMessages);
route.post(
  "/upload_media_file",
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
          {

            const result=uploadToS3(file, config.file_path);

              
          
            return result
          }
          )
        );

        

        req.body.imageUrl = uploadedImages; // now S3 URLs
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
      next(new AppError(status.BAD_REQUEST, "Upload failed", error));
    }
  },
  validationRequest(MessageValidationSchema.secureFolderMediaFileSchema),
  SecureFolderController.uploadContentSecureFolder
);


route.get("/is_create_account_secure_folder", auth(USER_ROLE.user), SecureFolderController.isCreateAccountSecureFolder)
const SecureFolderRouter= route;
export default SecureFolderRouter;