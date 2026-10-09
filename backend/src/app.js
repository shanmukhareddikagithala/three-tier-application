import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const app = express();

const corsOptions = {
    origin: process.env.VITE_API_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(helmet());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

// Handle undefined routes
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// Centralized Error Handling
app.use(errorHandler);

export { app };
