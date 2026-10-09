import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { initDb, closeDb } from '../src/config/db.js';
import { redisClient } from '../src/config/redis.js';
import { hashData } from '../src/utils/crypto.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, 'test_login.db');

test('Login & Protected Routes', async (t) => {
    process.env.NODE_ENV = 'test';
    
    // Setup Database
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const db = initDb(testDbPath);
    
    const unverifiedEmail = 'unverified@example.com';
    const verifiedEmail = 'verified@example.com';
    const password = 'Password123!';
    const hashedPassword = await hashData(password);

    // Seed DB
    db.prepare('INSERT INTO users (name, email, password, is_verified) VALUES (?, ?, ?, 0)')
      .run('Unverified User', unverifiedEmail, hashedPassword);
      
    db.prepare('INSERT INTO users (name, email, password, is_verified) VALUES (?, ?, ?, 1)')
      .run('Verified User', verifiedEmail, hashedPassword);

    let authCookie = '';

    await t.test('POST /api/auth/login - fails for unverified user', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: unverifiedEmail,
            password
        });
        assert.strictEqual(res.status, 403);
        assert.strictEqual(res.body.error, 'Please verify your email before logging in');
    });

    await t.test('POST /api/auth/login - fails for wrong password', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: verifiedEmail,
            password: 'WrongPassword'
        });
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.body.error, 'Invalid credentials');
    });

    await t.test('POST /api/auth/login - fails for nonexistent user', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'nobody@example.com',
            password
        });
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.body.error, 'Invalid credentials');
    });

    await t.test('POST /api/auth/login - success', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: verifiedEmail,
            password
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.message, 'Login successful');
        assert.strictEqual(res.body.user.email, verifiedEmail);
        assert.ok(!res.body.user.password, 'Password hash should not be exposed');
        
        // Save cookie for subsequent tests
        authCookie = res.headers['set-cookie'][0];
        assert.ok(authCookie.includes('token='), 'Auth cookie should be set');
        assert.ok(authCookie.includes('HttpOnly'), 'Cookie should be HttpOnly');
    });

    await t.test('GET /api/auth/me - fails when missing auth', async () => {
        const res = await request(app).get('/api/auth/me');
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.body.error, 'Authentication required');
    });

    await t.test('GET /api/auth/me - fails with invalid token', async () => {
        const res = await request(app).get('/api/auth/me')
            .set('Cookie', ['token=invalid_token']);
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.body.error, 'Invalid or expired authentication');
    });

    await t.test('GET /api/auth/me - success', async () => {
        const res = await request(app).get('/api/auth/me')
            .set('Cookie', [authCookie]);
            
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.user.email, verifiedEmail);
        assert.strictEqual(res.body.user.name, 'Verified User');
        assert.strictEqual(res.body.user.is_verified, 1);
    });

    await t.test('POST /api/auth/logout - success', async () => {
        const res = await request(app).post('/api/auth/logout')
            .set('Cookie', [authCookie]);
            
        assert.strictEqual(res.status, 200);
        const clearCookie = res.headers['set-cookie'][0];
        assert.ok(clearCookie.includes('token=;'), 'Cookie should be cleared');
    });

    await t.test('cleanup', async () => {
        closeDb();
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        await redisClient.quit();
    });
});
