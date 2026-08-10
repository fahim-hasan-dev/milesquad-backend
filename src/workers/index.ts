import { logger } from '../shared/logger';
import notificationWorker from './notification.worker';
import emailWorker from './email.worker';
import parcelCleanupWorker from './parcelCleanup.worker';
import userCleanupWorker from './userCleanup.worker';
import reviewReminderWorker from './reviewReminder.worker';

export const initWorkers = () => {
    notificationWorker.on('ready', () => logger.info('Notification worker ready'));
    emailWorker.on('ready', () => logger.info('Email worker ready'));
    parcelCleanupWorker.on('ready', () => logger.info('Parcel cleanup worker ready'));
    userCleanupWorker.on('ready', () => logger.info('User cleanup worker ready'));
    reviewReminderWorker.on('ready', () => logger.info('Review reminder worker ready'));
};
