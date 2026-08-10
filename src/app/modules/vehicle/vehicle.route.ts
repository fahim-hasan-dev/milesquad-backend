import express from 'express';
import { VehicleController } from './vehicle.controller';
import validateRequest from '../../middleware/validateRequest';
import { VehicleValidations } from './vehicle.validation';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody';

const router = express.Router();

router.post(
    '/',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(VehicleValidations.createVehicleSchema),
    VehicleController.createVehicle
);

router.get(
    '/',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VehicleController.getAllVehicles
);

router.get(
    '/:id',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VehicleController.getSingleVehicle
);

router.patch(
    '/assign-driver',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(VehicleValidations.assignDriverSchema),
    VehicleController.assignDriver
);

router.patch(
    '/remove-driver',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(VehicleValidations.removeDriverSchema),
    VehicleController.removeDriver
);

router.patch(
    '/:id',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(VehicleValidations.updateVehicleSchema),
    VehicleController.updateVehicle
);

router.delete(
    '/:id',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VehicleController.deleteVehicle
);

export const VehicleRoutes = router;
