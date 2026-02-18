# UX & Design Guide

## Color Scheme

PRISM uses a **corporate navy blue** palette. All theme colors are defined as CSS custom properties in `src/app/globals.css` using oklch.

| Role | CSS Variable | Usage |
|---|---|---|
| **Primary** | `--primary` | Buttons, header background, links, active states |
| **Primary Foreground** | `--primary-foreground` | Text on primary backgrounds (white) |
| **Secondary** | `--secondary` | Secondary buttons, subtle backgrounds |
| **Muted** | `--muted` | Disabled states, background tints |
| **Muted Foreground** | `--muted-foreground` | Helper text, timestamps, metadata |
| **Destructive** | `--destructive` | Delete buttons, error states |
| **Accent** | `--accent` | Hover backgrounds, highlighted rows |
| **Border** | `--border` | Table borders, card borders, dividers |

Do **not** use raw hex/rgb colors. Always reference the theme variables via Tailwind classes (`bg-primary`, `text-muted-foreground`, etc.) so the palette stays consistent.

## Icons

- **Library:** [Lucide React](https://lucide.dev) — already installed, tree-shakeable, 1500+ icons.
- **Import pattern:** `import { IconName } from "lucide-react";`
- **App icon:** Lightbulb (`<Lightbulb />`) — used in the header and as the browser favicon (`src/app/icon.svg`).
- **Sizing:** Default `size-4` inside buttons (handled by button base styles). Use `h-5 w-5` or `h-6 w-6` for standalone icons.
- Do **not** install additional icon libraries. Lucide covers all needs.

## Components

All UI primitives come from **shadcn/ui** in `src/components/ui/`. Do not create custom low-level components when a shadcn equivalent exists.

### Buttons
- **Default (navy):** Primary actions — "Upload", "Save", "Add Person"
- **Outline:** Secondary actions — "Import Transcript", "Download", "Re-process"
- **Destructive:** Dangerous actions — "Delete", "Remove"
- **Ghost:** Subtle actions — inline remove/clear, icon-only toggles
- Always place an icon before the label: `<Button><Upload /> Upload File</Button>`

### Dialogs
- Use for create/edit forms that don't warrant a full page.
- Always include `DialogHeader` with a `DialogTitle`.
- Reset form state when dialog closes via `onOpenChange`.
- The X close button **must** have a visible background hover state. The base `dialog.tsx` handles this with `hover:bg-accent hover:text-accent-foreground` — do not override or remove it.

### Tables
- Use shadcn `Table` components for list views (files, summaries, people).
- First column should be the primary identifier (filename, name) in `font-medium`.
- Action buttons go in the last column, right-aligned via `flex gap-2`.

### Toasts
- Use `sonner` via `toast.success()` / `toast.error()`.
- Success: short confirmation — "File uploaded, processing started".
- Error: show server detail when available — `toast.error(data.detail || data.error || "Fallback message")`.

### Empty States
- Use `<EmptyState title="..." description="..." />` when a list has no items.
- Keep copy short and actionable.

## Patterns

### Interactive elements must have `cursor-pointer`
The shadcn `Button` component includes `cursor-pointer` in its base styles. When creating other clickable elements (links styled as buttons, clickable table rows, etc.), always add `cursor-pointer` explicitly.

### Form inputs should feel lightweight
- Focus rings are **1px** with **30% opacity** (`focus-visible:ring-[1px] ring-ring/30`). This is intentionally subtle — do not increase ring width or opacity.
- Inputs use the `border-input` color which has a slight blue tint.

### Spacing
- Page content lives in a `container mx-auto px-4 py-8` wrapper.
- Use `space-y-4` for vertical form field stacking.
- Use `gap-2` for inline button groups.
- Use `mb-4` to separate action bars from content below.

### Status indicators
- Use `<Badge>` for inline status labels (auto/manual, processing status).
- Use `<StatusBadge>` (custom component) for processing status with color coding.

## Anti-patterns

- **No invisible hover states.** All clickable non-Button elements (X close buttons, icon-only buttons, styled links) must have a visible hover state. Use `hover:bg-accent hover:text-accent-foreground` for icon buttons — an opacity change alone is not sufficient.
- **No raw colors.** Never use `bg-blue-500` or `text-gray-600`. Use theme variables.
- **No extra icon libraries.** Don't add Font Awesome, Heroicons, etc.
- **No empty catch blocks.** Always `catch (error)` and log it (see `docs/logging-standards.md`).
- **No heavy focus rings.** Don't increase ring width past 1px on inputs/textareas.
- **No confirm() for non-destructive actions.** Only use `confirm()` for delete/remove operations.
- **No full-page forms.** Use Dialogs for create/edit workflows that are under ~6 fields.
- **No custom button styles.** Use shadcn Button variants. If you need a new look, it probably maps to an existing variant.
