import express from "express";
import { PlanController } from "./plan.controller";
import { createPlanZodValidationSchema, updatePlanZodValidationSchema } from "./plan.validation";
import auth from "../../middleware/auth";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";
import validateRequest from "../../middleware/validateRequest";

const router = express.Router();

router.route("/")
    .post(
        auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
        validateRequest(createPlanZodValidationSchema),
        PlanController.createPlan
    )
    .get(
        auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN, USER_ROLES.USER, USER_ROLES.DRIVER),
        PlanController.getPlan
    );

router.post(
    "/create-checkout-session/:planId",
    auth(USER_ROLES.USER, USER_ROLES.DRIVER),
    PlanController.createCheckoutSession
);

router
    .route("/:id")
    .patch(
        auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
        validateRequest(updatePlanZodValidationSchema),
        PlanController.updatePlan
    )
    .delete(auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN), PlanController.deletePlan);

export const PlanRoutes = router;