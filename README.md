# PRISM — Project Resource Ingestion & Summary Manager

PRISM ingests source materials (transcripts, documents, PDFs, emails, meeting recordings), transforms them into curated markdown summaries via the Claude API, and organizes the results into per-project knowledge bases.

The primary use case is feeding curated, up-to-date context into private Claude Projects for sales and engineering teams.

## Core Flow

```
Ingest content → LLM summarizes it → Summary stored in per-project Knowledge Base
```

## What It Does

**Ingestion** — Accepts content from multiple sources:
- Manual file uploads (`.txt`, `.vtt`, `.srt`, `.pdf`, `.md`)
- Otter.ai transcripts (via Zapier webhook or manual paste)
- Email with attachments *(planned)*

**Processing** — Each file is processed by a background Inngest job:
1. Text extracted from the file
2. Context built from linked project People
3. Claude API generates a structured markdown summary
4. Summary stored in Vercel Blob + Postgres

**Knowledge Base** — Per-project view of all summaries, concatenated and rendered as markdown, ready to copy into a Claude Project.

## Key Features

- **Per-project workspaces** with 4 tabs: Knowledge Base, Summaries, Source Files, People
- **People/contacts system** — link stakeholders to projects; their names/roles are injected into LLM prompts for better summaries
- **Prompt templates** — editable CRUD templates with placeholders for dynamic content
- **Admin panel** — LLM token usage tracking across all calls
- **Activity log** — chronological audit trail per project

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | Vercel Postgres (Neon) via Prisma |
| File Storage | Vercel Blob |
| Background Jobs | Inngest |
| LLM | Anthropic Claude API (Sonnet 4) |
| Deployment | Vercel Pro |

## Getting Started

See [`docs/deployment-guide.md`](docs/deployment-guide.md) for full environment variable setup and local dev instructions.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

```
DATABASE_URL=           # Vercel Postgres connection string
BLOB_READ_WRITE_TOKEN=  # Vercel Blob token
ANTHROPIC_API_KEY=      # Claude API key
INGEST_SECRET=          # Shared secret for webhook authentication
```

## Key Paths

```
src/app/api/                          # All API route handlers
src/app/projects/[id]/                # Project detail (4 tabs)
src/inngest/functions/process-file.ts # Core LLM background job
src/lib/                              # prisma, logger, llm/, text-extraction/, activity
prisma/schema.prisma                  # All data models
```

## Docs

- [`project-spec.md`](project-spec.md) — full feature spec and data model
- [`docs/ux-guide.md`](docs/ux-guide.md) — design system and component patterns
- [`docs/logging-standards.md`](docs/logging-standards.md) — server/client error handling
- [`docs/deployment-guide.md`](docs/deployment-guide.md) — deployment and env setup
