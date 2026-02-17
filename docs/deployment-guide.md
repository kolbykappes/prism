# Deployment & Setup Guide

## Prerequisites

- Node.js 20+
- A [Vercel](https://vercel.com) account
- A [Neon](https://neon.tech) PostgreSQL database
- An [Anthropic](https://console.anthropic.com) API key
- An [Inngest](https://inngest.com) account (free tier works)

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

| Variable | Required | Source | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | Neon dashboard | PostgreSQL connection string. Format: `postgresql://user:pass@host/db?sslmode=require` |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Storage > Blob | Token for file uploads. Auto-populated when you connect a Blob store to your Vercel project |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Console | Claude API key for LLM summarization |
| `INNGEST_EVENT_KEY` | Yes | Inngest dashboard | Event key for sending background job events |
| `INNGEST_SIGNING_KEY` | Yes | Inngest dashboard | Signing key for verifying Inngest webhook requests |
| `INGEST_SECRET` | Optional | Self-generated | Bearer token for external webhook callers (e.g., Zapier). Not needed for in-app imports |

### Where each variable is used

- `DATABASE_URL` — Prisma client via Neon HTTP adapter (`src/lib/prisma.ts`)
- `BLOB_READ_WRITE_TOKEN` — `@vercel/blob` SDK reads this automatically for file upload/download
- `ANTHROPIC_API_KEY` — `@anthropic-ai/sdk` reads this automatically for Claude API calls
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — `inngest` SDK reads these automatically
- `INGEST_SECRET` — Checked manually in the Otter webhook route (`src/app/api/ingest/otter/route.ts`)

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database (first time)
npx prisma db push

# Seed with default prompt template
npm run db:seed

# Start dev server
npm run dev
```

The app runs at `http://localhost:3000`.

### Inngest Dev Server

Inngest requires a dev server for local background job processing:

```bash
npx inngest-cli@latest dev
```

This runs at `http://localhost:8288` and connects to your Next.js app automatically.

## Vercel Deployment

### 1. Connect Repository

Link your GitHub repo to a Vercel project. Vercel auto-detects Next.js.

### 2. Set Environment Variables

In Vercel project settings > Environment Variables, add all required variables listed above.

**Important:** `BLOB_READ_WRITE_TOKEN` is easiest to set up by creating a Blob store in Vercel:
1. Vercel dashboard > Storage > Create > Blob
2. Connect it to your project
3. The token is auto-populated in your environment

### 3. Database Setup

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run `npx prisma db push` locally to create tables (or use Prisma migrations)
4. Run `npm run db:seed` to create the default prompt template

### 4. Inngest Setup

1. Create an Inngest account at [inngest.com](https://inngest.com)
2. Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to Vercel env vars
3. In the Inngest dashboard, sync your app by pointing to `https://your-app.vercel.app/api/inngest`

### 5. Deploy

Push to `master` — Vercel auto-deploys. Verify by checking the footer shows `PRISM v{version}`.

## Build

```bash
npm run build
```

This runs `prisma generate && next build`. Turbopack is used for development; the production build uses the default Next.js compiler.

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| "No token found" on file upload | `BLOB_READ_WRITE_TOKEN` missing | Add it in Vercel env vars or create a Blob store |
| 500 on Claude summarization | `ANTHROPIC_API_KEY` missing or invalid | Check the key in Vercel env vars |
| Files upload but never process | Inngest not connected | Verify Inngest keys and sync the app URL |
| "Unauthorized" on Otter webhook | `INGEST_SECRET` mismatch | Ensure the Bearer token matches the env var |
