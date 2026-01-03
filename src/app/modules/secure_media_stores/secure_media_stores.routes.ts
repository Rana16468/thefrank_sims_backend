import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import upload from '../../utils/uploadFile';
import { USER_ROLE } from '../users/user.constant';
import AppError from '../../errors/AppError';
import status from 'http-status';
import validationRequest from '../../middlewares/validationRequest';
import SecureMediaStoresValidation from './secure_media_stores.validation';
import SecureMediaStoresController from './secure_media_stores.controllers';

const routes=express.Router();

routes.post(
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
  validationRequest(SecureMediaStoresValidation.secureFolderMediaFileSchema),
   SecureMediaStoresController.uploadContentSecureFolder,
);

const SecureMediaStoresRoutes=routes;

export default SecureMediaStoresRoutes;



