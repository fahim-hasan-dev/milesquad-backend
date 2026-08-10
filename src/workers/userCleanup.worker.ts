import { Worker } from 'bullmq';
import { getRedisConnection } from '../helpers/redis';
import { User } from '../app/modules/user/user.model';
import { logger } from '../shared/logger';

const connection = getRedisConnection();

const userCleanupWorker = new Worker(
  'userCleanup',
  async (job) => {
    const { userId } = job.data;
    const user = await User.findById(userId);

    if (!user) return;

    if (!user.isEmailVerified && !user.verified) {
      await User.findByIdAndDelete(userId);
      logger.info(`Deleted unverified user ${userId}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

userCleanupWorker.on('failed', (job, err) => {
  logger.error(`User cleanup job ${job?.id} failed:`, err);
});

userCleanupWorker.on('error', (err) => {
  logger.error('User cleanup worker connection error:', err);
});

export default userCleanupWorker;
