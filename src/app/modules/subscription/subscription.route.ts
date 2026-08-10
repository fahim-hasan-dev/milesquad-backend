import express from "express";
import { SubscriptionController } from "./subscription.controller";
import auth from "../../middleware/auth";
import { USER_ROLES } from "../../../enum/user";
const router = express.Router();

router.get("/",
    auth(USER_ROLES.ADMIN),
    SubscriptionController.subscriptions
);

router.get("/my-plan",
    auth(USER_ROLES.USER),
    SubscriptionController.subscriptionDetails
);

export const SubscriptionRoutes = router;