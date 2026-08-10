import express from "express";
import auth from "../../middleware/auth";
import { USER_ROLES } from "../../../enum/user";
import { DriverStatsController } from "./driverStats.controller";

const router = express.Router();

router.get(
    "/earnings",
    auth(USER_ROLES.DRIVER),
    DriverStatsController.getDriverEarnings
);

router.get(
    "/:id",
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.DRIVER),
    DriverStatsController.getDriverStats
);

export const DriverStatsRoutes = router;
