import { Worker } from 'bullmq';
import { getRedisConnection } from '../helpers/redis';
import { PushNotificationService } from '../app/modules/notification/pushNotification.service';
import { User } from '../app/modules/user/user.model';
import { getIO } from '../helpers/socketManager';
import { logger } from '../shared/logger';

const connection = getRedisConnection();

const notificationWorker = new Worker(
    'notification',
    async (job) => {
        const { userId, title, body, data } = job.data;

        const user = await User.findById(userId).select('fcmToken').lean();

        if (user?.fcmToken && user.fcmToken.length > 0) {
            await PushNotificationService.sendPushNotification(
                user.fcmToken,
                title,
                body,
                data
            );
        }

        try {
            const io = getIO();
            io.of('/notifications').emit(`notification::${userId}`, {
                title,
                message: body,
                ...data
            });
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
