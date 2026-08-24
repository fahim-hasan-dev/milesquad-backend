import express from "express";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { TransactionController } from "./transaction.controller";
import { TransactionValidation } from "./transaction.validation";

const router = express.Router();

router.get(
    "/my-transactions",
    auth(USER_ROLES.DRIVER, USER_ROLES.CUSTOMER),
    TransactionController.getMyTransactions
);

router.post(
    "/payout-request",
    auth(USER_ROLES.DRIVER),
    validateRequest(TransactionValidation.payoutRequestZodSchema),
    TransactionController.requestPayout
);

router.get(
    "/",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    TransactionController.getAllTransactions
);

router.get(
    "/:id",
    auth(USER_ROLES.DRIVER, USER_ROLES.CUSTOMER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    TransactionController.getSingleTransaction
);

router.patch(
    "/payout-status/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    validateRequest(TransactionValidation.updatePayoutStatusZodSchema),
    TransactionController.updatePayoutStatus
);

export const TransactionRoutes = router;
