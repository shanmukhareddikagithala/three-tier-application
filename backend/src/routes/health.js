import express from 'express';
import { getDb } from '../config/db.js';
import { redisClient } from '../config/redis.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const health = {
            status: 'ok',
            backend: 'up',
            timestamp: new Date().toISOString()
        };

        // Check SQLite
        try {
            const db = getDb();
            const row = db.prepare('SELECT 1 as val').get();
            health.database = row.val === 1 ? 'up' : 'down';
        } catch (error) {
            health.database = 'down';
            health.databaseError = error.message;
            health.status = 'error';
        }

        // Check Redis
        try {
            const redisPing = await redisClient.ping();
            health.redis = redisPing === 'PONG' ? 'up' : 'down';
        } catch (error) {
            health.redis = 'down';
            health.redisError = error.message;
            health.status = 'error';
        }

        const statusCode = health.status === 'ok' ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (error) {
        next(error);
    }
});

export default router;
