import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { corsOrigins, isProd } from './config/env';
import { globalLimiter } from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/error';
import apiRoutes from './routes';
import healthRoutes from './routes/health.routes';

const app = express();

// Trust the proxy (Render/Vercel) so req.ip / secure cookies behave correctly.
app.set('trust proxy', 1);

// ── Security & parsing ──
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl (no origin) and any allow-listed origin.
      if (!origin || corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(globalLimiter);

// ── Routes ──
app.use('/health', healthRoutes);
app.use('/api', apiRoutes);

// ── 404 + error handling (must be last) ──
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
