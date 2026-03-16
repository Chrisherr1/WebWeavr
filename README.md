# comp440-project

A Node.js REST API boilerplate using Express and MySQL2.

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Database:** MySQL2 (connection pool)
- **Security:** Helmet (CSP), CORS
- **Logging:** Morgan
- **Validation:** Zod (environment variables)

## Project Structure
```
comp440-project/
├── config/
│   ├── db.js               # MySQL2 connection pool
│   └── validateEnv.js      # Environment variable validation
├── controllers/            # Route handlers
├── middleware/
│   └── errorHandler.js     # Global error handler
├── models/                 # Business logic
├── repositories/           # Database queries
├── dtos/                   # Data transfer objects
├── routes/                 # API routes
├── app.js                  # Express app setup
├── index.js                # Server entry point
├── .env                    # Environment variables
└── .gitignore
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=comp440
PORT=3000
```

### 3. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## Data Flow
```
Request → Route → Controller → Model → Repository → MySQL
                                     ↓
Response ← Controller ← DTO ←────────┘
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start with node |
