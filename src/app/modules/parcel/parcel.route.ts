import express from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { USER_ROLES } from "../../../enum/user";
import { ParcelController } from "./parcel.controller";
import { ParcelValidation } from "./parcel.validation";
import { fileAndBodyProcessorUsingDiskStorage } from "../../middleware/processReqBody";

const router = express.Router();

router.post(
    "/create-parcel",
    auth(USER_ROLES.SENDER, USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(ParcelValidation.createParcelSchema),
    ParcelController.createParcel
);

router.get(
    "/calculate-distance",
    ParcelController.calculateDistance
);

router.get(
    "/my-parcels",
    auth(USER_ROLES.SENDER, USER_ROLES.DRIVER, USER_ROLES.USER),
    ParcelController.getMyParcels
);

router.get(
    "/nearby",
    auth(USER_ROLES.DRIVER),
    validateRequest(ParcelValidation.getNearbyParcelsSchema),
    ParcelController.getNearbyParcels
);

router.patch(
    "/:id/accept",
    auth(USER_ROLES.DRIVER),
    ParcelController.acceptParcel
);

router.get(
    "/",
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ParcelController.getAllParcels
);

router.get(
    "/:id",
    auth(USER_ROLES.SENDER, USER_ROLES.DRIVER, USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ParcelController.getSingleParcel
);

router.patch(
    "/:id",
    auth(USER_ROLES.SENDER, USER_ROLES.DRIVER, USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(ParcelValidation.updateParcelSchema),
    ParcelController.updateParcel
);

router.patch(
    "/:id/cancel",
    auth(USER_ROLES.SENDER, USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ParcelController.cancelParcel
);

router.delete(
    "/:id",
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ParcelController.deleteParcel
);

export const ParcelRoutes = router;
