# Spec Sync

Audit `project-spec.md` against the actual codebase and report drift. Do not make any changes — only report findings.

## What to Check

### 1. Data Model
- Read `prisma/schema.prisma`
- Compare every model and field against the **Data Model** tables in `project-spec.md`
- Flag: fields in schema missing from spec, fields in spec missing from schema, type mismatches, enum value differences

### 2. API Routes
- Glob `src/app/api/**/route.ts` to find all existing route handlers
- For each file, note its HTTP methods (GET, POST, PUT, DELETE)
- Compare against the **API Routes** tables in `project-spec.md`
- Flag: routes that exist in code but not in spec, routes in spec but not in code, method mismatches

### 3. Pages
- Glob `src/app/**/page.tsx` to find all existing pages
- Compare against the **Pages & UI** section in `project-spec.md`
- Flag: pages that exist but aren't documented, pages documented but not implemented

### 4. Ingestion Sources & File Types
- Check `FileType` and `IngestSource` enums in the schema against what's documented

## Output Format

Report findings grouped by category. For each item, state:
- What the spec says
- What the code actually has
- Whether it's **undocumented** (in code, not in spec) or **unimplemented** (in spec, not in code)

If everything matches, say so. Keep the report concise — one line per discrepancy.
