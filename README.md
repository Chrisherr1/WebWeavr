# Spyder

A passive reconnaissance tool that scans a domain across multiple OSINT sources and streams results in real time via Server-Sent Events (SSE).

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Security:** Helmet, CORS, rate limiting
- **Streaming:** Server-Sent Events (SSE)

## Features

- Runs 11 recon modules in parallel across 4 categories
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
Spyder/
├── config/
│   ├── modules.js          # Module registry and group definitions
│   └── validateEnv.js      # Environment variable validation
├── controllers/
│   └── reconController.js  # Request handler for scan endpoint
├── middleware/
│   └── errorHandler.js     # Global error handler
├── modules/                # Individual OSINT source modules
├── pipeline/
│   ├── aggregate.js        # Deduplicate and collect subdomains
│   ├── resolve.js          # DNS resolution to find live hosts
│   └── enrich.js           # Enrich live hosts with extra data
├── routes/
│   └── recon.js            # API route definitions
├── services/
│   └── reconService.js     # Orchestrates modules and pipeline
├── utils/
│   ├── domain.js           # Domain validation
│   └── sse.js              # SSE helper
└── index.js                # Server entry point
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
PORT=3000
```

### 3. Start the server
```bash
# Development
npm run dev

# Production
npm start
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

## Data Flow

```
GET /api/recon?domain=
        ↓
  reconController
        ↓
  reconService (runs all modules in parallel)
        ↓
  pipeline: aggregate → resolve → enrich
        ↓
  SSE stream → client
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start with node |
