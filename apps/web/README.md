# FormForge Web

Next.js 14 frontend — dashboard, drag-and-drop form builder, public form renderer, and team settings.

## Run locally

```bash
# From repo root (API must be running on :3001)
npm run dev:web
```

App opens at **http://localhost:3000**

## Pages

| Route | Description |
|-------|-------------|
| `/login` · `/register` | Authentication |
| `/dashboard` | Analytics + live submission counter |
| `/dashboard/forms` | Form list + create |
| `/dashboard/forms/[id]/builder` | Drag-and-drop editor |
| `/dashboard/forms/[id]/responses` | Submission inbox + CSV export |
| `/dashboard/forms/[id]/settings` | Workflow automation |
| `/dashboard/settings` | Workspace + team |
| `/f/[slug]` | Public form (no auth) |

## Stack

- **State:** TanStack Query (server) · Zustand (builder undo/redo)
- **Forms:** React Hook Form + Zod
- **DnD:** @dnd-kit
- **Charts:** Recharts
- **UI:** Tailwind + shadcn-style components

## Env

```bash
copy .env.local.example .env.local
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` for local dev.
