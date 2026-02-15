# PRISM — Project Resource Ingestion & Summary Manager

## MVP Functional Requirements

### Overview

PRISM is a web application that ingests source materials (transcripts, documents, PDFs), transforms them into curated markdown summaries via LLM processing, and organizes them into project-based knowledge bases. The primary use case is feeding curated, up-to-date context into private Claude Projects for sales and engineering teams.

**MVP Goal:** Upload a file → LLM summarizes it → Summary appears on a per-project Knowledge Base page that can be referenced or exported for use in Claude Projects.

---

### Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 14+ (App Router)** | Monolith: UI + API routes in one repo |
| Language | **TypeScript** | Throughout |
| UI | **Tailwind CSS + shadcn/ui** | |
| Database | **Vercel Postgres (Neon)** | Via Prisma ORM |
| File Storage | **Vercel Blob** | For source files and generated markdown |
| Background Jobs | **Inngest** | For async LLM processing (handles Vercel function timeouts) |
| LLM | **Anthropic Claude API** | TypeScript SDK, Claude Sonnet 4 for speed/cost |
| Deployment | **Vercel (Pro plan)** | 300s function timeout available |

---

### Data Model

#### Projects

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | string | Required, unique |
| description | string | Optional |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated on any child change |

#### Source Files

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| project_id | UUID | FK → Projects |
| filename | string | Original filename |
| file_type | enum | txt, vtt, srt, pdf, md |
| file_size | integer | Bytes |
| blob_url | string | Vercel Blob URL |
| uploaded_at | timestamp | |

#### Markdown Summaries

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| source_file_id | UUID | FK → Source Files |
| project_id | UUID | FK → Projects |
| blob_url | string | Vercel Blob URL for .md file |
| content | text | Stored in DB for quick rendering |
| generated_at | timestamp | |
| llm_model | string | e.g. "claude-sonnet-4-20250514" |
| processing_status | enum | queued, processing, complete, failed |
| error_message | string | Nullable, populated on failure |
| token_count | integer | Nullable, input tokens used |
| truncated | boolean | Whether input was truncated |

#### Processing Jobs

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| source_file_id | UUID | FK → Source Files |
| status | enum | queued, processing, complete, failed |
| created_at | timestamp | |
| started_at | timestamp | Nullable |
| completed_at | timestamp | Nullable |
| error_message | string | Nullable |

---

### Pages & UI

#### 1. Home / Project List (`/`)

- Displays all projects as cards or rows
- Each project shows:
  - Project name
  - Description (truncated)
  - Created date
  - Last updated timestamp
  - Number of source documents
  - Number of completed summaries
- **"New Project"** button → opens create project form (modal or inline)
- Clicking a project navigates to Project Detail

#### 2. Create Project (modal or `/projects/new`)

- Fields:
  - **Project Name** (required, must be unique)
  - **Description** (optional, textarea)
- On submit: creates project record, redirects to Project Detail page

#### 3. Project Detail (`/projects/[id]`)

This is the primary workspace. It has **three tabs**:

##### Tab 1: Knowledge Base (default)

- Renders all completed markdown summaries for the project, concatenated
- Each summary section shows:
  - Source filename as heading
  - Generated date
  - The rendered markdown content
- Sections separated by horizontal rules
- **Header area** shows:
  - Project name and description
  - "Upload File" button (prominent)
  - Last updated timestamp
- If no summaries yet, show empty state with upload prompt
- Future: this is what becomes the Google Doc content

##### Tab 2: Summaries

- List/table of all markdown summaries
- Columns: Source filename, generated date, status, token count, truncated flag
- Click to expand/view individual summary
- "Re-process" button per summary (re-queues LLM job for that source file)
- Status badges: queued (yellow), processing (blue/spinner), complete (green), failed (red)

##### Tab 3: Source Files

- List/table of all uploaded source files
- Columns: Filename, file type, file size, uploaded date
- Download link for each file
- "Re-process" button (regenerate summary from this source)
- Delete button (deletes source file AND associated summary)

#### 4. Upload Flow (within Project Detail)

- **"Upload File" button** opens upload interface
- Drag-and-drop zone OR file picker
- Accepted file types: `.txt`, `.vtt`, `.srt`, `.pdf`, `.md`
- On file select:
  - Show filename and file size
  - Upload button to confirm
- On upload:
  - File stored to Vercel Blob
  - Source File record created in DB
  - Processing Job created with status `queued`
  - Markdown Summary record created with status `queued`
  - Background job triggered via Inngest
  - UI shows toast confirmation: "File uploaded, processing started"
  - Summaries tab shows job with `queued` status
- **No verbosity/style selector in MVP** — hardcode Standard verbosity, general-purpose summary style

---

### LLM Transformation Pipeline

#### Job Execution Flow

1. Inngest event fired on file upload
2. Worker function retrieves source file from Vercel Blob
3. Text extraction based on file type:
   - `.txt`, `.md`: read directly
   - `.vtt`, `.srt`: parse and strip timestamps, extract speaker labels and dialogue
   - `.pdf`: extract text (use `pdf-parse` npm package)
4. Check text length against context window limit
   - **If text exceeds limit**: truncate to fit, set `truncated = true` on the summary record
   - **Truncation warning**: include a note at the top of the generated summary: `> ⚠️ Note: The source document was truncated to fit processing limits. This summary covers approximately the first {X}% of the document.`
