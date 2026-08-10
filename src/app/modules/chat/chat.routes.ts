import express from 'express';
import auth from '../../middleware/auth';
import { ChatController } from './chat.controller';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Create a regular chat between users
router.post(
  "/",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  async (req, res, next) => {
    try {
      req.body = {
        participants: [req.user.id, req.body.participant],
        isAdminSupport: false
      };
      next();
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat" });
    }
  },
  ChatController.createChat
);


// Get all chats for current user
router.get(
  "/",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.getChat
);


// Delete a chat
router.delete(
  "/:id",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.deleteChat
);

export const ChatRoutes = router;
