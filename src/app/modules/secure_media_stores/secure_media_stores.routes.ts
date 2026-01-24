import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import upload from '../../utils/uploadFile';
import { USER_ROLE } from '../users/user.constant';
import AppError from '../../errors/AppError';
import status from 'http-status';
import validationRequest from '../../middlewares/validationRequest';
import SecureMediaStoresValidation from './secure_media_stores.validation';
import SecureMediaStoresController from './secure_media_stores.controllers';
import { uploadToS3 } from '../../utils/uploadToS3';
import config from '../../config';

const routes=express.Router();

routes.post(
  '/upload_media_file',
  auth(USER_ROLE.user,USER_ROLE.admin,USER_ROLE.superAdmin),
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

               console.log(".....................result ............")
               console.log(result);
          
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
  validationRequest(SecureMediaStoresValidation.secureFolderMediaFileSchema),
   SecureMediaStoresController.uploadContentSecureFolder,
);

routes.get("/find_by_my_secure_data", auth(USER_ROLE.user), SecureMediaStoresController.findByMySecureFolderMedia)

const SecureMediaStoresRoutes=routes;

export default SecureMediaStoresRoutes;



