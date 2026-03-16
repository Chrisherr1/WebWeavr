import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';


dotenv.config();

const app = express();

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

app.use(express.json());
app.use(express.urlencoded({extended : true}));

