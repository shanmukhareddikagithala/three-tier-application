import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { initDb, closeDb } from '../src/config/db.js';
import { redisClient } from '../src/config/redis.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, 'test_health.db');

test('Health Check API', async (t) => {
    // We mock redis ping to avoid needing an actual Redis server during this test
    const originalPing = redisClient.ping;
    
    await t.test('GET /api/health returns 200 when all services up', async () => {
        initDb(testDbPath);
        redisClient.ping = async () => 'PONG';
        
        const response = await request(app).get('/api/health');
        
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.status, 'ok');
        assert.strictEqual(response.body.database, 'up');
        assert.strictEqual(response.body.redis, 'up');
    });

    await t.test('GET /api/health returns 503 if Redis is down', async () => {
        redisClient.ping = async () => { throw new Error('Redis connection failed'); };
        
        const response = await request(app).get('/api/health');
        
        assert.strictEqual(response.status, 503);
        assert.strictEqual(response.body.status, 'error');
        assert.strictEqual(response.body.database, 'up');
        assert.strictEqual(response.body.redis, 'down');
    });

    await t.test('cleanup', async () => {
        closeDb();
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        redisClient.ping = originalPing;
        await redisClient.quit();
    });
});
