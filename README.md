# WebWeavr

A passive reconnaissance tool that scans a domain across multiple OSINT sources and streams results in real time via Server-Sent Events (SSE).

![WebWeavr demo](public/WebWeavr.gif)

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Database:** MySQL (mysql2)
- **Validation:** Zod
- **Security:** Helmet, CORS, rate limiting (express-rate-limit)
- **Streaming:** Server-Sent Events (SSE)
- **Logging:** Morgan (combined)
- **Deployment:** Docker, Docker Compose, Nginx

## Features

- Runs recon modules one at a time across 4 categories
- Streams live progress updates to the client via SSE
- Aggregates subdomains, resolves live hosts, and enriches results through a post-scan pipeline

## Recon Modules

| Category | Modules |
|---|---|
| Identity | WHOIS / RDAP |
| Infrastructure | DNS Records, BGP / ASN, IPInfo, InternetDB |
| Subdomains | crt.sh, CertSpotter, Anubis |
| Historical Exposure | Wayback Machine, CommonCrawl, URLScan |

## Project Structure

```
WebWeavr/
├── config/
│   ├── db.js               # MySQL connection pool
│   ├── modules.js          # Module registry and group definitions
│   └── validateEnv.js      # Zod environment variable validation
├── controllers/
│   └── reconController.js  # SSE scan endpoint handler
├── middleware/
│   └── errorHandler.js     # Global error handler
├── modules/                # Individual OSINT source modules
├── pipeline/
│   ├── aggregate.js        # Deduplicate and collect subdomains
│   ├── resolve.js          # DNS resolution to find live hosts
│   └── enrich.js           # Enrich live hosts with org, geo, and port data
├── repositories/
│   └── scansRepository.js  # All database queries — single source of SQL
├── routes/
│   ├── index.js            # Root router — mounts all route groups
│   └── recon.js            # /api/recon routes
├── schema/
│   └── schema.sql          # Database schema
├── services/
│   ├── reconService.js     # Orchestrates modules and pipeline
│   └── scanLogger.js       # Writes scan records to MySQL
├── utils/
│   ├── domain.js           # Domain validation
│   └── sse.js              # SSE helper
├── public/
│   ├── index.html          # Single page — markup only, no inline logic
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js          # Entry point — event handlers and scan flow
│       ├── state.js        # Shared config and scan state
│       ├── helpers.js      # Small reusable functions for building HTML
│       ├── render.js       # Turns module results into what you see on screen
│       └── export.js       # Handles the JSON download
├── Dockerfile              # API container build
├── docker-compose.yml      # API + MySQL stack
├── app.js                  # Express app setup
└── index.js                # Server entry point
```


## API

### `GET /api/recon?domain=<domain>`

Streams scan progress as Server-Sent Events.

**Event types:**

| Event | Description |
|---|---|
| `start` | Scan initiated, total module count |
| `module_start` | A module has begun |
| `module_done` | A module completed with results |
| `module_error` | A module failed |
| `pipeline_start` | Post-scan pipeline is running |
| `pipeline_done` | Final enriched results |
| `complete` | Scan finished |


## How a Scan Works

```
User clicks Scan
    ↓
app.js sends request to backend
    ↓
Backend runs all recon modules one by one
    ↓
Results stream back one by one as each module finishes
    ↓
app.js receives each result and hands it to render.js
    ↓
render.js draws the result card on screen
    ↓
Scan finishes → export button appears
    ↓
User clicks Export → export.js packages everything → JSON download
```

## Data Flow

```
GET /api/recon?domain=
        ↓
  reconController
        ↓
  reconService (runs all modules one by one)
        ↓
  pipeline: aggregate → resolve → enrich
        ↓
  SSE stream → client
        ↓
  scanLogger → scansRepository → MySQL
```

## Security

- Helmet with strict CSP and `frame-ancestors 'none'`
- CORS scoped to a single origin, GET-only, no credentials
- Rate limiting (3 requests / 15 min per IP)
- Request body size cap (10kb)
- Zod-validated environment variables
- Parameterized SQL queries, isolated to the repository layer
- Docker container runs as non-root with isolated network and resource limits
- Generic 500 responses (no stack trace leakage)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start with node |
