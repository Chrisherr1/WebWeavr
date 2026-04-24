import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import router from './routes/index.js';



// file and directory utilities for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Initialize Express app
const app = express();
app.set('trust proxy', 1);
// Port configuration
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));


// Rate limiter to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiter to API routes
app.use('/api/', limiter);
app.use('/api', router);

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});


// Start the server
app.listen(PORT, () => {
  console.log(`Spyder running on http://localhost:${PORT}`);
});
