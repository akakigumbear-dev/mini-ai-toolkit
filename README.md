# Mini AI Toolkit

A fullstack application for generating AI content using prompts. Built with a microservice architecture emphasizing async job processing, real-time updates, and clean separation of concerns.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│   Next.js   │  HTTP   │   API Gateway    │  AMQP   │  Generator Service  │
│   Frontend  │◄───────►│   (NestJS)       │◄───────►│  (NestJS Worker)    │
│   :3000     │   WS    │   :3001          │         │   (no HTTP)         │
└─────────────┘         └────────┬─────────┘         └──────────┬──────────┘
                                 │                              │
                                 ▼                              ▼
                          ┌──────────┐                   ┌──────────────┐
                          │ Postgres │                   │ Pollinations │
                          │          │                   │     .ai      │
                          └──────────┘                   └──────────────┘
                                 ▲                              │
                                 │         ┌──────────┐         │
                                 └────────►│ RabbitMQ │◄────────┘
                                           └──────────┘
```

### Services

| Service | Role | Port |
|---|---|---|
| **web** | Next.js frontend — prompt form, dashboard, history | 3000 |
| **api-gateway** | REST API, WebSocket server, DB owner, queue producer | 3001 |
| **generator-service** | RabbitMQ consumer, prompt enhancement, AI generation | none (AMQP only) |
| **postgres** | Persistent storage | 5432 |
| **rabbitmq** | Async job queue + status events | 5672 / 15672 |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| API Gateway | NestJS 10, TypeORM, class-validator |
| Worker | NestJS (standalone), amqp-connection-manager |
| Database | PostgreSQL 16 |
| Message Queue | RabbitMQ 3 (with management UI) |
| AI Provider | Pollinations.ai (with mock fallback) |
| Infrastructure | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Run everything

```bash
# Clone and enter the project
cd mini-ai-toolkit

# Start all services
docker-compose up --build
```

That's it. Open [http://localhost:3000](http://localhost:3000).

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| API Health | http://localhost:3001/health |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Start infrastructure
docker-compose up postgres rabbitmq -d

# In separate terminals:
cd apps/api-gateway && npm run start:dev
cd apps/generator-service && npm run start:dev
cd apps/web && npm run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | `postgres` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_USER` | `toolkit` | Database user |
| `POSTGRES_PASSWORD` | `toolkit_secret` | Database password |
| `POSTGRES_DB` | `mini_ai_toolkit` | Database name |
| `RABBITMQ_HOST` | `rabbitmq` | RabbitMQ host |
| `RABBITMQ_PORT` | `5672` | RabbitMQ AMQP port |
| `RABBITMQ_USER` | `guest` | RabbitMQ user |
| `RABBITMQ_PASSWORD` | `guest` | RabbitMQ password |
| `API_GATEWAY_PORT` | `3001` | API server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `GENERATION_TIMEOUT_MS` | `10000` | AI generation timeout |
| `POLLINATIONS_TEXT_URL` | `https://text.pollinations.ai` | Text API base URL |
| `POLLINATIONS_IMAGE_URL` | `https://image.pollinations.ai/prompt` | Image API base URL |
| `THROTTLE_TTL` | `60` | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | `10` | Max requests per window |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/generations` | Submit a new generation job |
| `GET` | `/generations` | List jobs (paginated, filterable) |
| `GET` | `/generations/:id` | Get a single job |
| `POST` | `/generations/:id/retry` | Retry a failed job |
| `POST` | `/generations/:id/cancel` | Cancel a pending/queued job |
| `GET` | `/health` | Health check |

### Create Generation

```bash
curl -X POST http://localhost:3001/generations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain microservices", "type": "text"}'
```

### List with Filters

```bash
curl "http://localhost:3001/generations?status=completed&type=text&page=1&limit=10"
```

## Async Job Flow

```
User submits prompt
       │
       ▼
API Gateway validates input
       │
       ▼
Creates job in DB (status: PENDING)
       │
       ▼
Publishes to RabbitMQ ──────────► Returns 201 immediately
       │                          (non-blocking)
       ▼
Updates status → QUEUED
       │
       ▼
Generator Service picks up job
       │
       ▼
Checks if cancelled → skip if yes
       │
       ▼
Emits status → GENERATING
       │
       ▼
