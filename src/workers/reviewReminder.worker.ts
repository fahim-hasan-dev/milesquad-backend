import { Worker } from 'bullmq';
import { getRedisConnection } from '../helpers/redis';
import { Parcel } from '../app/modules/parcel/parcel.model';
import { Review } from '../app/modules/review/review.model';
import { NotificationService } from '../app/modules/notification/notification.service';
import { USER_ROLES } from '../enum/user';
import { logger } from '../shared/logger';

const connection = getRedisConnection();

const reviewReminderWorker = new Worker(
  'reviewReminder',
  async (job) => {
    const { parcelId } = job.data;
    const parcel = await Parcel.findById(parcelId);

    if (!parcel) return;

    const existingReview = await Review.findOne({ parcel: parcelId });

    if (!existingReview) {
      await NotificationService.insertNotification({
        receiver: parcel.sender,
        title: "Review Reminder",
        message: `Please rate your experience for parcel "${parcel.goodType || "Parcel"}".`,
        screen: "PARCEL_DETAILS",
        type: USER_ROLES.USER
      });
      logger.info(`Sent review reminder for parcel ${parcelId}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

reviewReminderWorker.on('failed', (job, err) => {
  logger.error(`Review reminder job ${job?.id} failed:`, err);
});

reviewReminderWorker.on('error', (err) => {
  logger.error('Review reminder worker connection error:', err);
});

export default reviewReminderWorker;
