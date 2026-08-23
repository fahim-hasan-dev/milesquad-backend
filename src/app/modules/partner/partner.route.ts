import express from "express";
import { ADMIN_ROLES } from "../../../enum/user";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { PartnerController } from "./partner.controller";
import { PartnerValidation } from "./partner.validation";

const router = express.Router();

router.post(
    "/",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    validateRequest(PartnerValidation.createPartnerZodSchema),
    PartnerController.createPartner
);

router.get(
    "/",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    PartnerController.getAllPartners
);

router.get(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    PartnerController.getSinglePartner
);

router.patch(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    validateRequest(PartnerValidation.updatePartnerZodSchema),
    PartnerController.updatePartner
);

router.delete(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    PartnerController.deletePartner
);

export const PartnerRoutes = router;
