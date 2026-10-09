import 'dotenv/config';
import { app } from './app.js';
import { closeDb } from './config/db.js';
import { redisClient } from './config/redis.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

const gracefulShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    
    server.close(() => {
        console.log('[Server] HTTP server closed');
    });

    try {
        closeDb();
        console.log('[DB] SQLite connection closed');
    } catch (err) {
        console.error('[DB] Error closing SQLite connection:', err.message);
    }

    try {
        await redisClient.quit();
        console.log('[Redis] Connection closed');
    } catch (err) {
        console.error('[Redis] Error closing Redis connection:', err.message);
    }
    
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
