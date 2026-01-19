
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


const route=express.Router();

route.post("/create_secure_folder", auth(USER_ROLE.user), validationRequest(SecureFolderValidation.secureFolderSchema), SecureFolderController.createSecureFolder);
route.get("/getUserMediaMessages", auth(USER_ROLE.user), SecureFolderController.getUserMediaMessages);
route.post(
  '/upload_media_file',
  auth(USER_ROLE.user,USER_ROLE.admin,USER_ROLE.superAdmin),
  upload.fields([
    { name: 'imageUrl', maxCount: 10 },
    { name: 'audioUrl', maxCount: 1 },
  ]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      // Handle image uploads if they exist
      if (files?.imageUrl) {
        // Store paths of uploaded images
        req.body.imageUrl = files.imageUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );
      }

      if (files?.audioUrl && files.audioUrl.length > 0) {
        const audioPaths = files.audioUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );

        req.body.audioUrl =
        audioPaths.length === 1 ? audioPaths[0] : audioPaths;
       
      }

      next();
    } catch (error: any) {
      next(new AppError(status.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  validationRequest(MessageValidationSchema.secureFolderMediaFileSchema),
   SecureFolderController.uploadContentSecureFolder,
);

route.get("/is_create_account_secure_folder", auth(USER_ROLE.user), SecureFolderController.isCreateAccountSecureFolder)
const SecureFolderRouter= route;
export default SecureFolderRouter;