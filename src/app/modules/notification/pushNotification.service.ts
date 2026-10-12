import * as admin from 'firebase-admin';
import path from 'path';
import config from '../../../config';
import { logger } from '../../../shared/logger';
import { User } from '../user/user.model';
import { Admin } from '../admin/admin.model';

let isFirebaseInitialized = false;

const initializeFirebase = () => {
    try {
        if (admin.apps.length === 0) {
            if (config.firebase_service_account_base64) {
                const decodedServiceAccount = JSON.parse(
                    Buffer.from(config.firebase_service_account_base64, 'base64').toString('utf-8')
                );
                admin.initializeApp({
                    credential: admin.credential.cert(decodedServiceAccount),
                });
                logger.info('Firebase Admin initialized successfully using Base64 credentials.');
            } else {
                let serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

                if (!require('fs').existsSync(serviceAccountPath)) {
                    serviceAccountPath = path.join(process.cwd(), '..', 'serviceAccountKey.json');
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountPath),
                });
                logger.info('Firebase Admin initialized successfully using: ' + serviceAccountPath);
            }
        }

        isFirebaseInitialized = true;
    } catch (error: any) {
        logger.error('Firebase Admin initialization failed:', error);
    }
};

const sendPushNotification = async (
    fcmTokens: string | string[],
    title: string,
    body: string,
    data?: Record<string, any>
) => {
    if (!isFirebaseInitialized) {
        initializeFirebase();
    }

    if (!isFirebaseInitialized) {
        logger.warn('Push notification skipped: Firebase not initialized');
        return;
    }

    const rawTokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    const tokens = Array.from(new Set(rawTokens.filter((t) => typeof t === 'string' && t.trim().length > 0)));
    if (tokens.length === 0) return;

    const stringifiedData: Record<string, string> = {};
    if (data) {
        Object.entries(data).forEach(([key, value]) => {
            stringifiedData[key] = value?.toString() || '';
        });
    }

    try {
        const message: admin.messaging.MulticastMessage = {
            notification: { title, body },
            data: stringifiedData,
            tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        logger.info(
            `Push notifications sent: ${response.successCount} succeeded, ${response.failureCount} failed across ${tokens.length} tokens.`
        );

        if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    const errorCode = resp.error.code;
                    if (
                        errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/invalid-argument'
                    ) {
                        invalidTokens.push(tokens[idx]);
                    }
                }
            });

            if (invalidTokens.length > 0) {
                await Promise.all([
                    User.updateMany({ fcmToken: { $in: invalidTokens } }, { $pull: { fcmToken: { $in: invalidTokens } } }),
                    Admin.updateMany({ fcmToken: { $in: invalidTokens } }, { $pull: { fcmToken: { $in: invalidTokens } } }),
                ]);
                logger.info(`Cleaned up ${invalidTokens.length} unregistered/invalid FCM tokens from DB.`);
            }
        }

        return response;
    } catch (error) {
        logger.error('Error sending push notification:', error);
    }
};

export const PushNotificationService = {
    sendPushNotification,
};

