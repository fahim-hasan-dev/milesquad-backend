import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { ADMIN_ROLES } from '../../../enum/user';
import { AdminControllers } from './admin.controller';
import { AdminValidations } from './admin.validation';

const router = express.Router();

router.post('/login', validateRequest(AdminValidations.adminLoginSchema), AdminControllers.loginAdmin);
router.post('/forget-password', validateRequest(AdminValidations.forgetPasswordAdminSchema), AdminControllers.forgetPasswordAdmin);
router.post('/reset-password', validateRequest(AdminValidations.resetPasswordAdminSchema), AdminControllers.resetPasswordAdmin);

router.post('/create-sub-admin', auth(ADMIN_ROLES.SUPER_ADMIN), validateRequest(AdminValidations.createSubAdminSchema), AdminControllers.createSubAdmin);

router.get('/', auth(ADMIN_ROLES.SUPER_ADMIN), AdminControllers.getAllAdmins);
router.get('/:id', auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN), AdminControllers.getSingleAdmin);
router.patch('/:id', auth(ADMIN_ROLES.SUPER_ADMIN), validateRequest(AdminValidations.updateAdminSchema), AdminControllers.updateAdmin);
router.delete('/:id', auth(ADMIN_ROLES.SUPER_ADMIN), AdminControllers.deleteAdmin);

export const AdminRoutes = router;
