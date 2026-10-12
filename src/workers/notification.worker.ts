import { Worker } from 'bullmq';
import { getRedisConnection } from '../helpers/redis';
import { PushNotificationService } from '../app/modules/notification/pushNotification.service';
import { User } from '../app/modules/user/user.model';
import { Admin } from '../app/modules/admin/admin.model';
import { getIO } from '../helpers/socketManager';
import { logger } from '../shared/logger';

const connection = getRedisConnection();

const notificationWorker = new Worker(
    'notification',
    async (job) => {
        const { userId, title, body, data } = job.data;

        let fcmTokens: string[] = [];
        const user = await User.findById(userId).select('fcmToken').lean();

        if (user?.fcmToken && user.fcmToken.length > 0) {
            fcmTokens = user.fcmToken;
        } else {
            const admin = await Admin.findById(userId).select('fcmToken').lean();
            if (admin?.fcmToken && admin.fcmToken.length > 0) {
                fcmTokens = admin.fcmToken;
            }
        }

        if (fcmTokens.length > 0) {
            await PushNotificationService.sendPushNotification(
                fcmTokens,
                title,
                body,
                data
            );
        }

        try {
            const io = getIO();
            const payload = {
                title,
                message: body,
                ...data
            };
            io.of('/notifications').emit(`notification::${userId}`, payload);
            io.of('/notifications').to(`user:${userId}`).emit('notification', payload);
        } catch {
            logger.warn('Socket.io not initialized yet, skipping socket emit');
        }
    },
    {
        connection,
        concurrency: 10,
        limiter: {
            max: 50,
            duration: 1000,
        },
    }
);

notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification job ${job?.id} failed:`, err);
});

notificationWorker.on('error', (err) => {
    logger.error('Notification worker connection error:', err);
});

export default notificationWorker;
