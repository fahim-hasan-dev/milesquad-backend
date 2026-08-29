import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import { SupportValidation } from './support.validation';
import { SupportController } from './support.controller';
import auth from '../../middleware/auth';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody';

const router = express.Router();

router.post(
    '/',
    auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(SupportValidation.createSupportTicketZodSchema),
    SupportController.createSupportTicket
);

router.get(
    '/',
    auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    SupportController.getAllSupportTickets
);

router.get(
    '/:id',
    auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    SupportController.getSingleSupportTicket
);

router.patch(
    '/:id/reply',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    validateRequest(SupportValidation.replySupportTicketZodSchema),
    SupportController.replySupportTicket
);

router.patch(
    '/:id/status',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    validateRequest(SupportValidation.updateSupportTicketStatusZodSchema),
    SupportController.updateSupportTicketStatus
);

router.delete(
    '/:id',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    SupportController.deleteSupportTicket
);

export const SupportRoutes = router;
