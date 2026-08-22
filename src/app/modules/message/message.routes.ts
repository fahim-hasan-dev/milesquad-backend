import express from 'express';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';
import auth from '../../middleware/auth';
import { MessageController } from './message.controller';
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody';

const router = express.Router();

router.post('/',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  fileAndBodyProcessorUsingDiskStorage(),
  MessageController.sendMessage
);

router.get(
  '/:id',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  MessageController.getMessage
);

router.patch(
  '/:id',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  MessageController.updateMessage
);

router.get(
  '/unread/count',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  MessageController.getUnreadCount
);

router.patch(
  '/:messageId/money-request',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  MessageController.updateMoneyRequestStatus
);

router.delete(
  '/:id',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  MessageController.deleteMessage
);

export const MessageRoutes = router;
