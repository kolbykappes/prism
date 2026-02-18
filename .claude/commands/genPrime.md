# Regenerate /prime

Regenerate `.claude/commands/prime.md` to reflect the current state of the codebase.

## Steps

1. Read these files to understand the current state:
   - `CLAUDE.md`
   - `project-spec.md`
   - `docs/ux-guide.md`
   - `docs/logging-standards.md`
   - `docs/deployment-guide.md`

2. Scan the directory structure:
   - `src/app/api/` — note any new or removed route groups
   - `src/lib/` — note key libraries
   - `src/inngest/functions/` — note background job files
   - `prisma/schema.prisma` — note the tech stack in use

3. Rewrite `.claude/commands/prime.md` following these rules:
   - One-sentence project description at the top
   - "Read These First" section: list the docs with one-line descriptions of what each governs
   - "Stack" section: single line of techs, no version numbers unless they matter
   - "Key Paths" section: only the directories/files that aren't obvious from the structure
   - "Critical Conventions" section: only rules that are non-obvious and not fully covered in the docs (logging import, delete strategy, git policy, etc.)
   - Do NOT duplicate content that lives in the referenced docs
   - Keep total length under ~40 lines
