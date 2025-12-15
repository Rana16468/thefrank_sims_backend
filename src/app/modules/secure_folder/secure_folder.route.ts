
import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import validationRequest from '../../middlewares/validationRequest';
import SecureFolderValidation from './secure_folder.validation';
import SecureFolderController from './secure_folder.controller';


const route=express.Router();

route.post("/create_secure_folder", auth(USER_ROLE.user), validationRequest(SecureFolderValidation.secureFolderSchema), SecureFolderController.createSecureFolder);
route.get("/getUserMediaMessages", auth(USER_ROLE.user), SecureFolderController.getUserMediaMessages);

const SecureFolderRouter= route;
export default SecureFolderRouter;