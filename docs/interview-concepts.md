# Interview Concepts — Pharos

## Sessions vs JWTs
- **Sessions:** server stores a Session row in DB, client holds only a random session ID in a cookie. Every request the server looks up the ID to verify.
  - Pro: instant revocation ("log out all devices" just deletes the row).
  - Con: one DB read per authenticated request.
- **JWTs:** signed token contains user ID + expiry, verified by signature alone. No DB call.
  - Pro: stateless, faster, easier horizontal scaling.
  - Con: can't invalidate before expiry without extra machinery (blocklists defeat the point).
- Pharos uses DB-backed sessions via Better Auth because revocation matters more than the per-request DB cost at our scale.

## "Logged in" is not a state, it's a per-request decision
- No persistent "logged in" flag exists anywhere.
- On every request: server reads cookie → looks up session in DB → checks `expiresAt > NOW()` → attaches user or returns 401.
- Implications: deleting a session row logs you out instantly (client still has cookie but next check fails). Cookie theft = full account access until the session expires or is revoked.

## Input validation as first line of defense
- Before hashing, DB writes, or any real work — reject malformed input with 400.
- Checks: field presence, format (regex-ish for email), length constraints, correct Content-Type.
- Principle: never trust the client. Every incoming payload could be malformed or hostile.

## Password hashing (scrypt, one-way)
- Plaintext passwords are never stored. Better Auth hashes with scrypt on signup.
- Hashing is one-way — mathematically infeasible to reverse. A DB breach exposes hashes, not passwords.
- Login re-hashes the submitted password with the stored salt and compares hashes.

## User / Account / Session — why they're three tables
- **User:** identity ("this person exists").
- **Account:** how they authenticate (email/password credential, or GitHub OAuth, etc). Multiple accounts per user enables "add GitHub sign-in to existing account" without duplicating the user.
- **Session:** active login instance (userId + expiry + userAgent). Many sessions per user = phone + laptop + tablet.

## Session token vs Session ID
- `session.token` is what the cookie carries (client-facing).
- `session.id` is the DB primary key (server-facing).
- Kept separate so a token can be rotated without rewriting foreign keys, and internal lookups don't require exposing the token.

## Middleware and the Express pipeline
- Express handles each request as a chain of `(req, res, next)` functions.
- Each middleware can inspect/mutate `req`, respond to end the chain, or call `next()` to pass on.
- Auth middleware runs before the route handler — if the session is invalid, it responds with 401 and the handler never executes. The route is structurally unreachable without valid auth, not just "protected by convention."
- Write auth once, apply to any route with one line: `app.get('/api/me', requireAuth, handler)`.

## TypeScript module augmentation
- `declare module "express-serve-static-core" { interface Request { user?: ... } }` extends third-party types with your own additions.
- After augmentation, `req.user` is typed everywhere in the codebase with autocomplete.
- Requires the target module to be a **direct** dependency in `package.json` — transitive-only doesn't work under pnpm's strict layout.

## CORS with credentials — the two-switch model
- CORS is a browser-enforced policy. Cross-origin requests strip cookies by default (CSRF defense).
- Two opt-ins required for cookies to flow across origins:
  1. **Server side:** `cors({ credentials: true })` → sends `Access-Control-Allow-Credentials: true` header.
  2. **Client side:** fetch call includes `credentials: "include"`. Better Auth React client sets this automatically.
- **Hard rule:** `Access-Control-Allow-Origin: *` (wildcard) is forbidden with credentials. Must be a specific named origin. If both were allowed, any site could make authenticated requests using stolen cookies. Wildcard exists for public APIs where cookies aren't relevant.

## Origin header defense against CSRF
- Browsers auto-attach `Origin: <requesting-site>` to state-changing cross-origin requests. JavaScript cannot forge or remove it.
- Better Auth checks `Origin` on POSTs like `/sign-out`. If not in `trustedOrigins`, returns 403 `MISSING_OR_NULL_ORIGIN`.
- Postman doesn't auto-send Origin — must be added manually. Real browsers always do.

## Client component vs server component (Next.js App Router)
- Default = server component: rendered on server, no hooks, no event handlers, no state.
- `"use client"` directive = client component: renders in browser, can use `useState`, `useEffect`, event handlers.
- Anything using auth hooks (`useSession`), form state, or interactivity must be a client component.

## Controlled vs uncontrolled inputs
- Controlled: React state owns the value, every keystroke updates via `onChange`. Standard for validation/transformation.
- Uncontrolled: DOM owns the value, read via `ref` on submit. Simpler but less flexible.

