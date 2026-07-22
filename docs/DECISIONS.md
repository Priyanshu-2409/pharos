# Architecture Decision Records

A running log of significant technical and product decisions for Pharos.

Each entry follows the format:
- **Context:** What was the situation
- **Decision:** What I picked
- **Alternatives considered:** What else I looked at
- **Tradeoffs:** What I'm giving up

---

## 2026-05-29 — Project naming

**Context:** Needed a memorable, distinctive name for the project that reflects its purpose (watching over APIs) without being generic.

**Decision:** "Pharos" — named after the Lighthouse of Alexandria, one of the Seven Wonders of the Ancient World.

**Alternatives considered:** Beacon, Argos, Sentinel, Watchtower.

**Tradeoffs:** Some name overlap with "Phare" (an existing uptime monitoring service in a similar niche, French for lighthouse) and unrelated products in Salesforce observability ("Pharos.ai") and blockchain ("Pharos Network"). Accepted the risk because none compete in the same indie/open-source uptime monitoring lane, and the lighthouse metaphor aligns strongly with the product's purpose.

---

## 2026-05-29 — Tech stack selection

**Context:** Needed to commit to a stack early to focus learning effort and avoid mid-project rewrites.

**Decision:**
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Queue & Cache:** Redis + BullMQ
- **Auth:** Better Auth
- **Deployment:** Vercel (frontend), Railway (backend + Postgres + Redis)

**Alternatives considered:**
- Backend: Fastify (faster but smaller ecosystem); Next.js API routes only (simpler but couples frontend and backend lifecycles).
- Database: MongoDB (familiar to many bootcamp grads but weaker for relational time-series data).
- Queue: A simple `setInterval` scheduler (no infrastructure cost but no durability across crashes).
- Auth: Clerk (faster to ship but more "magic", less learning value).
- Hosting: AWS (industry standard but steep learning curve; would consume disproportionate time vs. value for a v1).

**Tradeoffs:**
- Express over Fastify: chose familiarity and tutorial availability over raw performance — performance is not the constraint for this project.
- Postgres over MongoDB: chose relational integrity and proper indexing for time-series check data over schema flexibility.
- Separate Express backend over Next.js API routes: chose architectural clarity (clear frontend/backend separation, independent worker process) over deployment simplicity.
- Better Auth over Clerk: chose learning depth (understanding sessions, cookies, middleware) over speed of implementation.

---

## 2026-05-30 — v1 product scope locked

**Context:** Initial product scoping for Pharos. Multiple paths considered for differentiation, feature breadth, and complexity ceiling.

**Decision:**
- Position Pharos as an *integration health* monitor (Path B): goes beyond uptime to validate response codes, response times, and response body content using authenticated checks. Differentiates from UptimeRobot (pure uptime) and Datadog (enterprise infrastructure).
- v1 includes: authenticated endpoint monitoring, body validation, encrypted secrets at rest, dashboards with charts, real-time SSE updates, multi-channel alerts (email/Discord/Slack/webhooks), incident grouping, public status pages, REST API with rate limiting, password reset via email.
- Explicit non-goals for v1: multi-region monitoring, GraphQL endpoint, browser/synthetic monitoring, mobile push/SMS/voice alerts, team collaboration/SSO, infrastructure monitoring, tracing, log management, error tracking, maintenance windows, mute/snooze alerts.

**Alternatives considered:**
- Path A (keep as pure uptime monitor) — rejected because it didn't catch the founder's actual pain point (credentials expiring).
- Path C (pivot to narrow Integration Health Monitor) — rejected because the narrower scope removed generic learning opportunities.
- Including GraphQL — initially planned, cut because a forced GraphQL endpoint wrapping existing REST routes adds little real value and dilutes the focus on REST done well.
- Including mute/snooze alerts — cut because it overlaps with the existing "pause monitor" feature.

**Tradeoffs:**
- Path B adds 30–40% complexity (secret encryption, body validation) vs. Path A but justifies the entire premise of the product.
- Cutting GraphQL trades one buzzword resume bullet for sharper REST design (cursor pagination, idempotency, rate limiting per key) — a tradeoff in favor of depth over breadth.
- Cutting team collaboration, SSO, and multi-region monitoring keeps v1 finishable in the available timeframe.

