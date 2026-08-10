import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';
import { NotificationController } from './notification.controller';
const router = express.Router();

router.get('/',
    auth(USER_ROLES.USER, USER_ROLES.ADMIN),
    NotificationController.getNotificationFromDB
);

router.get('/unread-count',
    auth(USER_ROLES.USER, USER_ROLES.ADMIN),
    NotificationController.getUnreadCount
);

router.post('/test-push', NotificationController.sendTestPushNotification);

export const NotificationRoutes = router;
