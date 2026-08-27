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
        const driverId = user.authId || user.id;
        logger.info(`Tracking: ${user.role} ${driverId} connected`);

        socket.on('driver:location-update', async (rawPayload: any) => {
            const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
            const { parcelId, lat, lng, status } = data || {};

            const numLat = Number(lat);
            const numLng = Number(lng);

            if (!isNaN(numLat) && !isNaN(numLng)) {
                // Save global driver location in Redis
                await trackingService.saveDriverCurrentLocation(driverId, [numLng, numLat], status || 'ONLINE');
            }

            const payload = {
                driverId,
                lat,
                lng,
                status: status || 'ONLINE',
                updatedAt: Date.now(),
            };

            // Notify single driver listeners
            tracking.to(`driver:${driverId}`).emit('single-driver:location-updated', payload);

            // Notify all drivers overview listeners
            tracking.to('admin:all-drivers').emit('all-drivers:location-updated', payload);

            // Notify parcel specific listeners if parcelId is provided
            if (parcelId) {
                socket.join(`parcel:${parcelId}`);
                await trackingService.updateDriverLocation(parcelId, driverId, [lng, lat]);
                tracking.to(`parcel:${parcelId}`).emit('parcel:tracking-update', {
                    lat,
                    lng,
                    timestamp: Date.now(),
                });
            }
        });

        // Track single driver
        socket.on('admin:track-single-driver', async (rawPayload: any) => {
            const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
            const targetDriverId = data?.driverId || data;
            if (targetDriverId) {
                socket.join(`driver:${targetDriverId}`);

                const location = await trackingService.getSingleDriverLocationById(targetDriverId);
                if (location) {
                    socket.emit('single-driver:location-updated', location);
                }
            }
        });

        // Untrack single driver
        socket.on('admin:untrack-single-driver', (rawPayload: any) => {
            const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
            const targetDriverId = data?.driverId || data;
            if (targetDriverId) {
                socket.leave(`driver:${targetDriverId}`);
            }
        });

        // Track all drivers
        socket.on('admin:track-all-drivers', async () => {
            socket.join('admin:all-drivers');

            const allDrivers = await trackingService.getAllActiveDriversLocation();
            socket.emit('all-drivers:initial-list', allDrivers);
        });

        // Untrack all drivers
        socket.on('admin:untrack-all-drivers', () => {
            socket.leave('admin:all-drivers');
        });

        // Track parcel by user
        socket.on('user:track-parcel', async (rawPayload: any) => {
            const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
            const parcelId = data?.parcelId || data;
            if (parcelId) {
                socket.join(`parcel:${parcelId}`);

                const location = await trackingService.getDriverLocation(parcelId);
                if (location) {
                    socket.emit('parcel:tracking-update', location);
                }
            }
        });

        // Untrack parcel by user
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
