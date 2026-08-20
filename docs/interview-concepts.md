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

## Two layers of input validation (frontend + backend)
- **Browser-native validation** (`type="url"`, `required`, `min`, `max`) catches obvious errors before any network request. Instant feedback, zero cost.
- **Server-side Zod validation** is the security boundary — the browser can be bypassed (curl, Postman, disabled JS). Never trust the client alone.
- Both together = fast UX + safe API. Interviewers ask: "where does validation live?" Answer: both places, for different reasons.

## Component composition — Modal + Form + List pattern
- Instead of one giant dashboard component, split into single-responsibility pieces.
- `Modal.tsx` is generic (doesn't know about monitors).
- `MonitorForm.tsx` handles create AND edit — same fields, different starting values.
- `MonitorList.tsx` orchestrates data fetching + wires modals in.
- Same form + same modal reused for two flows. Reuse is the sign of decent React design.

## Imperative refetching vs optimistic updates
- After a mutation (create/update/delete), we re-run the list fetch.
- Simpler than optimistic updates (update local state immediately, roll back on error) but slightly slower UX.
- TanStack Query's `invalidateQueries` is the middle ground: still refetches, but with caching + retry.
- Correct choice depends on scale. Pharos at V1 is fine with plain refetch.

## Reusable fetch helper pattern
- Every component calling the API goes through one file (`lib/api.ts`).
- Sets `credentials: "include"` once, applied everywhere.
- Handles 204 (empty body) responses.
- Throws on non-2xx so components can `try/catch`.
- Typed return values → autocomplete everywhere.
- Refactor point later: swap to TanStack Query without touching component code.

## Browser `confirm()` and `alert()` are placeholder UX
- Fine for V1. Real apps use custom confirmation modals for consistency and styling control.
- Interviewers won't judge for this in a scoped MVP, but expect a follow-up "how would you improve this?"

## `type="url"` HTML input attribute
- Semantic input type: the browser validates the value is URL-shaped before submit.
- Also gives mobile users a URL-optimized keyboard.
- Zero JS. Wraps free UX + a11y win.
- Same family: `type="email"`, `type="number"`, `type="tel"`, `type="date"`.

## Producer / consumer pattern
- Foundational distributed-systems pattern. One process produces work (enqueues jobs); another consumes it (processes jobs).
- Pharos: API is the producer (creates schedulers when monitors are created), worker is the consumer (executes HTTP checks).
- Benefits: separation of concerns, independent scaling, isolation of failure modes.
- Message queue (Redis + BullMQ in Pharos) is the coordination layer between them.
- Interview flag: every real system uses some version of this — pub/sub, message queues, event streams, background job libraries.

## Message queues and job scheduling
- Queue systems provide durability (jobs survive process restarts), scheduling (execute now or at time X or every N seconds), retries, and observability.
- BullMQ specifically: repeatable jobs via `upsertJobScheduler` — register once, executes on schedule forever. `every: <ms>` sets interval.
- Pharos uses `monitor:<id>` as scheduler ID — unique per monitor, easy to add/update/remove.
- Alternative to a job queue: `setInterval` in-process. Loses everything if process restarts. No visibility. Doesn't scale. Not viable in production.

## Idempotency in distributed systems
- Every operation should be safe to run multiple times.
- Why: jobs can be retried after crashes; the retry should observe the same end state, not double-execute.
- Pharos examples:
  - Incident open guarded by `findFirst(status: ONGOING)` — can't double-open
  - Bootstrap uses `upsertJobScheduler` — safe to re-run on every worker startup
  - Sign-out clears server-side session but a repeated call is a harmless no-op
- Interview pattern: "how do you handle retries?" → idempotency + at-least-once delivery + dedupe on the consumer side.

## Application-level vs network-level failures
- Application-level failure = HTTP request succeeded but the response was bad (e.g., 500 status). It's a valid observation to record.
- Network-level failure = the HTTP request never completed (DNS failed, connection refused, timeout). Also a valid observation, but with `statusCode: null`.
- axios's default behavior throws on any non-2xx — you have to override with `validateStatus: () => true` to prevent that and treat 4xx/5xx as data, not exceptions.
- Distinguishing these matters. A monitor observing 500 is different from a monitor observing "domain doesn't exist." Different signals, different alert priorities.

## N+1 query problem and eager loading
- Anti-pattern: fetch a list of parents, then loop and issue one query per parent to fetch related data. 100 items = 101 queries.
- Solution: eager loading. In Prisma, `include: { relatedThing: {} }` joins in one query.
- Pharos: `GET /api/monitors` includes latest check and open incidents per monitor via `include`. Single optimized query.
- Interview gold: interviewers frequently ask "how do you fetch a parent with its children efficiently?" — name the problem, name the solution.

## Consecutive-failure debounce for alerting
- Alerting on the first failure gives false positives (transient blips = pages at 3am).
- Alerting on N consecutive failures within a time window is the standard uptime-monitoring pattern.
- Pharos: 3 consecutive DOWN checks before opening an incident.
- Real tools: configurable per-monitor (Better Stack, Pingdom).
- Interviewers ask: "how do you avoid alert fatigue?" → debounce + rate limit + severity classification.

## State machines derived from event streams
- The `Check` table is an event stream — one row per observation.
- The `Incident` table is a state derived from that stream.
- On each new event, re-evaluate: should the state change?
- This pattern generalizes: user activity → account state, sensor readings → machine health, transactions → account balance.
- Alternative: mutate state on every event (imperative). Deriving from events (declarative) is safer for retries and easier to audit.

## Polling vs push (real-time UI)
- Polling: client asks the server every N seconds ("any updates?"). Simple, works everywhere, adds latency (up to N seconds) and load.
- WebSockets: persistent connection, server pushes updates. Real-time, more infra, connection state to manage.
- Server-Sent Events (SSE): server pushes over HTTP, one-way. Simpler than WebSockets when you don't need client-to-server messages.
- Pharos V1 uses polling every 10s. Trade-off: simplicity vs freshness. Fine at V1 scale; SSE is a Phase 12/13 upgrade candidate.

## Bootstrap / reconciliation on startup
- Distributed systems have multiple state stores; they can drift.
- Pattern: on startup, reconcile derived state (Redis queues) from the source of truth (Postgres).
- Pharos worker bootstrap: scans `Monitor.status = ACTIVE`, ensures each has a scheduler via `upsertJobScheduler`.
- Same pattern in Kubernetes controllers, message-queue consumers, cache warm-ups.

## Compound indexes for time-series queries
- `@@index([monitorId, checkedAt])` on `Check` model.
- Enables fast "latest N checks for this monitor" queries — Postgres uses the index directly.
- Without it: full table scan every dashboard load.
- Interview: "when would you add a compound index?" → when queries filter by column A and sort/paginate by column B.

## Guard clauses vs nested conditionals
- Style: `if (cond) return;` at the top of a function, one condition at a time. Flat control flow.
- `updateIncidentState` uses this pattern for 3 state-transition cases.
- Cleaner than nested `if / else` chains, easier to read one case at a time.
- Idiomatic in most modern languages.

## Alerting pipeline design — decouple detection from dispatch
- State detection (worker's incident state machine) runs on every check.
- Dispatch (email sending) is a side-effect triggered by state transitions.
- Failure in dispatch must NEVER corrupt state detection — if Resend is down, the incident is still correctly opened in the DB.
- Pharos V1: dispatch is inline (synchronous with state change) but wrapped in try/catch that never rethrows.
- Interview follow-up: "how would you scale this?" → move dispatch to its own BullMQ queue for retries + isolation.

## Alert audit trail as a first-class table
- Every alert attempt (success or failure) writes an `Alert` row.
- `success: boolean` + `errorMessage: string?` capture the outcome.
- Enables observability queries: "which alerts failed in the last 24h?", "which incidents never notified anyone?"
- Alternative: log to a file or external tracing system. DB row is simpler for V1 and queryable.

## Notification channel abstraction
- `NotificationChannel` model with `type: EMAIL | WEBHOOK` and polymorphic `config: Json`.
- Design lets you add channels (Slack, PagerDuty, SMS, phone call) without schema changes.
- V1 wires EMAIL only, but the schema was designed for extensibility.
- Interview: "how would you add Slack alerts?" → new type, new dispatcher function reading `config.webhookUrl`, register in dispatch loop.

## Discriminated union return type for expected failures
- `SendResult = { success: true } | { success: false; errorMessage: string }`
- TypeScript narrows based on the discriminator field.
- Callers pattern-match: `if (result.success) { ... } else { console.log(result.errorMessage) }`.
- Modern TS idiom for operations that fail predictably (not exceptional errors).
- Contrast with throwing — throw is for unexpected/programmer errors; discriminated returns are for domain-level "this didn't work."

## Third-party service integration (Resend)
- Managed transactional email service; alternatives include SendGrid, Postmark, AWS SES.
- Pharos picked Resend for: modern DX, generous free tier, one-line send API.
- Free-tier constraint: can only send to your verified account email until you verify a domain.
- Production upgrade path: verify a domain (adds SPF/DKIM/DMARC DNS records), swap `ALERTS_FROM_EMAIL` env var, no code change needed.

## Manual upsert vs Prisma upsert
- Prisma's `.upsert()` needs a unique constraint on the where clause.
- Without one, use "find then branch" — `findFirst`, then `create` or `update`.
- Pharos settings PATCH does this because `NotificationChannel` has no `@@unique([userId, type])`.
- Race condition risk (two simultaneous PATCHes both find null, both create) is negligible at V1 scale.
- At scale: add composite unique index, use `.upsert()`.

## Text vs HTML transactional emails
- V1 Pharos sends plain text. Legible everywhere, unmistakable formatting, no client-compatibility issues.
- HTML emails need testing across mail clients (Gmail, Outlook, Apple Mail all render differently).
- Production tools use React Email or MJML templates.
- Interview: "why plain text for V1?" → simplicity, deliverability, focus on the pipeline before polish.

## The "settings page with fallback default" pattern
- Backend GET returns `notificationEmail` — falls back to signup email if no explicit channel exists.
- Frontend shows the fallback value pre-filled + a note explaining "Currently using signup email."
- User can save to make it explicit (creates a NotificationChannel row) without ever seeing a form validation error.
- Pattern generalizes: any settings field with a system-derived default should be visible + editable, not hidden.