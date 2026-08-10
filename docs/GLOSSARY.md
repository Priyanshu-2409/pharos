# Glossary

Plain-English definitions for the technical terms used in Pharos docs 
and code. This grows as we encounter new concepts. Each entry includes 
where the concept lives in Pharos.

---

# Glossary — Pharos

Words and acronyms encountered while building Pharos, in the order they became relevant.

## Authentication (authn)
Verifying who someone is. Login flow.

## Authorization (authz)
Verifying what someone is allowed to do. Per-action, per-resource permission checks.

## CORS (Cross-Origin Resource Sharing)
Browser policy that blocks JavaScript on site A from reading responses from site B unless site B opts in via response headers.

## CSRF (Cross-Site Request Forgery)
Attack where a malicious site tricks a user's browser into making authenticated requests to another site using the user's cookies. Defenses: SameSite cookies, Origin header check, CSRF tokens.

## Credentials (in CORS context)
Anything the browser stores per-domain to identify a user — mainly cookies, but also HTTP Basic Auth and TLS certs. Blocked by default on cross-origin requests unless both sides opt in.

## Origin
The scheme + host + port of a page. `http://localhost:3000` and `http://localhost:4000` are different origins even though both are "localhost".

## Middleware
A function in an HTTP server's request pipeline that runs before the route handler. Can inspect/modify the request, send a response early, or pass control down the chain.

## Session
A record on the server (usually a DB row) representing an active login. Identified by a random token. The token lives in a cookie on the client.

## JWT (JSON Web Token)
A signed token containing user info + expiry. Alternative to server-stored sessions. Trades revocation ease for statelessness.

## Scrypt
A password hashing function. One-way — you can turn password into hash but not back. Better Auth's default hashing choice.

## Hashing (in auth context)
Turning a password into a fixed-length string via a one-way function. Same input → same output, but you can't reverse the process.

## Prisma
TypeScript ORM (Object-Relational Mapper). Lets you define your database schema in a `.prisma` file and query it with a typed JavaScript API.

## ORM (Object-Relational Mapper)
A library that maps database rows to programming-language objects. Abstracts SQL.

## Migration (in DB context)
A version-controlled change to your database schema. Prisma tracks these in a folder so you can replay them on any environment.

## Zod
A TypeScript runtime schema validation library. Schemas double as TypeScript types.

## IDOR (Insecure Direct Object Reference)
Vulnerability where an API accepts a resource ID but doesn't check that the caller is allowed to access it.

## OWASP
Open Worldwide Application Security Project. Publishes the "Top 10" list of common web security vulnerabilities.

## Monorepo
One repo containing multiple packages/apps that share code and infra. Pharos uses Turborepo + pnpm workspaces.

## Turborepo
A build tool for monorepos. Caches task outputs and runs tasks in parallel across workspaces.

## pnpm workspace
pnpm's mechanism for managing multiple packages in one repo. `--filter <name>` runs commands scoped to a specific package.

## Docker
Container runtime. Runs isolated processes with their own filesystem, network, etc.

## Container
A running instance of a Docker image. Ephemeral by default — data inside is lost when it stops unless mounted to a volume.

## Docker image
A frozen template used to create containers. Pinned versions are best practice (`postgres:16`, not `postgres:latest`).

## Docker volume
Persistent storage that lives outside a container. Survives container deletion. Where your DB data actually lives.

## Docker Compose
Declarative config (YAML) that describes multi-container setups. `docker compose up -d` brings everything up.

## PostgreSQL / Postgres
Relational database. What Pharos uses for all persistent data.

## Redis
In-memory data store. Used as a queue broker for BullMQ in Phase 11.

## BullMQ
Node.js job queue library backed by Redis. Used to schedule Pharos's periodic health checks.

## Express
Node.js web framework. The API layer of Pharos.

## Next.js
React framework with server-side rendering, routing, and the App Router. The web frontend.

## App Router (Next.js)
Next.js's modern routing system where folders in `app/` map to URLs and files like `page.tsx` define what renders there.

## Server Component vs Client Component (Next.js)
Server components render on the server, ship as HTML, can't use hooks or event handlers. Client components (marked `"use client"`) render in the browser, can use React state and effects.

## HttpOnly cookie
A cookie flag that blocks JavaScript from reading the cookie (`document.cookie` skips it). Defends against XSS.

