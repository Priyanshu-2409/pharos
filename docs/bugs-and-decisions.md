# Bugs & Decisions — Pharos

## Better Auth version pin (1.6.23)
- 1.6.22 shipped with a broken `kAPIErrorHeaderSymbol` export from `better-call`, crashing on import.
- Pinned to `1.6.23`. Don't unpin without testing.

## Express 5 wildcard route syntax
- Express 5 changed wildcard syntax from `'*'` to `*splat` for named parameters.
- `app.all('/api/auth/*splat', toNodeHandler(auth))` gave 404s.
- Fix: mount Better Auth via `app.use('/api/auth', toNodeHandler(auth))` instead of `app.all(...)`. Cleaner and version-independent.

## Better Auth session endpoint renamed
- Pre-1.6: `GET /api/auth/session`. Post-1.6: `GET /api/auth/get-session`. Same behavior.

## Prisma 6 generated client output path (monorepo)
- Default output blocked by Prisma. `../node_modules/.prisma/client` broke pnpm workspace resolution.
- Fix: `output = "../src/generated/client"` inside the package, with explicit `.js` import from `'./generated/client/client.js'`.
- Lesson: in monorepos, keep generated code inside the package's own `src/`, not in shared `node_modules`.

## pnpm and transitive type packages
- `@types/express` depends on `@types/express-serve-static-core`, but pnpm keeps transitive types hidden from direct imports.
- Symptom: `Invalid module name in augmentation, module 'express-serve-static-core' cannot be found`.
- Fix: `pnpm add -D @types/express-serve-static-core --filter @pharos/api`.

## Windows filesystem case-insensitivity
- File saved as `requireauth.ts`, imported as `requireAuth.ts`. Runs locally on Windows, TypeScript flags it, would fail at runtime on Linux (Railway prod).
- Direct rename ignored by Windows. Two-step rename via temp name required: `git mv X _X.ts && git mv _X.ts X.ts`.
- Prevention: pay attention to import capitalization on Windows dev; CI on Linux would catch this earlier.

## `apps/api/package.json` accidentally emptied
- File was zeroed out during a save. `pnpm install` reported "Already up to date" — misleading, since it found no dependencies to install.
- Recovery: `git restore apps/api/package.json`.
- Lesson: when pnpm output looks suspiciously empty, check the package.json isn't corrupted.

## Commit hygiene — `git add .` bundled feat + chore
- Ran `git add .` between the middleware feature work and the types package fix; ended up with one commit containing both.
- Not corrected via history rewrite (small stakes, unpushed doesn't matter enough).
- Lesson: for clean history, `git add <specific files>` per logical commit, or `git add -p` for chunk-level control.

## Decisions locked for Phase 8
- Better Auth lives in the API only, not the Next.js app.
- Cookies on `localhost:4000` in dev, CORS credentials enabled from `localhost:3000`.
- Both email/password and GitHub OAuth planned (OAuth deferred).
- Sessions: 30-day expiry, refresh cookie if older than 1 day.
## Docker Desktop reset — container lost, volume survived
- Docker Desktop reset between sessions wiped `pharos-postgres` container and cached image.
- Volume `pharos_pg_data` persisted (volumes and containers are independent lifecycles in Docker).
- Recovery: added `docker-compose.yml` at repo root with `postgres:16` service and `external: true` volume reference to reuse existing data.
- Data (Elon user, sessions, schema) intact after recreation.
- **Lesson:** always start with docker-compose, not `docker run`. Volumes need explicit re-attachment on container recreation, and compose makes it declarative.

## Monitor schema — deferred fields kept, not removed
- V1 spec called for 4 fields. Existing schema had 15 (method, headers, body, timeoutMs, expectedStatus, expectedBodyMatch etc).
- Decision: **do not shrink the schema.** Optional fields with sensible defaults cost nothing at rest, and removing then re-adding requires migrations.
- Ignore the extra fields in V1 routes and UI. Populate them in Phase 10.5 when the UI grows.

## Zod default values
- `intervalSeconds: z.number().int().min(30).max(3600).default(300)` — if field omitted from request, Zod fills 300 automatically.
- Verified in Test 2 (created GitHub without interval, got 300 in response).
- Useful for reasonable defaults without forcing every field in every request.

## Ownership check baked into query, not separate step
- Considered: `findUnique({ where: { id }})` then `if (monitor.userId !== req.user.id) return 403`.
- Chose: `findFirst({ where: { id, userId: req.user.id }})` returning null → treat as 404.
- Reasons:
  1. Fewer lines, fewer places for logic gaps
  2. Race-condition safer (no gap between fetch and check)
  3. Consistent 404 response for both "doesn't exist" and "not yours" — no info leak (IDOR defense)
- Applied uniformly to PATCH and DELETE.

## Express `req.params` typed as string | string[]
- @types/express types `req.params.id` defensively — some routing edge cases can put arrays there.
- Prisma's `where: { id }` expects strictly a string.
- TypeScript flagged 4 assignability errors on our PATCH/DELETE handlers.
- Fix chosen: `const id = req.params.id as string;` — type assertion justified by the fact that `/:id` single-segment routes always return string in practice.
- Alternative (more paranoid): `if (typeof id !== "string") return 400` — deferred as overkill for single-segment routes.

## Postman needs `Origin` header for state-changing endpoints
- Recurring gotcha. Every POST/PATCH/DELETE via Postman needs `Origin: http://localhost:3000` header manually.
- Real browsers auto-attach it. Postman doesn't.
- Better Auth rejects with `MISSING_OR_NULL_ORIGIN` otherwise.

## Session cookies vs Postman between sessions
- Postman cookie jar can be cleared by app restarts, machine reboots, or long gaps between use.
- If a request unexpectedly returns 401 after a break, first check: hit `/api/me`. If also 401, re-log in via `/api/auth/sign-in/email` before assuming a bug.

## Windows case-insensitivity — third occurrence
- Component files created as PascalCase, but TypeScript flagged case mismatches when imports referenced them.
- Same two-step `git mv` trick from Phase 8.
- Consider this a recurring pattern until we move to WSL2 or add pre-commit hooks that check file casing.

## Global CSS collided with inline component styles
- Modal appeared as invisible white-on-white because global dark theme leaked into inline-styled components.
- Fix: explicit `color: "black"` and `border: "1px solid #ccc"` on modal + inputs.
- **Real fix (deferred):** proper design system with theme tokens. Phase 15 (polish) work.
- Lesson: inline `style` doesn't shield from inherited CSS. Only proper CSS modules or shadow DOM would.

## Docker healthcheck vs "container running"
- `docker ps` shows a container as "Up" the moment the process starts, but Postgres takes 5-15 more seconds to be query-ready.
- The `healthcheck` block in compose runs `pg_isready` every 5 seconds and reports "healthy" status.
- Downstream services (API, worker) can `depends_on: { postgres: { condition: service_healthy }}` to wait properly. Deferred to Phase 11 when the worker comes online.