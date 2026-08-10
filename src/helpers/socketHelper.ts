import { Server, Socket } from 'socket.io';
import { Secret } from 'jsonwebtoken';
import { jwtHelper } from './jwtHelper';
import { trackingService } from './trackingService';
import { logger } from '../shared/logger';
import config from '../config';

const authenticateSocket = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.token;
    if (!token) {
        return next(new Error('Authentication token required'));
    }

    try {
        const decoded = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret);
        socket.data.user = decoded;
        next();
    } catch {
        next(new Error('Invalid or expired token'));
    }
};

const setupTrackingNamespace = (io: Server) => {
    const tracking = io.of('/tracking');
    tracking.use(authenticateSocket);

    tracking.on('connection', (socket) => {
        const user = socket.data.user;
        logger.info(`Tracking: ${user.role} ${user.authId || user.id} connected`);

        socket.on('driver:location-update', async (data: {
            parcelId: string;
            lat: number;
            lng: number;
        }) => {
            const { parcelId, lat, lng } = data;
            socket.join(`parcel:${parcelId}`);

            await trackingService.updateDriverLocation(
                parcelId,
                user.authId || user.id,
                [lng, lat]
            );

            tracking.to(`parcel:${parcelId}`).emit('location:updated', {
                lat,
                lng,
                timestamp: Date.now(),
            });
        });

        socket.on('user:track-parcel', async (data: { parcelId: string }) => {
            const { parcelId } = data;
            socket.join(`parcel:${parcelId}`);

            const location = await trackingService.getDriverLocation(parcelId);
            if (location) {
                socket.emit('location:updated', location);
            }
        });

        socket.on('user:untrack-parcel', (data: { parcelId: string }) => {
            const { parcelId } = data;
            socket.leave(`parcel:${parcelId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Tracking: disconnected`);
        });
    });
};

const setupNotificationNamespace = (io: Server) => {
    const notifications = io.of('/notifications');
    notifications.use(authenticateSocket);

    notifications.on('connection', (socket) => {
        const user = socket.data.user;
        const userId = user.authId || user.id;
        logger.info(`Notification: user ${userId} connected`);
        socket.join(`user:${userId}`);

        socket.on('disconnect', () => {
            socket.leave(`user:${userId}`);
        });
    });
};

const setupChatNamespace = (io: Server) => {
    const chat = io.of('/chat');
    chat.use(authenticateSocket);

    chat.on('connection', (socket) => {
        const user = socket.data.user;
        const userId = user.authId || user.id;
        logger.info(`Chat: user ${userId} connected`);

        socket.on('join-chat', (chatId: string) => {
            socket.join(chatId);
        });

        socket.on('leave-chat', (chatId: string) => {
            socket.leave(chatId);
        });

        socket.on('disconnect', () => {
            logger.info(`Chat: disconnected`);
        });
    });
};

export const socketHelper = {
    socket: (io: Server) => {
        setupTrackingNamespace(io);
        setupNotificationNamespace(io);
        setupChatNamespace(io);
        logger.info('Socket namespaces initialized');
    },
};
