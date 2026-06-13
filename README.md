<div align="center">

# ⚒️ FormForge

**Build forms. Collect answers. Automate everything.**

A production-grade, multi-tenant SaaS for drag-and-drop form building, real-time analytics, and workflow automation — Typeform meets Zapier, engineered as a clean monorepo.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-API-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [Deploy](#-deploy) · [Contributing](#-contributing)

</div>

---

## ✨ Why FormForge?

Most form builders are either pretty demos or over-engineered microservices. **FormForge sits in the sweet spot** — a real SaaS architecture you can run locally, fork for your portfolio, or deploy to production.

| You get | Without the pain of |
|---------|---------------------|
| Drag-and-drop form builder | Kafka / microservices |
| Workspace RBAC (Owner → Viewer) | Tutorial CRUD apps |
| Webhook retry engine + HMAC signing | Vendor lock-in |
| Live submission counter (SSE) | Socket.io complexity |
| Analytics dashboard | AI buzzword features |

---

## 🚀 Features

### For teams
- **Multi-tenant workspaces** — isolated data, team invites, role-based access
- **Form builder** — text, email, number, textarea, dropdown, file fields with undo/redo
- **Public forms** — shareable `/f/your-slug` pages, no login required

### For builders
- **Workflow engine** — trigger on submission: send email (Resend) or POST webhook
- **Webhook reliability** — DB-backed delivery log, exponential backoff, dead-letter after 5 attempts
- **Real-time dashboard** — SSE pushes new submission counts without polling
- **Analytics** — 30-day volume chart, per-form breakdown, active workflow stats

### For engineers
- **Clean architecture** — routes → controllers → services → repositories
- **Strict TypeScript** everywhere — shared contracts in `packages/types`
- **Zod validation** on every API input
- **Centralized error handling** — consistent `{ success, data, error }` responses
- **Docker-ready** — dev & production compose files included

---

## 🏗 Architecture

```
┌─────────────┐     cookies + REST     ┌─────────────┐     Prisma     ┌────────────┐
│  Next.js    │ ◄────────────────────► │  Express    │ ◄────────────► │ PostgreSQL │
│  apps/web   │     SSE (live count)   │  apps/api   │                └────────────┘
└─────────────┘                        └──────┬──────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                    Resend Email        S3 Presign           Webhook + Cron
                    (invites, flows)    (file uploads)       (retry job)
```

### Monorepo layout

| Package | Role |
|---------|------|
| [`apps/web`](apps/web) | Next.js 14 dashboard, builder, public form renderer |
| [`apps/api`](apps/api) | Express API, Prisma, workflows, webhooks, SSE |
| [`packages/types`](packages/types) | Shared TypeScript API contracts |

---

## ⚡ Quick Start

> **3 terminals. 5 minutes. You're live.**

### Prerequisites

- **Node.js 20+**
- **Docker Desktop** (for PostgreSQL)
- **npm** (comes with Node)

### 1. Clone & install

```bash
git clone https://github.com/VOIDxGOJO/formforge.git
cd formforge
npm install
```

### 2. Environment

```bash
# Windows PowerShell
copy .env.example apps\api\.env
copy apps\web\.env.local.example apps\web\.env.local
```

Default values work for local dev. Change JWT secrets before any public deployment.

### 3. Database

```bash
npm run db:up
npm run db:migrate
```

### 4. Run

```bash
# Terminal 1 — API  →  http://localhost:3001
npm run dev:api

# Terminal 2 — Web  →  http://localhost:3000
npm run dev:web
```

### 5. Smoke test

1. Open **http://localhost:3000/register** — create an account
2. **Dashboard** → create a form → open **Builder** → add fields → **Save**
3. Visit **`/f/your-form-slug`** — submit a response
4. Check **Responses** inbox — your submission appears
5. API health: **http://localhost:3001/api/health** → `"db": "connected"`

---

## 🛠 Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev:api` | Start Express API with hot reload |
| `npm run dev:web` | Start Next.js frontend |
| `npm run setup` | Install + Postgres + migrate (first-time) |
| `npm run build` | Production build (all packages) |
| `npm run typecheck` | TypeScript strict check |

---

## 🔐 Environment Variables

<details>
<summary><strong>API (<code>apps/api/.env</code>)</strong></summary>

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | 15-minute access token signing |
| `JWT_REFRESH_SECRET` | 7-day refresh token signing |
| `WEBHOOK_SIGNING_SECRET` | HMAC for outbound webhooks |
| `RESEND_API_KEY` | Email (invites + workflow actions) |
| `AWS_*` | S3 presigned file uploads |
| `CORS_ORIGIN` | Frontend URL (e.g. `http://localhost:3000`) |
| `PORT` | API port (default `3001`) |

</details>

<details>
<summary><strong>Web (<code>apps/web/.env.local</code>)</strong></summary>

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | API base URL |
| `NEXT_PUBLIC_APP_URL` | App URL (invite links) |

</details>

---

## 🚢 Deploy

FormForge is a **full-stack app** (API + DB + frontend). Recommended hosts:

| Service | Hosts |
|---------|-------|
| **Railway** (recommended) | API + Web + PostgreSQL in one project |
| **Render** | API + Web + managed Postgres |
| **Vercel + Railway** | Web on Vercel, API + DB on Railway |

> **Netlify alone won't work** — it can't run the Express API or PostgreSQL. Use Netlify only for the frontend if you host the API elsewhere.

See [Railway steps](#railway-quick-deploy) in the collapsible below.

<details>
<summary><strong>Railway quick deploy</strong></summary>

1. New Railway project → add **PostgreSQL** plugin
2. Deploy **API** service (`apps/api/Dockerfile`) → set all API env vars
3. Deploy **Web** service (`apps/web/Dockerfile`) → set `NEXT_PUBLIC_*` vars
4. Release command: `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma`
5. Set `CORS_ORIGIN` to your production web URL

</details>

---

## 🤝 Contributing

Contributions welcome! This project is built to be forked, extended, and learned from.

1. Fork the repo
2. Create a branch: `git checkout -b feat/amazing-thing`
3. Commit: `git commit -m "feat: add amazing thing"`
4. Push: `git push origin feat/amazing-thing`
5. Open a Pull Request

Please keep PRs focused. Run `npm run typecheck` before submitting.

---

## 🧱 Tech Stack

**Frontend:** Next.js 14 · Tailwind · Zustand · TanStack Query · @dnd-kit · Recharts · React Hook Form · Zod

**Backend:** Express · Prisma · PostgreSQL · JWT (httpOnly cookies) · node-cron · SSE · Resend · AWS S3

**Tooling:** Turborepo · TypeScript strict · Docker · GitHub Actions CI

---

## 📄 License

[MIT](LICENSE) — use it, fork it, ship it.

---

<div align="center">

**Built with care for engineers who want real architecture, not toy demos.**

⭐ Star this repo if FormForge helps your learning or your next side project.

</div>
