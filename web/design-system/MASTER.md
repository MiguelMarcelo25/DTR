# HRMS Design System — MASTER (source of truth)

"Refined Enterprise" — confident, professional, snappy. Built on Tailwind + ShadCN
tokens. Every page consumes these shared components & tokens; do not hard-code
colors or one-off inputs.

## Tokens (use semantic classes, never raw hex)
- Surfaces: `bg-background` (app), `bg-card` (panels), `bg-muted` (subtle).
- Brand: `bg-primary text-primary-foreground` (indigo). Accent tint: `bg-accent text-accent-foreground`.
- Semantics: `text-success`, `text-warning`, `text-destructive` (+ `/foreground`, `/10` tints).
- Text: `text-foreground` (primary), `text-muted-foreground` (secondary). Never lighter than muted-foreground for body.
- Borders: `border-border`. Radius: `rounded-lg` (cards/inputs), `rounded-md` (controls), `rounded-full` (pills).
- Shadows: `shadow-soft` (inputs), `shadow-card` (cards/popovers), `shadow-pop` (modals/menus).
- Sidebar uses its own dark tokens: `bg-sidebar text-sidebar-foreground` etc. (do not reuse elsewhere).

## Typography
- Font: Plus Jakarta Sans (loaded globally). Headings get `font-display tracking-tight` automatically.
- Numbers in tables/money/stats: rely on global tabular-nums (tables already set).

## Motion (snappy, 150–220ms)
- Transitions: `transition-colors`/`transition-all duration-200`.
- Entrances: `animate-fade-up` for page sections (stagger with inline `style={{animationDelay}}`), `animate-scale-in` for popovers/modals.
- Respect reduced motion; never animate layout-affecting props (use transform/opacity).

## Components — ALWAYS reuse these
- **Forms**: `@/components/ui/form` — `Form`, and field components `TextField`, `TextareaField`, `SelectField`, `NumberField`, `DateField`, `CheckboxField`, `SwitchField`. They render label + control + hint + error consistently and bind to react-hook-form via `control`/`name`. NEVER hand-roll `<label>+<input>+error` again.
- **Modal**: `@/components/ui/modal` — `Modal` (props: `open`, `onOpenChange`, `title`, `description`, `footer`, `size` sm|md|lg|xl). Use for ALL dialogs/forms-in-dialog instead of raw Dialog.
- **Table**: `@/components/shared/DataTable` — `DataTable<T>` with `Column<T>` (`key, header, render?, align?, width?, className?`), plus `toolbar`, `onRowClick`, `meta`, `onPageChange`. Sticky header by default.
- Primitives: `Button`, `Badge`, `Card*`, `StatusBadge`, `StatCard`, `PageHeader`, `EmptyState`, `ConfirmDialog`, `Skeleton`, `Avatar`, `Tabs`, `DropdownMenu`.

## Layout rules
- Page content wraps in `mx-auto max-w-7xl` with `space-y-6`; lead with `<PageHeader>`.
- Cards: `rounded-xl border bg-card shadow-soft`. Hover-interactive cards add `transition-shadow hover:shadow-card cursor-pointer`.
- Sticky chrome: sidebar + topbar are sticky/fixed; content scrolls. Sidebar scrollbar is hidden (`scrollbar-none`); inner panels use `scrollbar-thin`.

## Quality bar (enforced)
- Mobile responsive at 375 / 768 / 1024 / 1440; no horizontal scroll.
- Touch targets ≥ 40px; all clickable elements `cursor-pointer`; visible focus rings.
- Light + dark both correct; contrast ≥ 4.5:1; icons are Lucide SVG (no emojis).
- Loading → Skeleton; empty → `<EmptyState>`; async buttons disable + spinner.