## Client-side auth is UX, server-side auth is security
- Client-side session checks (via `useSession()`) prevent UI flashes and enable redirects — they are **not** security.
- Any user can bypass client-side checks by disabling JavaScript or hitting API endpoints directly.
- Real security lives in the API's `requireAuth` middleware, which gates the actual data.
- Together: server enforces the truth, client provides the polish.

## HttpOnly cookies
- `HttpOnly` cookies cannot be read by JavaScript (`document.cookie` skips them).
- Defends against XSS: even if an attacker injects JS onto your page, they can't steal the session token.
- Better Auth sets HttpOnly by default. Verify in DevTools → Application → Cookies.
## Authentication vs Authorization
- **Authentication:** "Who are you?" — verifying identity via password + session cookie.
- **Authorization:** "Are you allowed to do this?" — checking permissions on a specific resource.
- Pharos example: `requireAuth` middleware handles authentication (must be logged in). Query-level `where: { id, userId }` handles authorization (must own this monitor).
- Common failure mode: apps authenticate but forget to authorize per-resource, leading to IDOR bugs.

## IDOR (Insecure Direct Object Reference)
- Vulnerability where an API accepts a resource ID but doesn't verify the caller is allowed to access it.
- Attack: User B guesses/discovers User A's monitor ID and calls `DELETE /api/monitors/<A's-id>`. Without ownership check, it succeeds.
- OWASP Top 10 material. One of the most common real-world web app vulnerabilities.
- **Defense (Pharos pattern):** embed the ownership check IN the query:
```typescript
  prisma.monitor.findFirst({ where: { id, userId: req.user.id } })
```
  Returns null if not owned. No separate "check then act" step means no race condition or logic gap.
- **Response choice:** return 404, not 403. 403 leaks the fact that the ID exists. 404 is indistinguishable from a fake ID. Defense in depth.

## Zod runtime validation
- TypeScript types are erased at compile time — no runtime enforcement on incoming request bodies.
- Zod is a schema library that validates data at runtime. Schema doubles as a TypeScript type via inference.
- Pharos usage: every `POST`/`PATCH` route calls `schema.safeParse(req.body)` before touching DB.
- `.safeParse()` returns `{ success, data | error }` — cleaner than throwing.
- Errors are structured, so frontends can show per-field messages.
- Alternative libraries: Yup, Joi, ArkType. Zod is the modern default in TS ecosystems.

## HTTP status codes chosen deliberately
- `201 Created` on POST → new resource created
- `200 OK` on GET, PATCH → success with response body
- `204 No Content` on DELETE → success, no body to return
- `400 Bad Request` → validation failed (client sent bad data)
- `401 Unauthorized` → not authenticated
- `403 Forbidden` → authenticated but not allowed (rarely used in Pharos — we prefer 404 for IDOR reasons)
- `404 Not Found` → resource doesn't exist OR you don't have access
- Correct codes matter: they signal professional intent, and frontends can branch on status without parsing bodies.

## Express Router — organizational pattern
- `Router()` creates a mini-app that can be mounted under a prefix.
- Groups related routes in one file: `monitorsRouter` owns everything at `/api/monitors/*`.
- Middleware mounted on the router runs for every route in it: `monitorsRouter.use(requireAuth)` protects all monitor routes with one line.
- Adding a new route is automatically protected — no risk of forgetting `requireAuth` on individual handlers.

## The 404 flavor distinction (debugging pattern)
- **Route not found** (Express default): HTML response, "Cannot GET /path". Means URL doesn't match any registered route.
- **Resource not found** (your handler): JSON response with your error shape. Means route matched, but the specific resource doesn't exist.
- Reading which flavor you got tells you which layer the mismatch is in.

## TypeScript non-null assertion (`!`) and when it's OK
- `req.user!.id` — the `!` tells TS "trust me, this is not null."
- Justified here because `requireAuth` middleware ran before this line; if it hadn't set `req.user`, we'd have returned 401 already.
- Overusing `!` (or `as`) defeats TypeScript. Use only when you can point to a concrete runtime invariant that the type system can't see.

## Docker Compose for local infra
- Compose file = declarative infrastructure. Version-controlled, reproducible, one command to bring up.
- Beats `docker run` for anything you'll set up more than once.
- Key concepts: services (long-running processes), volumes (persistent data), networks, healthchecks.
- **Named volumes with `external: true`** are how you attach an existing volume to a fresh container — data survives container recreation.
- Interview answer to "how do you manage local dev infrastructure?" — Docker Compose, versioned in the repo.