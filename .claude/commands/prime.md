# PRISM — Session Prime

**PRISM** is a Next.js 16 App Router app that ingests files (transcripts, PDFs, emails), summarizes them via Claude API using Inngest background jobs, and organizes the results into per-project knowledge bases.

## Read These First

- `project-spec.md` — source of truth for features, data model, API routes, UI. Keep it updated.
- `docs/ux-guide.md` — colors, components, spacing, anti-patterns. Follow strictly.
- `docs/logging-standards.md` — server/client error handling. No raw `console.error` on server.
- `docs/deployment-guide.md` — env vars and setup.

## Stack

Next.js 16 · TypeScript · Tailwind + shadcn/ui · Lucide icons · Prisma + Neon Postgres · Vercel Blob · Inngest · Anthropic Claude API · Vercel Pro

## Key Paths

```
src/app/api/           # All API route handlers
src/app/projects/[id]/ # Project detail (4 tabs)
src/inngest/functions/process-file.ts  # Core LLM job
src/lib/               # prisma, logger, llm/, text-extraction/, activity
prisma/schema.prisma   # All data models
```

## Critical Conventions

- Theme via Tailwind vars only (`bg-primary`, not `bg-blue-500`)
- Server logging: `import { logger } from "@/lib/logger"` — never `console.error`
- All API routes wrapped in try/catch
- Hard deletes only, no soft delete
- Commit after changes, never push unless asked
