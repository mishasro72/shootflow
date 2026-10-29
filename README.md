# ShootFlow

Web app for portrait photographers: plan a shoot with the client through one link, run the shot list
on set, let the client pick photos for retouching, and deliver the final gallery.

## Requirements

- Node.js 20.9 or newer (22 recommended)
- pnpm 10 (`corepack enable` picks the version from `package.json`)

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

## Checks

```bash
pnpm check        # lint, typecheck, translation keys, unit tests
pnpm build        # production build
pnpm test:e2e     # end-to-end tests (run `pnpm exec playwright install chromium` once)
```

CI runs all of these on every push and pull request.

## Project rules

See [CLAUDE.md](./CLAUDE.md).
