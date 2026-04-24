import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import router from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Trust X-Forwarded-For header when running behind Nginx
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'"],
      imgSrc:      ["'self'"],
      connectSrc:  ["'self'"]
    }
  }
}));

// Enable cross-origin requests
app.use(cors({
  origin:      process.env.CORS_ORIGIN,
  methods:     ['GET'],
  credentials: false
}));

// Parse incoming JSON bodies
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logging
app.use(morgan('combined'));

// Serve static frontend files
app.use(express.static(join(__dirname, 'public')));

// Rate limiter — 5 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiter to all API routes
app.use('/api/', limiter);
app.use('/api', router);

// Serve the frontend on root
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler — catches any unhandled errors and returns a clean JSON response
app.use(errorHandler);

export default app;
