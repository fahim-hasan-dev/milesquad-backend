import { JwtPayload } from 'jsonwebtoken';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import { FilterQuery } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import { notificationQueue } from '../../../queues';
import { getIO } from '../../../helpers/socketManager';
import { logger } from '../../../shared/logger';

const insertNotification = async (payload: Partial<INotification>): Promise<INotification> => {
    const result = await Notification.create(payload);

    if (result.title && result.message && result.receiver) {
        await notificationQueue.add('push-notification', {
            userId: result.receiver.toString(),
            title: result.title,
            body: result.message,
            data: { screen: result.screen },
        });
    }

    try {
        const io = getIO();
        if (result.receiver) {
            io.of('/notifications').emit(`notification::${result.receiver.toString()}`);
        }
    } catch {
        logger.warn('Socket.io not initialized, skipping emit');
    }

    return result;
};

const getNotificationFromDB = async (user: JwtPayload, query: FilterQuery<any>): Promise<Object> => {
    const userId = user.authId || user.id;
    const result = new QueryBuilder(Notification.find({ receiver: userId }), query).sort().paginate();

    result.modelQuery.select("title message read screen createdAt").lean();

    const notifications = await result.modelQuery;
    const pagination = await result.getPaginationInfo();

    const unreadCount = await Notification.countDocuments({
        receiver: userId,
        read: false,
    });

    await Notification.updateMany(
        { receiver: userId, read: false },
        { $set: { read: true } }
    );

    try {
        const io = getIO();
        if (userId) {
            io.of('/notifications').emit(`notification::${userId.toString()}`);
        }
    } catch {
        logger.warn('Socket.io not initialized, skipping emit');
    }

    return {
        notifications,
        pagination,
        unreadCount
    };
};

const getUnreadCountFromDB = async (user: JwtPayload) => {
    const userId = user.authId || user.id;
    const unreadCount = await Notification.countDocuments({
        receiver: userId,
        read: false,
    });

    return { unreadCount };
};

export const NotificationService = {
    insertNotification,
    getNotificationFromDB,
    getUnreadCountFromDB,
};
