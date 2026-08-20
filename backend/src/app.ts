import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppError, errorHandler } from './middlewares/error.middleware';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { env } from './config/env';

// Import Routers
import authRouter from './routes/auth.routes';
import cattleRouter from './routes/cattle.routes';
import recordRouter from './routes/record.routes';
import syncRouter from './routes/sync.routes';
import reportRouter from './routes/report.routes';
import userRouter from './routes/user.routes';

const app = express();

const allowedOrigins = [
  env.CLIENT_URL,
  'https://moobase-client.onrender.com',
  'http://localhost:5180',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Configure Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || env.NODE_ENV !== 'production' || origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Configure Routing Mounts
app.use('/api/auth', authRouter);
app.use('/api/cattle', cattleRouter);
app.use('/api/sync', syncRouter);
app.use('/api/reports', reportRouter);
app.use('/api/users', userRouter);

// Mount records (health, vaccination, milk, breeding) directly under /api
app.use('/api', recordRouter);

// Base health check with database connection validation
app.get('/health-check', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected', timestamp: new Date() });
  } catch (err: any) {
    res.status(200).json({ status: 'ok', database: 'disconnected', dbError: err.message, timestamp: new Date() });
  }
});

app.use((req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
