import { Worker } from 'bullmq';
import { getRedisConnection } from '../helpers/redis';
import { Parcel } from '../app/modules/parcel/parcel.model';
import { PARCEL_STATUS } from '../enum/parcel';
import { logger } from '../shared/logger';

const connection = getRedisConnection();

const parcelCleanupWorker = new Worker(
    'parcelCleanup',
    async (job) => {
        const { parcelId } = job.data;
        const parcel = await Parcel.findById(parcelId);

        if (!parcel) return;

        if (parcel.status === PARCEL_STATUS.CREATED) {
            await Parcel.findByIdAndDelete(parcelId);
            logger.info(`Deleted unpaid parcel ${parcelId} after 1 hour`);
        }
    },
    {
        connection,
        concurrency: 5,
    }
);

parcelCleanupWorker.on('failed', (job, err) => {
    logger.error(`Parcel cleanup job ${job?.id} failed:`, err);
});

parcelCleanupWorker.on('error', (err) => {
    logger.error('Parcel cleanup worker connection error:', err);
});

export default parcelCleanupWorker;
