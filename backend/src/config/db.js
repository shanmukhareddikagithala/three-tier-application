import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../data/users.db');

let db;

export const initDb = (customPath = dbPath) => {
    if (db) {
        if (customPath && db.name !== customPath) {
            try { db.close(); } catch (_) {}
            db = null;
        } else {
            return db;
        }
    }
    
    // Ensure directory exists
    const dbDir = path.dirname(customPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
        db = new Database(customPath, { 
            verbose: process.env.NODE_ENV === 'development' ? console.log : null 
        });
        
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[DB] Connected to SQLite database at ${customPath}`);
        }

        // Initialize tables
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                is_verified INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        if (process.env.NODE_ENV !== 'test') {
            console.log('[DB] Users table initialized');
        }
        return db;
    } catch (error) {
        console.error('[DB] SQLite Initialization Error:', error.message);
        throw error;
    }
};

export const getDb = () => {
    if (!db) {
        return initDb();
    }
    return db;
};

export const closeDb = () => {
    if (db) {
        db.close();
        db = null;
    }
};

// Auto-initialize if not running in test mode
if (process.env.NODE_ENV !== 'test') {
    initDb();
}
