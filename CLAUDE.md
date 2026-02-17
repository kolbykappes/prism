# PRISM — Claude Code Instructions

## Spec Maintenance
- The MVP spec lives at `project-spec.md`. When implementing new features, modifying existing behavior, or changing the data model, update `project-spec.md` to reflect the current state of the application.
- Keep the spec as the single source of truth for what PRISM does today — not just what was originally planned.

## Environment
- Development is on **Windows**. Use Windows-compatible commands and path syntax (backslashes, no Unix-only tools). When using bash shell, prefer forward slashes and Unix-style redirects only if the shell supports it (e.g., Git Bash).

## Logging & Error Handling
- Follow the standards in `docs/logging-standards.md` for all server and client error handling, logging patterns, and versioning.
