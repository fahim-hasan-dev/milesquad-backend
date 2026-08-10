import express from "express";
import validateRequest from "../../middleware/validateRequest";
import { SettingControllers } from "./setting.controller";
import { SettingValidations } from "./setting.validation";
import auth from "../../middleware/auth";
import { USER_ROLES } from "../../../enum/user";

const router = express.Router();

router.get(
    "/",
    auth(USER_ROLES.SENDER, USER_ROLES.DRIVER, USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SettingControllers.getSettings
);

router.patch(
    "/",
    validateRequest(SettingValidations.updateSettingZodSchema),
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SettingControllers.updateSettings
);

export const SettingRoutes = router;
