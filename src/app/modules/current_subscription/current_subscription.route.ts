import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import validationRequest from '../../middlewares/validationRequest';
import CurrentSubscriptionValidation from './current_subscription.validation';
import currentSubscriptionController from './current_subscription.controller';


const route=express.Router();

route.post("/recorded_subscription", auth(USER_ROLE.user), validationRequest(CurrentSubscriptionValidation.currentSubscriptionSchema), currentSubscriptionController.recorded_subscription);
route.get("/find_my_active_current_subscription", auth(USER_ROLE.user), currentSubscriptionController.findByMyActiveCurrentSubscription);
route.get("/find_by_all_active_subscriber_list", auth(USER_ROLE.admin, USER_ROLE.superAdmin), currentSubscriptionController.findByAllActiveSubscriptionList);
route.patch("/update_active_status_admin/:currentSubscriberId", auth(USER_ROLE.admin,USER_ROLE.superAdmin), validationRequest(CurrentSubscriptionValidation.updateStatusSchema), currentSubscriptionController.updateActiveStatusAdmin);
route.get("/current_subscriber_growth", auth(USER_ROLE.admin,USER_ROLE.superAdmin), currentSubscriptionController.getCurrentSubscriberGrowth);

const CurrentSubscriptionRoute=route;

export default CurrentSubscriptionRoute;