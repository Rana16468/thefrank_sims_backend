import express from 'express';

import validationRequest from '../../middlewares/validationRequest';
import subscriptionValidation from './subscription.validation';
import subscriptionController from './subscription.controller';


const route=express.Router();

route.post("/create_subscription", validationRequest(subscriptionValidation.createSubscriptionValidation), subscriptionController.createSubscription);
route.get("/find_by_all_subscription", subscriptionController.findByAllSubscription);

const  SubscriptionRoute=route;
export default SubscriptionRoute;

