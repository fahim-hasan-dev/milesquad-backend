import { redisClient } from './redis';
import { logger } from '../shared/logger';

const updateDriverLocation = async (
    parcelId: string,
    driverId: string,
    coords: [number, number]
) => {
    const key = `tracking:${parcelId}`;

    const locationData = {
        lng: coords[0].toString(),
        lat: coords[1].toString(),
        timestamp: Date.now().toString(),
    };

    await redisClient.hset(key, locationData);
    await redisClient.persist(key);
};

const getDriverLocation = async (parcelId: string) => {
    const data = await redisClient.hgetall(`tracking:${parcelId}`);
    if (!data || Object.keys(data).length === 0) return null;

    return {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        timestamp: parseInt(data.timestamp),
    };
};

const removeDriverTracking = async (parcelId: string, driverId: string) => {
    const key = `tracking:${parcelId}`;
    await redisClient.del(key);
    await redisClient.zrem('driver:locations', driverId);
    logger.info(`Removed tracking data for parcel ${parcelId}`);
};

export const trackingService = {
    updateDriverLocation,
    getDriverLocation,
    removeDriverTracking,
};
