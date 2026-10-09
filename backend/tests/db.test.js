import test from 'node:test';
import assert from 'node:assert';
import { initDb, closeDb } from '../src/config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, 'test.db');

test('Database Initialization and Unique Email Constraint', async (t) => {
    // Cleanup before test
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    let db;

    await t.test('initDb creates database and users table', () => {
        db = initDb(testDbPath);
        assert.ok(fs.existsSync(testDbPath), 'Database file should be created');
        
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        const table = stmt.get();
        assert.strictEqual(table.name, 'users', 'Users table should exist');
    });

    await t.test('users table enforces unique email', () => {
        const insert = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        
        // First insert should succeed
        const res1 = insert.run('John Doe', 'john@example.com', 'hashed_pass');
        assert.strictEqual(res1.changes, 1);

        // Second insert with same email should fail
        assert.throws(() => {
            insert.run('Jane Doe', 'john@example.com', 'hashed_pass2');
        }, /UNIQUE constraint failed: users.email/);
    });

    await t.test('cleanup', () => {
        closeDb();
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    });
});