## SameSite cookie
A cookie flag that controls when a cookie is sent on cross-site requests. `Lax` (default) is a good balance.

## XSS (Cross-Site Scripting)
Attack where malicious JavaScript is injected into a legitimate site and runs in users' browsers with the site's permissions.

## Controlled input (React)
A form input whose value is driven by React state. `<input value={x} onChange={e => setX(e.target.value)} />`.

## `useEffect`
React hook for side effects — code that runs after render, like data fetching, subscriptions, or timers.

## `useState`
React hook for local component state.

## Content-Type
HTTP header indicating what format the request/response body is in. `application/json` is the modern default for APIs.

## `req.body`
The parsed body of an incoming HTTP request, populated by body-parser middleware. Only available if the parser matches the Content-Type.

## Router (Express)
A mini Express app that groups related routes. Mounted under a URL prefix.

## Turbopack
Rust-based bundler used by Next.js for fast dev builds. Successor to Webpack.

### API

A collection of endpoints that a service exposes for programs to call.
The "Pharos API" is the set of all endpoints we build.

### API key

A secret string that identifies who is making a request. Like a 
password, but for programs rather than humans. The user generates an
API key in Pharos's dashboard and includes it in requests to the 
public API. Pharos checks the key on every request to decide whether 
to allow it.

### Authentication

Verifying *who someone is*. Sessions, passwords, API keys all do
authentication.

### Authorization

Verifying *what someone is allowed to do*. Even after we know who you 
are (authentication), we still have to check whether you're allowed 
to access this specific monitor (authorization). Two different things.

### BullMQ

A library for Node.js that lets us put "jobs" into a queue (a list 
of work to be done) and have workers pull them off and execute them.
Stores the queue in Redis. Pharos uses BullMQ to schedule checks.

### Cache

A temporary storage of computed data so we don't have to recompute 
it every time. If "this user's uptime percentage over 30 days" takes 
500ms to calculate from the database, we compute it once and store 
the result in a cache; subsequent requests in the next minute return 
the cached value in 1ms.

### CORS (Cross-Origin Resource Sharing)

A browser security rule that says "JavaScript on website A is not 
allowed to call APIs on website B unless website B explicitly 
allows it." Pharos's backend has to be configured to allow the 
Pharos frontend to call it. We'll set this up in Phase 1.

### Dead-letter queue (DLQ)

When a job fails too many times in a row, we move it to a special 
"dead-letter" queue rather than retrying forever. This stops broken 
jobs from spinning indefinitely. We'll set this up via BullMQ in 
Phase 2.

### Endpoint

A specific URL on a server designed to be called by programs (not 
visited by humans in a browser). `https://api.razorpay.com/v1/payments` 
is an endpoint. Pharos monitors endpoints.

### Exponential backoff

When a job fails and we retry, we wait *longer* between each retry: 
1 second, then 2, then 4, then 8. Prevents hammering an already-broken 
service. BullMQ gives us this as a config option in Phase 2.

### Idempotency

A property of an operation: doing it twice has the same effect as 
doing it once. "Set this user's email to X" is idempotent. "Add 1 
to this counter" is not (doing it twice double-counts). Important 
in Pharos because if a worker retries a check after crashing, we 
don't want duplicate database rows.

### Job (in queue context)

A unit of work waiting to be processed. "Ping monitor X" is a job 
in Pharos. Jobs sit in the queue (Redis) until a worker picks them 
up and executes them.

### Job queue

A list of jobs waiting to be processed. Workers pull from the queue 
one at a time. The queue is durable: if a worker crashes mid-job, 
the job can be retried. Pharos uses BullMQ + Redis for this.

### JSONB

A PostgreSQL column type that stores JSON data but lets you query 
*inside* it efficiently. Plain "TEXT" columns can store JSON as a 
string but can't search inside it. We might use JSONB for storing 
response bodies from checked endpoints — TBD in Phase 2.

### ORM (Object-Relational Mapper)

A library that lets you write database queries in JavaScript/TypeScript 
instead of writing raw SQL. Prisma is Pharos's ORM. Instead of writing 
`SELECT * FROM monitors WHERE user_id = 'abc'`, you write 
`prisma.monitor.findMany({ where: { userId: 'abc' } })`.

### Postgres / PostgreSQL

