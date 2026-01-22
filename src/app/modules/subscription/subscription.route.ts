import express from 'express';

import validationRequest from '../../middlewares/validationRequest';
import subscriptionValidation from './subscription.validation';
import subscriptionController from './subscription.controller';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';


const route=express.Router();

route.post("/create_subscription", validationRequest(subscriptionValidation.createSubscriptionValidation), subscriptionController.createSubscription);
route.get("/find_by_all_subscription", subscriptionController.findByAllSubscription);
route.patch("/update_subscription/:id", auth(USER_ROLE.admin), validationRequest(subscriptionValidation.updateSubscriptionValidation), subscriptionController.updateSubscription);
const  SubscriptionRoute=route;
export default SubscriptionRoute;

