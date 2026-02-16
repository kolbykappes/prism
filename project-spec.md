# PRISM — Project Resource Ingestion & Summary Manager

## Functional Requirements

### Overview

PRISM is a web application that ingests source materials (transcripts, documents, PDFs, emails, meeting recordings), transforms them into curated markdown summaries via LLM processing, and organizes them into project-based knowledge bases. The primary use case is feeding curated, up-to-date context into private Claude Projects for sales and engineering teams.

**Core Flow:** Ingest content (upload, email, or Otter transcript) → LLM summarizes it → Summary appears on a per-project Knowledge Base page that can be referenced or exported for use in Claude Projects.

---

### Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 16 (App Router)** | Monolith: UI + API routes in one repo, Turbopack |
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
| overview | string | Optional, markdown, editable inline |
| email_alias | string | Optional, unique, for email ingestion (planned) |
| created_at | timestamp | |
| updated_at | timestamp | Auto-updated on any child change |
| user_id | string | Nullable, future auth |
| google_doc_id | string | Nullable, future Google Docs sync |
| google_doc_url | string | Nullable, future Google Docs sync |

#### Source Files

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| project_id | UUID | FK → Projects |
| filename | string | Original filename |
| file_type | enum | txt, vtt, srt, pdf, md, email, ics |
| file_size | integer | Bytes |
| blob_url | string | Vercel Blob URL |
| uploaded_at | timestamp | |
| uploaded_by | string | Default "Kolby", or "Otter.ai" for imports |
| ingest_source | string | "manual_upload", "otter", "email" (planned) |

#### Markdown Summaries

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| source_file_id | UUID | FK → Source Files (unique, 1:1) |
| project_id | UUID | FK → Projects |
| blob_url | string | Vercel Blob URL for .md file |
| content | text | Stored in DB for quick rendering |
| generated_at | timestamp | |
| llm_model | string | e.g. "claude-sonnet-4-20250514" |
| processing_status | enum | queued, processing, complete, failed |
| error_message | string | Nullable, populated on failure |
| token_count | integer | Nullable, input tokens used |
| truncated | boolean | Whether input was truncated |
| prompt_template_id | string | Which prompt template was used |
| verbosity_level | string | Nullable, future use |
| summary_style | string | Nullable, future use |

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

#### Activity Logs

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| project_id | UUID | FK → Projects |
| action | enum | uploaded, reprocessed, deleted, summary_completed, project_created, person_added, person_removed, email_ingested, otter_ingested |
| source_file_id | string | Nullable |
| user_name | string | Default "Kolby" |
| metadata | JSON | Freeform (e.g. filename, title, personName) |
| created_at | timestamp | |

#### Prompt Templates

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | string | |
| content | string | Template with `{{filename}}`, `{{fileType}}`, `{{people}}`, `{{extractedText}}` placeholders |
| is_default | boolean | Only one should be true |
| created_at | timestamp | |
| updated_at | timestamp | |

#### Persons

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | string | Required |
| email | string | Optional |
| organization | string | Optional |
| role | string | Optional, general role |
| notes | string | Optional |
| created_at | timestamp | |
| updated_at | timestamp | |

#### Project Persons (join table)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| project_id | UUID | FK → Projects |
| person_id | UUID | FK → Persons |
| role | string | Optional, role within this specific project |
| notes | string | Optional |
| auto_extracted | boolean | Whether auto-detected from content |
| added_at | timestamp | |
| | | Unique constraint on [project_id, person_id] |

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

This is the primary workspace. It has **four tabs**:

##### Tab 1: Knowledge Base (default)

- Renders all completed markdown summaries for the project, concatenated
- Each summary section shows:
  - Source filename as heading (clickable, switches to Source Files tab)
  - Generated date
  - The rendered markdown content
- Sections separated by horizontal rules
- **Header area** shows:
  - Project name and description
  - "Upload File" button (prominent)
  - "Import Transcript" button (Otter import dialog)
  - Last updated timestamp
  - Link to Activity Log
- If no summaries yet, show empty state with upload prompt
- **Project Overview Editor**: inline editable markdown overview section

##### Tab 2: Summaries

- List/table of all markdown summaries
- Columns: Source filename (clickable), status badge, uploaded by, generated date, token count, truncated flag
- "Re-process" button per summary (re-queues LLM job for that source file)
- Status badges: queued (yellow), processing (blue/spinner), complete (green), failed (red)

##### Tab 3: Source Files

- List/table of all uploaded source files
- Columns: Filename, file type, file size, uploaded by, uploaded date
- Actions: View Summary, Download, Re-process, Delete
- Delete button (deletes source file AND associated summary)

##### Tab 4: People

- List/table of all people linked to the project
- Columns: Name, Email, Organization, Role, Source (auto/manual badge), Added date
- **"Add Person"** button → opens dialog with fields: name, email, organization, role, notes
- Edit and Remove buttons per person
- Auto-extracted people (from Otter speakers, email senders) show "auto" badge
- Manually added people show "manual" badge

