import { redisClient } from './redis';
import { logger } from '../shared/logger';
import { User } from '../app/modules/user/user.model';

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

// Save live driver position to Redis Geo and Hash
const saveDriverCurrentLocation = async (
    driverId: string,
    coords: [number, number],
    status: string = 'ONLINE'
) => {
    const geoKey = 'driver:geo';
    const infoKey = `driver:info:${driverId}`;

    await (redisClient as any).geoadd(geoKey, coords[0], coords[1], driverId);
    await redisClient.hset(infoKey, {
        lat: coords[1].toString(),
        lng: coords[0].toString(),
        status,
        updatedAt: Date.now().toString(),
    });
    await redisClient.expire(infoKey, 60);
};

// Get single driver location by ID
const getSingleDriverLocationById = async (driverId: string) => {
    const data = await redisClient.hgetall(`driver:info:${driverId}`);
    if (!data || !data.lat || !data.lng) return null;

    let userDetails: any = null;
    try {
        if (driverId && driverId.length === 24) {
            userDetails = await User.findById(driverId).select("fullName phone email image vehicleType rating userId").lean();
        }
    } catch {
        // ignore error
    }

    return {
        driverId,
        customId: userDetails?.userId || driverId,
        fullName: userDetails?.fullName || 'Driver',
        phone: userDetails?.phone || 'N/A',
        email: userDetails?.email || 'N/A',
        image: userDetails?.image || null,
        vehicleType: userDetails?.vehicleType || 'BIKE',
        rating: userDetails?.rating || 5.0,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        status: data.status || 'ONLINE',
        updatedAt: parseInt(data.updatedAt) || Date.now(),
    };
};

// Get all active drivers for admin map overview
const getAllActiveDriversLocation = async () => {
    const driverIds = await (redisClient as any).zrange('driver:geo', 0, -1);
    if (!driverIds || driverIds.length === 0) return [];

    const driverList = await Promise.all(
        driverIds.map((driverId: string) => getSingleDriverLocationById(driverId))
    );

    return driverList.filter(Boolean);
};

export const trackingService = {
    updateDriverLocation,
    getDriverLocation,
    removeDriverTracking,
    saveDriverCurrentLocation,
    getSingleDriverLocationById,
    getAllActiveDriversLocation,
};
