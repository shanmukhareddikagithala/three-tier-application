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
const testDbPath = path.join(__dirname, 'test_auth.db');

test('Authentication Flow - Registration & OTP', async (t) => {
    process.env.NODE_ENV = 'test';
    
    // Setup Database
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    initDb(testDbPath);
    
    // For these tests to pass, a local Redis server must be running.
    // If Redis is not available, these will fail/hang.
    
    const email = 'testuser@example.com';
    const password = 'Password123!';
    await redisClient.del(`pending:${email}`, `otp:${email}`, `otp_attempts:${email}`, `otp_cooldown:${email}`);
    
    await t.test('POST /api/auth/register - success', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Test User',
            email,
            password
        });
        
        assert.strictEqual(res.status, 202);
        assert.ok(global.__TEST_OTP__, 'An OTP should have been captured');
        assert.ok(await redisClient.get(`pending:${email}`), 'Pending data should be in Redis');
    });

    await t.test('POST /api/auth/verify-otp - wrong OTP', async () => {
        const res = await request(app).post('/api/auth/verify-otp').send({
            email,
            otp: '000000' // Incorrect OTP
        });
        
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.error, 'Invalid OTP');
    });

    await t.test('POST /api/auth/resend-otp - cooldown enforced', async () => {
        const res = await request(app).post('/api/auth/resend-otp').send({
            email
        });
        
        assert.strictEqual(res.status, 429);
        assert.strictEqual(res.body.error, 'Please wait before requesting a new OTP');
    });

    await t.test('POST /api/auth/verify-otp - success', async () => {
        const correctOtp = global.__TEST_OTP__;
        
        const res = await request(app).post('/api/auth/verify-otp').send({
            email,
            otp: correctOtp
        });
        
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.message, 'Registration verified and successful');
        
        // Verify DB Insertion
        const { getDb } = await import('../src/config/db.js');
        const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
        assert.ok(user, 'User should be saved in SQLite');
        assert.strictEqual(user.is_verified, 1);
        
        // Verify Redis cleanup
        const pending = await redisClient.get(`pending:${email}`);
        assert.strictEqual(pending, null, 'Pending registration data should be deleted');
    });

    await t.test('POST /api/auth/register - duplicate in DB fails', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Another User',
            email, // Email already successfully registered
            password
        });
        
        assert.strictEqual(res.status, 409);
        assert.strictEqual(res.body.error, 'Email already registered');
    });

    await t.test('POST /api/auth/verify-otp - expired/missing OTP', async () => {
        const res = await request(app).post('/api/auth/verify-otp').send({
            email: 'nonexistent@example.com',
            otp: '123456'
        });
        
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.error, 'OTP expired or not found');
    });

    await t.test('cleanup', async () => {
        closeDb();
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        await redisClient.del(`pending:${email}`, `otp:${email}`, `otp_attempts:${email}`, `otp_cooldown:${email}`);
        await redisClient.quit();
    });
});
