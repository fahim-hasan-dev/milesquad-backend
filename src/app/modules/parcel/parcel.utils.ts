import { Types } from "mongoose";
import { IStatusProgress } from "./parcel.interface";
import { PARCEL_STATUS } from "../../../enum/parcel";
import { getIO } from "../../../helpers/socketManager";
import { logger } from "../../../shared/logger";
import { trackingService } from "../../../helpers/trackingService";
import { haversineDistance } from "../../../utils/googleMaps.util";
import { User } from "../user/user.model";

export const emitParcelStatusUpdate = (parcel: any) => {
    try {
        const io = getIO();
        if (io && parcel?._id) {
            const parcelIdStr = parcel._id.toString();
            io.of('/tracking').to(`parcel:${parcelIdStr}`).emit('parcel:tracking-update', {
                parcelId: parcelIdStr,
                status: parcel.status,
                statusProgress: parcel.statusProgress,
                updatedAt: new Date(),
            });
        }
    } catch (err) {
        logger.warn('Failed to emit parcel:tracking-update socket event:', err);
    }
};

export const updateStatusProgress = (
    currentProgress: Partial<IStatusProgress> = {},
    newStatus: PARCEL_STATUS
): IStatusProgress => {
    const stepsOrder = [
        PARCEL_STATUS.CREATED,
        PARCEL_STATUS.CONFIRMED,
        PARCEL_STATUS.PENDING,
        PARCEL_STATUS.RIDER_ASSIGNED,
        PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
        PARCEL_STATUS.PICKED_UP,
        PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY,
        PARCEL_STATUS.DELIVERED,
    ];

    const progress: IStatusProgress = {
        CREATED: currentProgress.CREATED ?? true,
        CONFIRMED: currentProgress.CONFIRMED ?? false,
        PENDING: currentProgress.PENDING ?? false,
        RIDER_ASSIGNED: currentProgress.RIDER_ASSIGNED ?? false,
        ON_THE_WAY_TO_PICKUP: currentProgress.ON_THE_WAY_TO_PICKUP ?? false,
        PICKED_UP: currentProgress.PICKED_UP ?? false,
        ON_THE_WAY_TO_DELIVERY: currentProgress.ON_THE_WAY_TO_DELIVERY ?? false,
        DELIVERED: currentProgress.DELIVERED ?? false,
        CANCELLED: currentProgress.CANCELLED ?? false,
    };

    if (newStatus === PARCEL_STATUS.CANCELLED) {
        progress.CANCELLED = true;
        return progress;
    }

    const targetIndex = stepsOrder.indexOf(newStatus);
    if (targetIndex !== -1) {
        for (let i = 0; i <= targetIndex; i++) {
            progress[stepsOrder[i]] = true;
        }
    }

    return progress;
};

// Single Batch Broadcast new pending parcel to online active drivers matching vehicleType, deliveryDate & 50km radius
export const notifyNearbyDriversOfNewParcel = async (parcel: any) => {
    try {
        const io = getIO();
        if (!io || !parcel) return;

        // Rule 1: Must be PENDING and unassigned
        if (parcel.status !== PARCEL_STATUS.PENDING || parcel.isDriverAssigned) return;

        // Rule 2: Delivery Date Schedule Check (Must be <= 1 hour from now)
        if (parcel.deliveryDate) {
            const oneHourFromNow = new Date();
            oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
            if (new Date(parcel.deliveryDate) > oneHourFromNow) {
                return; // Far future scheduled parcel, skip real-time dispatch!
            }
        }

        const pickupCoords = parcel.pickupLocation?.coordinates; // [lng, lat]
        if (!pickupCoords || pickupCoords.length < 2) return;

        const pickupLat = Number(pickupCoords[1]);
        const pickupLng = Number(pickupCoords[0]);

        const activeDrivers = await trackingService.getAllActiveDriversLocation();
        if (!activeDrivers || activeDrivers.length === 0) return;

        // Rule 3: Vehicle Type Match Check
        const driverIds = activeDrivers.map((d) => d.driverId).filter(Boolean);
        const driverDocs = await User.find({ _id: { $in: driverIds } })
            .select("driverInfo.vehicleType")
            .lean();

        const vehicleMap = new Map(
            driverDocs.map((d) => [d._id.toString(), d.driverInfo?.vehicleType])
        );

        // Compile eligible driver room array matching vehicleType, schedule & 50km radius
        const eligibleDriverRooms = activeDrivers
            .filter((driver) => {
                if (!driver.lat || !driver.lng || !driver.driverId) return false;

                // Vehicle Type Check
                const driverVehicle = vehicleMap.get(driver.driverId);
                if (parcel.vehicleType && driverVehicle && parcel.vehicleType !== driverVehicle) {
                    return false; // Vehicle mismatch, skip!
                }

                // 50km Radius Check
                const distanceKm = haversineDistance(
                    { lat: driver.lat, lng: driver.lng },
                    { lat: pickupLat, lng: pickupLng }
                );
                return distanceKm <= 50;
            })
            .map((driver) => `user:${driver.driverId}`);

        // Single Socket.IO Batch Broadcast to all eligible driver rooms
        if (eligibleDriverRooms.length > 0) {
            io.of('/notifications')
                .to(eligibleDriverRooms)
                .emit('nearby-parcel:new', parcel);
        }
    } catch (err) {
        logger.warn('Failed to notify nearby drivers of new parcel:', err);
    }
};

// Single Batch Broadcast to active drivers when a parcel is accepted/assigned/cancelled to remove from list
export const notifyNearbyDriversOfRemovedParcel = async (parcelId: string) => {
    try {
        const io = getIO();
        if (!io || !parcelId) return;

        const activeDrivers = await trackingService.getAllActiveDriversLocation();

        const driverRooms = activeDrivers
            .filter((driver) => Boolean(driver.driverId))
            .map((driver) => `user:${driver.driverId}`);

        // Single Socket.IO Batch Broadcast to all driver rooms
        if (driverRooms.length > 0) {
            io.of('/notifications')
                .to(driverRooms)
                .emit('nearby-parcel:removed', { parcelId: parcelId.toString() });
        }
    } catch (err) {
        logger.warn('Failed to notify nearby drivers of removed parcel:', err);
    }
};
