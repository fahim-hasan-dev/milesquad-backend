import * as admin from 'firebase-admin';
import path from 'path';
import config from '../../../config';
import { logger } from '../../../shared/logger';

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

    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    if (tokens.length === 0) return;

    const stringifiedData: Record<string, string> = {};
    if (data) {
        Object.entries(data).forEach(([key, value]) => {
            stringifiedData[key] = value?.toString() || '';
        });
    }

    try {
        const results = await Promise.all(tokens.map(async (token) => {
            const message: admin.messaging.Message = {
                notification: { title, body },
                data: stringifiedData,
                token,
            };
            return admin.messaging().send(message);
        }));

        logger.info(`Push notifications sent to ${results.length} tokens.`);
        return results;
    } catch (error) {
        logger.error('Error sending push notification:', error);
    }
};

export const PushNotificationService = {
    sendPushNotification,
};
