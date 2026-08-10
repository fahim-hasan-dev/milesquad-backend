import Redis from 'ioredis';
import config from '../config';
import { logger } from '../shared/logger';

const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
};

export const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
    logger.info('Redis connected');
});

redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
});

export const getRedisConnection = () => ({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
});
