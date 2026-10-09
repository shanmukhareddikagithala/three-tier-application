import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// We'll connect manually to handle errors gracefully
if (process.env.NODE_ENV !== 'test') {
    redisClient.connect().then(() => {
        console.log(`[Redis] Connected to Redis`);
    }).catch(err => {
        console.error(`[Redis] Initial Connection Error: ${err.message}`);
    });
}

redisClient.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
        console.error(`[Redis] Error: ${err.message}`);
    }
});

export { redisClient };
