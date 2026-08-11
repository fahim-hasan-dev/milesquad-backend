import express from "express";
import { SubscriptionController } from "./subscription.controller";
import auth from "../../middleware/auth";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";

const router = express.Router();

router.get("/",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    SubscriptionController.subscriptions
);

router.get("/my-plan",
    auth(USER_ROLES.USER, USER_ROLES.DRIVER),
    SubscriptionController.subscriptionDetails
);

export const SubscriptionRoutes = router;