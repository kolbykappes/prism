# PRISM — Claude Code Instructions

## Spec Maintenance
- The MVP spec lives at `project-spec.md`. When implementing new features, modifying existing behavior, or changing the data model, update `project-spec.md` to reflect the current state of the application.
- Keep the spec as the single source of truth for what PRISM does today — not just what was originally planned.

## Environment
- Development is on **Windows**. Use Windows-compatible commands and path syntax (backslashes, no Unix-only tools). When using bash shell, prefer forward slashes and Unix-style redirects only if the shell supports it (e.g., Git Bash).

## Logging Standards

### Server-Side (API Routes, Inngest Functions)
- Use `import { logger } from "@/lib/logger"` — never raw `console.error`.
- Log events with dot-namespaced names: `logger.error("files.upload.failed", { error, projectId })`.
- Pass `Error` objects as `{ error }` — the logger auto-extracts `.message` and `.stack`.
- Inngest send failures are warnings, not errors: `logger.warn("inngest.send.failed", ...)`.
- Pass error detail to `errorResponse`: `errorResponse("Failed to X", 500, error instanceof Error ? error.message : "Unknown error")`.
- All API route handlers must be wrapped in try/catch.

### Client-Side (React Components)
- Catch blocks must capture the error: `catch (error)` — never empty `catch {}`.
- Log with context tag: `console.error("[upload]", error)`.
- Show `detail` from API responses in toasts: `toast.error(data.detail || data.error || "Fallback")`.
- When the API response might not be JSON, guard with `.catch(() => ({}))`.

### Versioning
- `src/lib/version.ts` exports `APP_VERSION`. Bump manually with each deploy.
- Version is displayed in the layout footer as "PRISM v{version}".