---

## 2026-05-30 — High-level system architecture

**Context:** Needed to commit to a system architecture for Pharos v1 before significant code is written.

**Decision:** Three logical components — Next.js frontend, Express API, Node.js worker — sharing PostgreSQL and Redis. API and Worker do not communicate directly; they share state via the database and queue. Detailed component rationale and runtime flows captured in `ARCHITECTURE.md`.

**Alternatives considered:**
- Single Next.js monolith with API routes + cron jobs — rejected because synchronous request handlers can't safely execute long-running scheduled work, and there's no path to scale workers independently.
- Microservices (separate services for auth, monitors, checks, notifications) — rejected as over-engineering for the scale and team size. A single shared codebase with two processes is the sweet spot.
- Different queue/cache stack (RabbitMQ for queue + Memcached for cache) — rejected because Redis handles both well and avoids running multiple infrastructure services.

**Tradeoffs:**
- Requires running two backend processes (API + Worker) instead of one, slightly increasing deployment complexity. Justified by responsiveness and scalability gains.
- Sharing state via DB + Redis means components must agree on data formats (e.g., job payloads, cache key conventions) without explicit interface contracts. Mitigated by both processes sharing the same TypeScript types via a shared package.

---

## 2026-05-30 — Initial database schema

**Context:** Needed an initial database schema before any backend code is written. Schema affects every component (API, worker, frontend) so it pays to get it roughly right upfront.

**Decision:** Nine application models (User, Monitor, Check, Incident, NotificationChannel, Alert, ApiKey, StatusPage, plus Better-Auth-managed Session/Account/Verification tables). Six enums for state fields. Composite indexes on `(monitorId, createdAt DESC)` for Check and Incident. Secrets (auth headers, channel configs) stored as encrypted `Bytes`. Full schema and per-model rationale captured in `SCHEMA.md`.

**Alternatives considered:**
- Auto-incrementing integer IDs over CUIDs — rejected because integer IDs leak signup volume, are guessable in URLs, and complicate database merges.
- String columns instead of enums for state fields — rejected because enums prevent invalid values at the database level and give TypeScript type safety; the migration cost of adding new values is acceptable.
- A join table for `StatusPage` ↔ `Monitor` instead of a `monitorIds String[]` array — rejected because the list is small and rarely changes; will migrate to a join table if/when usage grows.
- Computing `Monitor.currentStatus` on-the-fly from the latest Check instead of storing it — rejected because the dashboard renders this constantly and the small denormalization is worth the speed.

**Tradeoffs:**
- Denormalizing `currentStatus` on Monitor means the worker must keep it in sync with check results. Wrong status is a possible class of bug.
- Encrypted blobs (`Bytes`) for headers and channel config can't be queried or filtered server-side. This is fine because Pharos never needs to search through them, but it precludes future features like "find all monitors with a `X-API-Key` header" without a schema change.
- Heavy indexing on the Check table speeds reads at the cost of writes. Acceptable because reads (dashboard renders) dramatically outnumber writes (check inserts).

## Better Auth Origin check on state-changing endpoints
- Sign-out via Postman returned 403 `MISSING_OR_NULL_ORIGIN`.
- Cause: Postman doesn't send `Origin` header by default; Better Auth requires it on POST/DELETE etc.
- Fix in Postman: manually add header `Origin: http://localhost:3000` (a value in `trustedOrigins`).
- Real browsers auto-send this, so production frontends need no code change.

## Orphaned sessions in the DB
- Session rows persist in the DB when the client-side cookie is cleared without a proper sign-out call.
- Not a bug: expected behavior for "user cleared their browser data" scenario.
- Natural cleanup on `expiresAt` (30 days). Better Auth prunes expired sessions on next lookup.
- For production: consider a periodic worker to hard-delete expired rows (`DELETE FROM Session WHERE expiresAt < NOW()`).

## Dashboard as client component with useSession
- Dashboard uses `"use client"` + `useSession()` for auth checks. This is UX-layer, not security.
- Security lives in the API's `requireAuth` middleware; any actual data fetching happens through that.
- Hardening later: consider Next.js middleware.ts for edge-level cookie check to avoid HTML being served to logged-out users. Deferred until Phase 10/11.