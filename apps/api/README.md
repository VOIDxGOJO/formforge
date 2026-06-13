# FormForge API

Express + Prisma backend powering auth, workspaces, forms, submissions, workflows, and webhooks.

## Run locally

```bash
# From repo root
docker compose up -d postgres
npm run dev:api
```

API listens on **http://localhost:3001**

## Health check

```
GET /api/health
```

Returns database connectivity, uptime, and status.

## Key routes

| Prefix | Description |
|--------|-------------|
| `/api/v1/auth` | Register, login, refresh, logout, me |
| `/api/v1/workspaces` | CRUD, members, invites, analytics |
| `/api/v1/workspaces/:id/forms` | Forms, submissions, workflows |
| `/api/v1/uploads/presign` | S3 presigned upload URLs |
| `/api/v1/sse/:workspaceId` | Server-Sent Events stream |
| `/api/public/forms/:slug` | Public form schema + submit |

## Architecture

```
routes → controllers → services → repositories → Prisma
```

All request bodies validated with **Zod**. Errors bubble to a single global handler.

## Migrations

```bash
npx prisma migrate dev      # local
npx prisma migrate deploy   # production
```

## Env

Copy from repo root `.env.example` into `apps/api/.env`.