A relational database — meaning data is stored in tables with rows 
and columns, and tables can reference each other (foreign keys). 
Pharos's source of truth for all persistent data.

### Prisma

The ORM Pharos uses. It reads a schema file (`schema.prisma`) that 
describes our database tables, and generates TypeScript code we use 
to query the database with full type safety.

### Rate limiting

Restricting how many requests a single user (or API key, or IP 
address) can make in a time window. Without rate limiting, one 
abusive user could overwhelm the system or run up costs. Pharos 
will implement rate limiting on the public API in Phase 6.

### Redis

An in-memory data store. Fast, but data lives in RAM (so it can be 
lost if Redis restarts — which is fine for our uses). Pharos uses 
Redis for three things: as a job queue (via BullMQ), as a cache, 
and as a rate-limit counter.

### REST / REST API

A style of designing APIs around HTTP, where URLs represent 
"resources" (like monitors, users, checks) and HTTP methods 
(GET, POST, PATCH, DELETE) represent operations on them. Pharos's 
API is RESTful.

### Server-Sent Events (SSE)

A way for a server to push messages to a connected browser over 
a single open HTTP connection. Simpler than WebSockets, perfect 
for one-way live updates. Pharos uses SSE for live dashboard 
updates in Phase 3.

### Session

A way of remembering "this user is logged in" across multiple 
requests. When you log in, the server creates a session, stores 
a session ID in a cookie in your browser, and on subsequent 
requests reads the cookie to know it's still you. Better Auth 
handles this for Pharos.

### Sliding-window rate limit

A specific algorithm for rate limiting. We'll explain when we 
implement it in Phase 6.

### TTL (Time To Live)

How long a piece of cached data is considered valid before it's 
automatically deleted. "TTL of 60 seconds" means the cached value 
expires 60 seconds after it's written.

### Webhook

An HTTP POST request that a service sends to a URL you provide when 
something happens. The "reverse" of an API call: instead of you 
polling them, they push to you. Pharos *sends* webhooks (alerts to 
Discord/Slack/custom URLs).

### Worker (process)

A separate program that runs independently from the main API, 
consuming jobs from a queue and executing them. In Pharos, the 
worker is what actually pings monitored endpoints and delivers 
alerts.

### Attribute (Prisma)

A modifier on a field, marked with `@` (field-level) or `@@` 
(model-level). Examples: `@id`, `@unique`, `@@index(...)`.

### B-tree

The default data structure used to store database indexes. Allows 
fast lookups and ordered traversals.

### Cardinality

The "how many" of a relationship. One-to-one, one-to-many, 
many-to-many.

### Cascade delete

When a parent row is deleted, child rows that reference it are 
automatically deleted too. Used everywhere in Pharos via 
`onDelete: Cascade`.

### Composite index (multi-column / compound index)

An index spanning multiple columns. Useful when queries filter or 
sort by multiple columns at once. The order of columns in the 
index matters.

### CUID

Collision-resistant unique identifier. A type of random string ID 
used for primary keys instead of integers. URL-safe, sortable, 
doesn't leak signup volume.

### Enum

A type that allows only a fixed set of values. Used in Pharos for 
state fields (monitor status, incident status, channel type, etc.).

### Envelope encryption

A pattern where data is encrypted with a key that's itself stored 
separately (e.g., in environment variables, not in the database).

### Foreign key (FK)

A column in one table that references the primary key of another 
table, creating a link between them.

### Full table scan

When the database has to read every row in a table to answer a 
query because no useful index exists. Slow on large tables.

### Index

A separate, sorted data structure the database maintains so it 
can find rows quickly without scanning the entire table. Like 
the index at the back of a book.

### Join table

A table that connects two other tables in a many-to-many 
relationship.

### Nullable

A field allowed to hold a null value (no value). Marked with `?` 
after the type in Prisma (e.g., `String?`).

### Primary key (PK)

The unique identifier column for a row in a table. Usually called 
`id`.

### Relation (Prisma)

A virtual field that lets you traverse links between tables in 
code without being an actual database column. Powered behind the 
scenes by a foreign-key column on one side.

### Timestamp columns

The industry-standard `createdAt` and `updatedAt` fields. Used 
on almost every Pharos table for auditability and cache 
invalidation.

### Write amplification

The phenomenon that adding indexes makes writes slower, because 
each index must be updated alongside the row.