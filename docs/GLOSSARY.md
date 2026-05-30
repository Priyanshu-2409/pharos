# Glossary

Plain-English definitions for the technical terms used in Pharos docs 
and code. This grows as we encounter new concepts. Each entry includes 
where the concept lives in Pharos.

---

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