Enhances prompt (text or image strategy)
       │
       ▼
Calls Pollinations.ai (10s timeout)
       │
       ├── Success → status: COMPLETED + result
       │
       ├── Text failure → tries mock fallback
       │
       └── Failure → status: FAILED + error message
```

### Job Statuses

```
PENDING → QUEUED → GENERATING → COMPLETED
                              → FAILED (retryable)
PENDING → CANCELLED
QUEUED  → CANCELLED
```

## WebSocket Flow

The frontend maintains a persistent WebSocket connection to receive real-time updates.

```
Frontend ──── WS connect ────► API Gateway (/ws namespace)
                                    │
Generator Service publishes         │
status to RabbitMQ ────────────────►│
                                    │
API Gateway consumes status,        │
updates DB, then broadcasts ───────►│ All connected clients
                                    │
Frontend updates UI in real-time ◄──┘
```

### Events

| Event | Payload | Trigger |
|---|---|---|
| `job:created` | Full job object | New job submitted |
| `job:status` | Updated job object | Any status change |
| `job:completed` | Job with result | Generation finished |
| `job:failed` | Job with error | Generation failed |

## Project Structure

```
mini-ai-toolkit/
├── docker-compose.yml
├── packages/
│   └── shared-types/          # Shared enums, interfaces, constants
├── apps/
│   ├── api-gateway/           # NestJS REST + WebSocket service
│   │   └── src/
│   │       ├── generations/   # Controller, service, entity, DTOs
│   │       ├── queue/         # RabbitMQ producer + status consumer
│   │       ├── websocket/     # Socket.io gateway
│   │       └── health/        # Health endpoint
│   ├── generator-service/     # NestJS standalone worker
│   │   └── src/
│   │       ├── consumer/      # RabbitMQ job consumer
│   │       ├── generation/    # Orchestration service
│   │       ├── enhancement/   # Prompt enhancement strategies
│   │       ├── providers/     # AI provider implementations
│   │       └── status/        # Status update publisher
│   └── web/                   # Next.js frontend
│       └── src/
│           ├── app/           # Pages (dashboard, history)
│           ├── components/    # UI components
│           ├── hooks/         # WebSocket hook
│           └── lib/           # API client, utilities
```

## Design Decisions & Tradeoffs

### Why two backend services instead of one?

Demonstrates microservice architecture without over-engineering. The API Gateway handles HTTP/WS/DB concerns while the Generator Service is a pure AMQP consumer — they scale independently.

### Why RabbitMQ instead of a simpler queue?

RabbitMQ provides durable queues, manual acknowledgment, prefetch control, and exchange routing. This gives us at-least-once delivery and backpressure — critical for reliable async processing.

### Why retry creates a new job row?

Preserves complete generation history. Users can see all attempts, and the `retryCount` field tracks lineage. Mutating the original row would lose failure data.

### Why cancel via DB flag instead of a cancel queue?

Simpler and more reliable. The worker checks the DB before processing. For a two-service system, adding a cancel exchange would be over-engineering.

### Why mock text fallback?

Pollinations.ai can be unstable. The provider abstraction (strategy pattern) enables seamless fallback. This also makes development/testing possible offline.

### Why `synchronize: true` for TypeORM?

Acceptable for a take-home assignment. In production, this would be replaced with explicit migrations.

## Improvements With More Time

- **Authentication** — JWT or session-based auth with user scoping
- **Database migrations** — Replace `synchronize: true` with TypeORM migration files
- **Job priority queue** — Priority levels for different generation types
- **Worker scaling** — Multiple worker instances with prefetch tuning
- **Result storage** — Store generated images in S3/MinIO instead of Pollinations URLs
- **Streaming** — Stream text generation results via WebSocket as they arrive
- **Monitoring** — Prometheus metrics, structured logging, distributed tracing
- **Circuit breaker** — Automatic provider failover with circuit breaker pattern
- **E2E tests** — Full integration tests with testcontainers
- **CI/CD** — GitHub Actions pipeline with build, test, and Docker push
- **Caching** — Redis cache for repeated prompts
- **Dead letter queue** — DLQ for poison messages with alerting

## Running Tests

```bash
# API Gateway tests
cd apps/api-gateway && npm test

# Generator Service tests
cd apps/generator-service && npm test
```
