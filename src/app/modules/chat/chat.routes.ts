import express from 'express';
import auth from '../../middleware/auth';
import { ChatController } from './chat.controller';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  async (req, res, next) => {
    try {
      const userId = req.user.authId || req.user.id;
      req.body = {
        participants: [userId, req.body.participant],
        isAdminSupport: false
      };
      next();
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat" });
    }
  },
  ChatController.createChat
);

router.get(
  "/",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  ChatController.getChat
);

router.delete(
  "/:id",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  ChatController.deleteChat
);

export const ChatRoutes = router;