#### 4. Upload Flow (within Project Detail)

- **"Upload File" button** opens upload interface
- Drag-and-drop zone OR file picker
- Accepted file types: `.txt`, `.vtt`, `.srt`, `.pdf`, `.md`
- On upload:
  - File stored to Vercel Blob
  - Source File record created in DB (ingest_source: "manual_upload")
  - Processing Job + Markdown Summary created with status `queued`
  - Background job triggered via Inngest
  - UI shows toast confirmation

#### 5. Otter Transcript Import (within Project Detail)

- **"Import Transcript" button** opens import dialog
- Fields: Meeting title (required), Transcript text (required), Speakers (comma-separated, optional), Meeting date (optional)
- On submit: POSTs to `/api/ingest/otter`, creates SourceFile with ingest_source "otter", speakers auto-extracted as People
- Reuses existing Inngest processing pipeline

#### 6. Activity Log (`/projects/[id]/activity`)

- Chronological list of all actions on the project
- Shows: action type, filename/person name, user, timestamp

#### 7. Prompt Templates (`/prompts`)

- CRUD interface for managing LLM prompt templates
- One template can be marked as default
- Templates use `{{filename}}`, `{{fileType}}`, `{{people}}`, `{{extractedText}}` placeholders

---

### People/Contacts System

People are linked to projects to provide context for LLM summaries and to track stakeholders.

#### Sources of People
- **Manual**: Added via the People tab in the project detail UI
- **Auto-extracted from Otter**: Speaker names from imported transcripts
- **Auto-extracted from email** (planned): Sender and attendees from ingested emails

#### People Context in LLM Prompts
When generating summaries, the LLM receives a `PROJECT PEOPLE` section listing all known people for the project (name, email, role, organization). This helps the LLM:
- Use correct name spellings
- Understand roles and organizational context
- Provide appropriately detailed summaries

#### Deduplication
People are deduplicated by email address first (if provided), then by case-insensitive name match within the project.

---

### Otter.ai Integration

#### Zapier Webhook (primary)
- Set up a Zapier zap: "When new Otter call completes → POST to PRISM webhook"
- Endpoint: `POST /api/ingest/otter`
- Auth: Bearer token (`INGEST_SECRET` env var)
- Body: `{ projectId, transcript, title, speakers?, meetingDate? }`
- Speakers are auto-extracted as People linked to the project
- Transcript is stored as a SourceFile and processed through the standard LLM pipeline

#### Manual Import (complement)
- "Import Transcript" dialog in the project detail UI
- Users can paste transcript text from Otter's export
- Same endpoint and processing as the Zapier webhook

---

### Email Ingestion (Planned — Not Yet Built)

#### Design
- **SendGrid Inbound Parse** with wildcard subdomain routing
- MX record: `inbound.prism.app` → `mx.sendgrid.net`
- Each project gets a unique `email_alias` (auto-generated slug)
- Emails to `slug@inbound.prism.app` are POSTed to `/api/ingest/email`
- Auth: shared secret as query param

#### What Gets Processed
- Email body (subject + text) → SourceFile of type "email"
- Supported attachments (.txt, .vtt, .srt, .pdf, .md, .ics) → individual SourceFiles
- Calendar invites (.ics) → parsed for event details, attendees extracted as People
- Sender auto-extracted as a Person

#### Schema Support (already in place)
- `email_alias` field on Projects table
- `email` and `ics` values in FileType enum
- `email_ingested` value in ActivityAction enum
- `ingest_source` field on SourceFile table

---

### LLM Transformation Pipeline

#### Job Execution Flow

1. Inngest `"file/uploaded"` event fired on any ingestion (upload, email, Otter)
2. Worker function retrieves source file from Vercel Blob
3. Text extraction based on file type:
   - `.txt`, `.md`: read directly
   - `.vtt`, `.srt`: parse and strip timestamps, extract speaker labels and dialogue
   - `.pdf`: extract text (use `pdf-parse` npm package)
   - `.email`: strip quoted reply chains and signatures (planned)
   - `.ics`: parse VEVENT fields into readable text (planned)
4. Check text length against context window limit
   - **If text exceeds limit**: truncate to fit, set `truncated = true`
   - **Truncation warning**: prepended to the generated summary
5. Fetch project people and build people context section
6. Construct prompt using template with placeholders
7. Call Claude API (Sonnet 4)
8. On success: store markdown to Blob + DB, update status to `complete`
9. On failure: store error message, update status to `failed`, allow retry

#### Prompt Template