5. Construct prompt using template (see below)
6. Call Claude API (Sonnet 4)
7. On success:
   - Store markdown to Vercel Blob
   - Store content in Markdown Summary record
   - Update status to `complete`
   - Update project `updated_at`
8. On failure:
   - Store error message
   - Update status to `failed`
   - Allow retry via UI

#### Prompt Template (MVP — Single Template)

```
You are a professional knowledge curator. Transform the following source content into well-structured markdown notes suitable for use as reference material in an AI assistant's project knowledge base.

SOURCE FILE: {filename}
FILE TYPE: {file_type}

INSTRUCTIONS:
- Create clear, scannable markdown with appropriate headings
- For meeting transcripts: extract key discussion points, decisions, action items, and next steps
- For documents: summarize main themes, key data points, and conclusions
- For all content: preserve important specifics (names, dates, numbers, technical details)
- Use bullet points for lists of items
- Use blockquotes for important quotes or callouts
- Omit filler, tangents, and redundant content
- If the content includes participants/speakers, list them at the top
- Target output length: roughly 20-30% of source length (concise but comprehensive)

SOURCE CONTENT:
{extracted_text}
```

#### Context Window Management

- **Model**: Claude Sonnet 4 — 200K context window
- **Budget**: Reserve 4,000 tokens for system prompt + output
- **Max input**: ~180,000 tokens (conservative estimate)
- **Character estimate**: ~720,000 characters of source text
- **Truncation strategy**: truncate from the end, preserve the beginning of the document
- **Token counting**: Use a simple character-based estimate (4 chars ≈ 1 token) for MVP; exact tokenization not required

---

### API Routes

All API routes are Next.js App Router route handlers (`/app/api/...`).

#### Projects

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/[id]` | Get project detail with counts |
| PUT | `/api/projects/[id]` | Update project name/description |
| DELETE | `/api/projects/[id]` | Delete project and all children |

#### Source Files

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/files` | List source files for project |
| POST | `/api/projects/[id]/files` | Upload file (multipart form) |
| DELETE | `/api/projects/[id]/files/[fileId]` | Delete file and summary |

#### Summaries

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/summaries` | List summaries for project |
| GET | `/api/projects/[id]/summaries/[summaryId]` | Get single summary |
| POST | `/api/projects/[id]/files/[fileId]/reprocess` | Re-queue processing |

#### Knowledge Base

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/knowledge-base` | Get compiled markdown (all summaries) |

---

### Error Handling

- **Upload errors**: Toast notification with error message, file not stored
- **Processing failures**: Status set to `failed` with error message visible in UI, retry button available
- **LLM API errors**: Catch rate limits, timeouts, and API errors; store in error_message; auto-retry once via Inngest retry policy
- **Truncation**: Not an error — handled gracefully with warning banner on the summary

---

### Data Lifecycle & Deletion

- **Delete source file**: also deletes associated markdown summary, blob files, and processing jobs
- **Delete project**: cascading delete of all source files, summaries, jobs, and blob files
- **No soft delete in MVP** — hard deletes only

---

### Future-Proofing (Design For, Don't Build Yet)

These should be reflected in the data model or architecture but NOT implemented in MVP:

1. **Multi-user / Auth**: User ID fields exist in schema but are nullable/unused. Structure middleware to make adding auth straightforward.
2. **Google Docs sync**: The Knowledge Base page content is the exact payload that would be synced to Google Docs. Keep the compilation logic isolated so a sync agent can call it later.
3. **Verbosity/style settings**: The Markdown Summary table has fields for `verbosity_level` and `summary_style` but MVP hardcodes defaults.
4. **Additional file types**: `.docx` and `.pptx` support can be added by extending the text extraction step. Keep extraction logic modular (one function per file type).
5. **Per-project Google Doc URL**: Add a `google_doc_id` and `google_doc_url` field to the Projects table (nullable, unused in MVP).

---

### Non-Functional Requirements

- **Performance**: File upload to summary complete within 2 minutes for typical documents (<50 pages)
- **File size limit**: 50MB per upload (enforced client-side and server-side)
- **Supported browsers**: Modern Chrome, Firefox, Safari, Edge (no IE)
- **Mobile**: Responsive layout (viewable on mobile, upload primarily desktop)
- **Accessibility**: Basic semantic HTML, keyboard navigation for core flows

---

### Environment Variables Required

```
DATABASE_URL=           # Vercel Postgres connection string
BLOB_READ_WRITE_TOKEN=  # Vercel Blob token
ANTHROPIC_API_KEY=      # Claude API key
INNGEST_EVENT_KEY=      # Inngest event key
INNGEST_SIGNING_KEY=    # Inngest signing key
```

---

### Deployment Notes

- Deploy to **Vercel** via GitHub repo connection
- Vercel Postgres and Vercel Blob provisioned via Vercel dashboard
- Inngest connected via Vercel integration (or self-hosted URL)
- Prisma migrations run via `prisma migrate deploy` in build step
- Pro plan provides 300s function timeout for LLM processing routes

---

### Out of Scope for MVP

- Authentication / authorization
- Google Docs integration (stubbed)
- Automated ingestion (webhooks, email, etc.)
- Content curation / compression / decay
- Multi-project content sharing
- Version history
- Search / filtering
- Notifications beyond toast messages
- .docx and .pptx file support
- Custom LLM model selection
- Verbosity / style configuration in UI