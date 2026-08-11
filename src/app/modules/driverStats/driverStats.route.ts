import express from "express";
import auth from "../../middleware/auth";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";
import { DriverStatsController } from "./driverStats.controller";

const router = express.Router();

router.get(
    "/earnings",
    auth(USER_ROLES.DRIVER),
    DriverStatsController.getDriverEarnings
);

router.get(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN, USER_ROLES.DRIVER),
    DriverStatsController.getDriverStats
);

export const DriverStatsRoutes = router;
