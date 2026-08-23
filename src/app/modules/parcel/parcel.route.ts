import express from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";
import { ParcelController } from "./parcel.controller";
import { ParcelValidation } from "./parcel.validation";
import { fileAndBodyProcessorUsingDiskStorage } from "../../middleware/processReqBody";

const router = express.Router();

router.post(
    "/create-parcel",
    auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(ParcelValidation.createParcelSchema),
    ParcelController.createParcel
);

router.post(
    "/confirm-payment/:id",
    auth(USER_ROLES.CUSTOMER),
    validateRequest(ParcelValidation.selectPaymentMethodSchema),
    ParcelController.selectPaymentMethod
);

router.patch(
    "/assign/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    validateRequest(ParcelValidation.assignParcelSchema),
    ParcelController.assignParcelByAdmin
);

router.get(
    "/calculate-distance",
    ParcelController.calculateDistance
);

router.get(
    "/my-parcels",
    auth(USER_ROLES.DRIVER, USER_ROLES.CUSTOMER),
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
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    ParcelController.getAllParcels
);

router.get(
    "/:id",
    auth(USER_ROLES.DRIVER, USER_ROLES.CUSTOMER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    ParcelController.getSingleParcel
);

router.patch(
    "/:id",
    auth(USER_ROLES.DRIVER, USER_ROLES.CUSTOMER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(ParcelValidation.updateParcelSchema),
    ParcelController.updateParcel
);

router.patch(
    "/:id/cancel",
    auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    ParcelController.cancelParcel
);

router.delete(
    "/:id",
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    ParcelController.deleteParcel
);

export const ParcelRoutes = router;
