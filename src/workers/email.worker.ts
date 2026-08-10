import { Worker } from 'bullmq';
import { getRedisConnection } from '../helpers/redis';
import { emailHelper } from '../helpers/emailHelper';
import { logger } from '../shared/logger';

const connection = getRedisConnection();

const emailWorker = new Worker(
    'email',
    async (job) => {
        const { to, subject, html } = job.data;
        await emailHelper.sendEmail({ to, subject, html });
    },
    {
        connection,
        concurrency: 5,
        limiter: {
            max: 20,
            duration: 1000,
        },
    }
);

emailWorker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} failed:`, err);
});

emailWorker.on('error', (err) => {
    logger.error('Email worker connection error:', err);
});

export default emailWorker;
