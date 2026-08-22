import express from 'express';
import { UserController } from './user.controller';
import auth from '../../middleware/auth';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';
import fileUploadHandler from '../../middleware/fileUploadHandler';

const router = express.Router();

router.get(
  '/me',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  UserController.getProfile,
);

router.get(
  '/',
  auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  UserController.getAllUser
);

router.patch(
  '/profile',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  fileUploadHandler(),
  UserController.updateProfile,
);

router.delete(
  '/me',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  UserController.deleteMyAccount,
);

router.get('/:id', UserController.getSingleUser);

router.delete(
  '/:id',
  auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  UserController.deleteUser
);

export const UserRoutes = router;
