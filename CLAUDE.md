# ShootFlow — rules for Claude Code

ShootFlow is a multi-tenant web app (PWA) for portrait photographers: shoot planning with the client
through a token link, a live shot list on set, proofing (selection for retouching) and final delivery.

The approved plan lives in the claude.ai Project as `claude/implementation-plan.md`; the full design
document is https://claude.ai/artifact/3F5uo5TRoXrSexbnjWPfFE. Where they disagree with older specs,
the plan wins.

## How to work

- Build the plan's 13 steps strictly in order. A step is done only when `pnpm check`, `pnpm build`,
  `pnpm test:e2e` and every acceptance criterion of that step pass.
- End each step with a short report: what was built, what was verified, which decisions you made.
- Anything the plan does not settle is agreed with the owner before it is implemented.

## Stack

Next.js (App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui (new-york, stone) · Lucide ·
next-intl (ru/en, no locale in the URL) · TanStack Query + Server Actions · Zod · Supabase
(Postgres + RLS, Auth, pg_cron, Realtime) · Cloudflare R2 · Vercel · Vitest · Playwright · pnpm.

## Non-negotiable rules

1. **No user-facing strings in components.** Every word comes from `messages/ru.json` and
   `messages/en.json` via next-intl. Both files always have the same keys (`pnpm i18n:check`).
2. **RLS on every table**, enabled in the same migration that creates it. Tenant isolation is by
   `workspace_id`. Never ship a table without a policy and a test that another workspace cannot see it.
3. **Store R2 object keys, never URLs.** URLs are signed on demand (10–60 min).
4. **Client portal handlers** (`/api/p/[token]/...`) check the token (and PIN session) on the first
   line and act only inside that token's `project_id`. Data hidden from the client is filtered on the
   server, never just hidden in the UI.
5. **Dates and times** are shown in the project's time zone (`Project.timezone`), formatted with `Intl`.
6. **Project status changes** go only through `transition_project_status`; no direct updates.
7. **Secrets** live in environment variables validated in `src/lib/env.ts`; `.env*` files stay out of git
   (except `.env.example`).

## Conventions

- Server Components by default; `"use client"` only where interaction needs it.
- Imports use the `@/` alias for `src/`. Type-only imports use `import type`.
- UI primitives live in `src/components/ui` (shadcn style); feature components next to their route.
- Tests: unit tests beside the code as `*.test.ts(x)`; end-to-end tests in `e2e/`.
- Mobile first: every screen must work at 375 px wide with no horizontal scroll, in both themes.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on http://localhost:3000 |
| `pnpm check` | Lint, typecheck, translation keys, unit tests |
| `pnpm build` | Production build |
| `pnpm test:e2e` | Playwright on desktop (1440 px) and mobile (Pixel 7) |
