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