```
You are a professional knowledge curator. Transform the following source content into well-structured markdown notes suitable for use as reference material in an AI assistant's project knowledge base.

SOURCE FILE: {{filename}}
FILE TYPE: {{fileType}}
{{people}}
INSTRUCTIONS:
- Create clear, scannable markdown with appropriate headings
- For meeting transcripts: extract key discussion points, decisions, action items, and next steps
- For documents: summarize main themes, key data points, and conclusions
- For all content: preserve important specifics (names, dates, numbers, technical details)
- Use bullet points for lists of items
- Use blockquotes for important quotes or callouts
- Omit filler, tangents, and redundant content
- If the content includes participants/speakers, list them at the top
- Use the correct spelling of people's names as provided in the project people list above
- Target output length: roughly 20-30% of source length (concise but comprehensive)

SOURCE CONTENT:
{{extractedText}}
```

The `{{people}}` placeholder is replaced with a `PROJECT PEOPLE:` section listing all known people for the project, or removed if no people are linked.

#### Context Window Management

- **Model**: Claude Sonnet 4 — 200K context window
- **Budget**: Reserve 4,000 tokens for system prompt + output
- **Max input**: ~180,000 tokens (conservative estimate)
- **Character estimate**: ~720,000 characters of source text
- **Truncation strategy**: truncate from the end, preserve the beginning of the document
- **Token counting**: Simple character-based estimate (4 chars ≈ 1 token)

---

### API Routes

All API routes are Next.js App Router route handlers (`/app/api/...`).

#### Projects

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/[id]` | Get project detail with counts |
| PUT | `/api/projects/[id]` | Update project name/description/overview |
| DELETE | `/api/projects/[id]` | Delete project and all children |

#### Source Files

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/files` | List source files for project |
| POST | `/api/projects/[id]/files` | Upload file (multipart form) |
| DELETE | `/api/projects/[id]/files/[fileId]` | Delete file and summary |
| POST | `/api/projects/[id]/files/[fileId]/reprocess` | Re-queue processing |

#### Summaries

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/summaries` | List summaries for project |
| GET | `/api/projects/[id]/summaries/[summaryId]` | Get single summary |

#### Knowledge Base

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/knowledge-base` | Get compiled markdown (all summaries) |

#### People

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/people` | List people linked to project |
| POST | `/api/projects/[id]/people` | Add person to project |
| PUT | `/api/projects/[id]/people/[personId]` | Update person details/role |
| DELETE | `/api/projects/[id]/people/[personId]` | Remove person from project |

#### Activity

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[id]/activity` | List activity log for project |

#### Prompt Templates

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/prompt-templates` | List all templates |
| POST | `/api/prompt-templates` | Create template |
| PUT | `/api/prompt-templates/[id]` | Update template |
| DELETE | `/api/prompt-templates/[id]` | Delete template |

#### Ingestion Webhooks

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ingest/otter` | Otter/Zapier webhook — accepts transcript + metadata |
| POST | `/api/ingest/email` | SendGrid inbound parse webhook (planned) |

---

### Error Handling

- **Upload errors**: Toast notification with error message, file not stored
- **Processing failures**: Status set to `failed` with error message visible in UI, retry button available
- **LLM API errors**: Catch rate limits, timeouts, and API errors; store in error_message; auto-retry once via Inngest retry policy
- **Truncation**: Not an error — handled gracefully with warning banner on the summary
- **Webhook auth failures**: Return 401, do not process

---

### Data Lifecycle & Deletion

- **Delete source file**: also deletes associated markdown summary, blob files, and processing jobs
- **Delete project**: cascading delete of all source files, summaries, jobs, people links, and blob files
- **Remove person from project**: deletes the ProjectPerson link only, not the Person record
- **No soft delete** — hard deletes only

---

### Future-Proofing (Design For, Don't Build Yet)

1. **Multi-user / Auth**: User ID fields exist in schema but are nullable/unused
2. **Google Docs sync**: Knowledge Base compilation logic is isolated for future sync agent
3. **Verbosity/style settings**: Fields exist on MarkdownSummary but hardcode defaults
4. **Additional file types**: `.docx` and `.pptx` — extraction logic is modular (one function per type)
5. **Per-project Google Doc URL**: Fields exist on Projects table (nullable, unused)
6. **Direct Otter API**: OAuth2.0 flow for browsing/importing transcripts directly (requires Otter API access)

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
INGEST_SECRET=          # Shared secret for webhook authentication (Otter, email)
NEXT_PUBLIC_INGEST_SECRET=  # Client-side copy for manual import UI
```

---

### Deployment Notes

- Deploy to **Vercel** via GitHub repo connection
- Vercel Postgres and Vercel Blob provisioned via Vercel dashboard
- Inngest connected via Vercel integration (or self-hosted URL)
- Prisma migrations run via `prisma migrate deploy` in build step
- Pro plan provides 300s function timeout for LLM processing routes

---

### Out of Scope

- Authentication / authorization
- Google Docs integration (stubbed)
- Content curation / compression / decay
- Multi-project content sharing
- Version history
- Search / filtering
- Notifications beyond toast messages
- .docx and .pptx file support
- Custom LLM model selection
- Verbosity / style configuration in UI
- Direct Otter API integration (using Zapier webhook instead)
