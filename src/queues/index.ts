import { Queue } from 'bullmq';
import { getRedisConnection } from '../helpers/redis';

const connection = getRedisConnection();

export const notificationQueue = new Queue('notification', { connection });
export const emailQueue = new Queue('email', { connection });
export const parcelCleanupQueue = new Queue('parcelCleanup', { connection });
export const userCleanupQueue = new Queue('userCleanup', { connection });
export const reviewReminderQueue = new Queue('reviewReminder', { connection });
