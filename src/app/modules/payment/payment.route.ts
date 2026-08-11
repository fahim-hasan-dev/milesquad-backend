import { Router } from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middleware/auth";
import { ADMIN_ROLES } from "../../../enum/user";

const router = Router();

router.post(
    "/checkout-session/:referenceId",
    PaymentController.createCheckoutSession
);

router.get(
    "/",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    PaymentController.getPaymentsController
);

router.get(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    PaymentController.getPaymentByIdController
);

export const PaymentRoutes = router;
