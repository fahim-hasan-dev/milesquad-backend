import { redisClient } from './redis';
import { logger } from '../shared/logger';

/**
 * Safely retrieve parsed JSON data from Redis by key.
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
    try {
        const cachedData = await redisClient.get(key);
        if (cachedData) {
            return JSON.parse(cachedData) as T;
        }
    } catch (error) {
        logger.error(`Redis cacheGet error for key "${key}":`, error);
    }
    return null;
};

/**
 * Safely store data in Redis with optional TTL in seconds.
 */
export const cacheSet = async (key: string, value: any, ttlSeconds?: number): Promise<void> => {
    try {
        const stringified = JSON.stringify(value);
        if (ttlSeconds && ttlSeconds > 0) {
            await redisClient.set(key, stringified, 'EX', ttlSeconds);
        } else {
            await redisClient.set(key, stringified);
        }
    } catch (error) {
        logger.error(`Redis cacheSet error for key "${key}":`, error);
    }
};

/**
 * Safely delete single or multiple keys from Redis.
 */
export const cacheDel = async (...keys: string[]): Promise<void> => {
    try {
        const validKeys = keys.filter(k => Boolean(k));
        if (validKeys.length > 0) {
            await redisClient.del(...validKeys);
        }
    } catch (error) {
        logger.error(`Redis cacheDel error for keys "${keys.join(', ')}":`, error);
    }
};

/**
 * Safely delete keys matching a pattern using SCAN stream to prevent blocking Redis.
 */
export const cacheDelByPattern = async (pattern: string): Promise<void> => {
    try {
        const stream = redisClient.scanStream({
            match: pattern,
            count: 100,
        });

        const keysToDelete: string[] = [];

        stream.on('data', (resultKeys: string[]) => {
            keysToDelete.push(...resultKeys);
        });

        await new Promise<void>((resolve, reject) => {
            stream.on('end', async () => {
                try {
                    if (keysToDelete.length > 0) {
                        await redisClient.del(...keysToDelete);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            stream.on('error', (err) => reject(err));
        });
    } catch (error) {
        logger.error(`Redis cacheDelByPattern error for pattern "${pattern}":`, error);
    }
};

/**
 * Cache-aside wrapper function. Checks cache first, executes fetchFn on miss, and saves result.
 */
export const getOrSetCache = async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
): Promise<T> => {
    const cached = await cacheGet<T>(key);
    if (cached !== null && cached !== undefined) {
        return cached;
    }

    const freshData = await fetchFn();

    if (freshData !== null && freshData !== undefined) {
        // Fire-and-forget set to avoid delaying response
        cacheSet(key, freshData, ttlSeconds).catch(err => {
            logger.error(`Failed background cacheSet for key "${key}":`, err);
        });
    }

    return freshData;
};
