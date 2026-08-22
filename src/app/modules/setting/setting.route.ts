import express from "express";
import validateRequest from "../../middleware/validateRequest";
import { SettingControllers } from "./setting.controller";
import { SettingValidations } from "./setting.validation";
import auth from "../../middleware/auth";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";

const router = express.Router();

router.get(
    "/",
    auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    SettingControllers.getSettings
);

router.patch(
    "/",
    validateRequest(SettingValidations.updateSettingZodSchema),
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    SettingControllers.updateSettings
);

export const SettingRoutes = router;
