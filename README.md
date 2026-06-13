# FormForge

Multi-tenant SaaS form builder and workflow automation platform.

## Architecture

```
Browser (Next.js) ──HTTP/cookies──► Express API ──Prisma──► PostgreSQL
                         │                    │
                         └── SSE ◄────────────┘
                         S3 (presigned uploads)
                         Resend (email)
                         Webhook deliveries + cron retry
```

## Monorepo

| Package | Description |
|---------|-------------|
| `apps/api` | Express + Prisma backend |
| `apps/web` | Next.js 14 frontend |
| `packages/types` | Shared TypeScript contracts |

## Local setup

### Prerequisites

- Node.js 20+
- Docker (for Postgres)
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `apps/api/.env` and `apps/web/.env.local`. Update secrets.

### 3. Database

```bash
docker compose up -d postgres
cd apps/api && npx prisma migrate dev
```

### 4. Run dev servers

```bash
# Terminal 1 — API (port 3001)
npm run dev --workspace=@formforge/api

# Terminal 2 — Web (port 3000)
npm run dev --workspace=@formforge/web
```

Or full stack:

```bash
docker compose up --build
```

### 5. Verify

- API health: http://localhost:3001/api/health
- Web: http://localhost:3000
- Register → dashboard → create form → builder → public `/f/[slug]`

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | API | PostgreSQL connection |
| `JWT_ACCESS_SECRET` | API | 15min access JWT |
| `JWT_REFRESH_SECRET` | API | 7d refresh JWT |
| `WEBHOOK_SIGNING_SECRET` | API | HMAC for webhook payloads |
| `RESEND_API_KEY` | API | Transactional email |
| `RESEND_FROM_EMAIL` | API | Sender address |
| `AWS_*` | API | S3 presigned uploads |
| `CORS_ORIGIN` | API | Allowed frontend origin |
| `PORT` | API | API port (default 3001) |
| `NEXT_PUBLIC_API_URL` | Web | API base URL |
| `NEXT_PUBLIC_APP_URL` | Web | App URL for invite links |

## Railway deployment

1. Create a new project on Railway.
2. Add **PostgreSQL** plugin; copy `DATABASE_URL` to API service.
3. Deploy **API** from `apps/api/Dockerfile` (or root with dockerfile path).
4. Deploy **Web** from `apps/web/Dockerfile` with build args `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`.
5. Set all env vars from the table above on the API service.
6. Run migrations: `npx prisma migrate deploy` (one-off command or release phase).
7. Point custom domains; set `CORS_ORIGIN` to your web URL.

## Scripts

```bash
npm run build      # Build all packages
npm run typecheck  # TypeScript check
npm run dev        # Turbo dev (api + web)
```

## License

Private — FormForge
