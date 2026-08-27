import { IStatusProgress } from "./parcel.interface";
import { PARCEL_STATUS } from "../../../enum/parcel";
import { getIO } from "../../../helpers/socketManager";
import { logger } from "../../../shared/logger";

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
