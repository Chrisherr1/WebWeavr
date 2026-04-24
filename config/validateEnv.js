import { z } from 'zod';
// Used to validate environment variables at startup, ensuring that all required variables are present and correctly formatted.
// This helps catch configuration issues early and prevents runtime errors related to missing or invalid environment variables.

// Define a schema for environment variables using zod
const schema = z.object({
    DB_HOST:     z.string(),
    DB_USER:     z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME:     z.string(),
    CORS_ORIGIN: z.string().url().optional().default('http://localhost:3000'),
    PORT:        z.string().optional()
});

schema.parse(process.env); // Validate the environment variables against the schema