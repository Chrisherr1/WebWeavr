// app.js - Main application file for the Express server

// .env and express 
import dotenv from 'dotenv';
// Load environment variables from .env file and validate them at startup
dotenv.config();
// needs to be imported after dotenv to validate environment variables at startup
import './config/validateEnv.js'; 


import express from 'express';

// Logs and error handling
import morgan from 'morgan';
import errorHandler from './middleware/errorHandler.js';

// CSRF and CORS Security
import helmet from 'helmet';
import cors from 'cors';



const app = express();

// Security
// sets secure Http headers and enforces content security policy  
app.use(helmet({
    contentSecurityPolicy: {
        directives: {

            //only allows resources from same origin
            defaultSrc: ["'self'"],
            //only allows scripts from same origin
            scriptSrc: ["'self'"],
            //only allows styles from same origin
            styleSrc: ["'self'"],
            //only allows images from same origin
            imgSrc: ["'self'"]
        }
    }
}));
// enables cross-origin resource sharing, not configured yet. Configure during Production
app.use(cors());


// Parsing Middleware
// parses incoming JSON and urlencoded data and makes it available in req.body
app.use(express.json());
app.use(express.urlencoded({extended : true}));


// Logging Middleware
// logs HTTP requests and errors to the console using morgan in 'dev' format, which provides concise output colored by response status for development use. 
// It helps in monitoring and debugging HTTP requests and responses during development.
app.use(morgan('dev'));
// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// Global error handler that captures any unhandled errors and sends a standardized JSON response with the error message and appropriate HTTP status code. 
// It prevents the application from crashing due to unhandled errors and provides a consistent error response format for clients. 
// This middleware should be added after all other routes and middleware to ensure it catches any unhandled errors.
app.use(errorHandler);

