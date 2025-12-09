import express from 'express';

import validationRequest from '../../middlewares/validationRequest';
import subscriptionValidation from './subscription.validation';
import subscriptionController from './subscription.controller';


const route=express.Router();

route.post("/create_subscription", validationRequest(subscriptionValidation.createSubscriptionValidation), subscriptionController.createSubscription);

const  SubscriptionRoute=route;
export default SubscriptionRoute;

