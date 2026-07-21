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