<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Life RPG — project conventions

Read [spec.md](spec.md) (v2) and [PLAN.md](PLAN.md) before touching business logic.

## Architecture

```
src/domain/     Plain TS. Do NOT import Drizzle / tRPC / Next. Tests live here.
src/server/db/  Drizzle schema + client
src/server/services/  open transactions, call domain/. The only place allowed to write to the DB.
src/server/trpc/      routers — validate input and call services, nothing else
src/app/        UI
src/config/current-user.ts   the ONLY place userId comes from (replaced by auth in Phase 5)
```

## Non-negotiable rules

1. `src/domain/` must not import anything that knows about the database.
2. Every operation touching XP / streak / reward must live in ONE transaction (spec §28).
3. XP goes through the `xp_transaction` ledger. Never `player.totalXp += n` (§10.3).
4. `level` is computed from `totalXp`; it is not the source of truth (§7.1).
5. Streaks run on `LocalDate` in the user's timezone and decay on READ — there is no cron (§11).
6. A new reward must snapshot `baselineValue` at creation time (§14.2).
7. `evaluateAndUnlock` only considers `LOCKED` rewards — otherwise it emits duplicate notifications (§26).
8. A `CLAIMED` reward never reverts on undo (§10.2).
9. Changing a game rule means changing the test first.

## Commands

```bash
docker compose up -d   # local Postgres
pnpm db:push           # push the schema
pnpm db:seed           # dev user + sample data
pnpm dev
pnpm test              # unit (domain) + integration (needs DATABASE_URL)
pnpm typecheck
```

## UI (Phase 3+)

Design source: `Life RPG.dc.html` (Claude Design). When changing the UI:

- **Never hardcode colors.** Use tokens: `bg-surface`, `text-ink-2`, `border-line`,
  `shadow-e1`, `bg-easy-bg`… Tokens are defined in `src/app/globals.css` and mapped
  to Tailwind via `@theme inline`, so they follow light/dark automatically.
- **No inline `style`** unless the value is genuinely dynamic (width as a %,
  conic-gradient by angle, heatmap color computed with `color-mix`).
- **Keep every `data-testid`.** They are the contract with the 5 e2e tests — change
  the UI freely but keep the testids, so that change itself has a safety net.
- Fonts: `font-sans` for text, `font-display` for **numbers** (level/XP/streak),
  `font-mono` for shortcut keys. Numeric values always carry the `tnum` class.
- UI state lives in `src/lib/store.ts` (zustand). Server state goes through TanStack Query.
