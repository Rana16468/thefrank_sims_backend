import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import validationRequest from '../../middlewares/validationRequest';
import CurrentSubscriptionValidation from './current_subscription.validation';
import currentSubscriptionController from './current_subscription.controller';


const route=express.Router();

route.post("/recorded_subscription", auth(USER_ROLE.user), validationRequest(CurrentSubscriptionValidation.currentSubscriptionSchema), currentSubscriptionController.recorded_subscription);

const CurrentSubscriptionRoute=route;

export default CurrentSubscriptionRoute;