// Load environment variables before anything else
import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables at startup
import './config/validateEnv.js';

import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Spyder running on http://localhost:${PORT}`);
});
