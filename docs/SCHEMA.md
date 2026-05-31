# Pharos — Database Schema

> Status: Living document. Updated as the schema evolves.
> Last updated: 2026-05-30

## Overview

Pharos uses a single PostgreSQL database accessed via Prisma ORM. 
The schema is designed around the following principles:

- **Relational integrity:** foreign keys enforce that every Check 
  belongs to a Monitor, every Monitor belongs to a User, etc. 
  Cascading deletes keep the data tree consistent.
- **Type safety via enums:** state fields (monitor status, incident 
  status, channel type) use enums so invalid values cannot be stored 
  and TypeScript catches typos at compile time.
- **Indexes on hot query paths:** every column that will be filtered 
  or sorted in production queries has an index. The `Check` table 
  (which grows fastest) has composite indexes specifically tuned for 
  the dashboard's "recent checks per monitor" query pattern.
- **Encryption at rest for secrets:** any column that holds 
  user-provided credentials (auth headers, webhook URLs) is stored 
  as encrypted `Bytes`. Encryption keys live in environment variables, 
  not the database.
- **Timestamp columns everywhere:** `createdAt` and `updatedAt` are 
  on every model for auditability and cache invalidation.

The full Prisma schema is below, followed by per-model rationale.

## Full Prisma Schema

```prisma
// ============================================
// User
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  monitors             Monitor[]
  notificationChannels NotificationChannel[]
  apiKeys              ApiKey[]
  statusPages          StatusPage[]
  
  @@index([email])
}

// ============================================
// Session — managed by Better Auth
// ============================================
// Better Auth creates and manages its own tables for sessions,
// accounts, and verification tokens. We do not design these
// ourselves. See: https://better-auth.com/docs

// ============================================
// Monitor
// ============================================

model Monitor {
  id                 String        @id @default(cuid())
  userId             String
  
  // Configuration
  name               String
  url                String
  method             HttpMethod    @default(GET)
  intervalSeconds    Int           @default(300)
  timeoutSeconds     Int           @default(30)
  expectedStatusCode Int           @default(200)
  
  // Authentication / headers (encrypted at rest)
  encryptedHeaders   Bytes?
  
  // Response validation rules (stored as JSON)
  bodyAssertions     Json?
  
  // State
  isActive           Boolean       @default(true)
  currentStatus      MonitorStatus @default(PENDING)
  
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  
  user               User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  checks             Check[]
  incidents          Incident[]
  
  @@index([userId])
  @@index([isActive, intervalSeconds])
}

enum HttpMethod {
  GET
  POST
  PUT
  PATCH
  DELETE
  HEAD
}

enum MonitorStatus {
  PENDING
  UP
  DOWN
  DEGRADED
  PAUSED
}

// ============================================
// Check
// ============================================

model Check {
  id              String    @id @default(cuid())
  monitorId       String
  
  statusCode      Int?
  responseTimeMs  Int?
  succeeded       Boolean
  failureReason   String?
  responseSnippet String?   @db.VarChar(2000)
  
  incidentId      String?
  
  createdAt       DateTime  @default(now())
  
  monitor         Monitor   @relation(fields: [monitorId], references: [id], onDelete: Cascade)
  incident        Incident? @relation(fields: [incidentId], references: [id], onDelete: SetNull)
  
  @@index([monitorId, createdAt(sort: Desc)])
  @@index([incidentId])
}

// ============================================
// Incident
// ============================================

model Incident {
  id           String         @id @default(cuid())
  monitorId    String
  
  startedAt    DateTime       @default(now())
  resolvedAt   DateTime?
  status       IncidentStatus @default(OPEN)
  startReason  String?
  
  monitor      Monitor        @relation(fields: [monitorId], references: [id], onDelete: Cascade)
  checks       Check[]
  alerts       Alert[]
  
  @@index([monitorId, startedAt(sort: Desc)])
  @@index([status])
}

enum IncidentStatus {
  OPEN
  RESOLVED
  ACKNOWLEDGED
}

// ============================================
// NotificationChannel
// ============================================

model NotificationChannel {
  id              String      @id @default(cuid())
  userId          String
  
  name            String
  type            ChannelType
  encryptedConfig Bytes
  
  isActive        Boolean     @default(true)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  alerts          Alert[]
  
  @@index([userId])
}

enum ChannelType {
  EMAIL
  DISCORD
  SLACK
  WEBHOOK
}

// ============================================
// Alert
// ============================================

model Alert {
  id             String          @id @default(cuid())
  incidentId     String
  channelId      String
  
  alertType      AlertType
  deliveryStatus DeliveryStatus  @default(PENDING)
  attempts       Int             @default(0)
  lastAttemptAt  DateTime?
  lastError      String?
  
  createdAt      DateTime        @default(now())
  
  incident       Incident             @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  channel        NotificationChannel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  
  @@index([incidentId])
  @@index([channelId])
  @@index([deliveryStatus])
}

enum AlertType {
  INCIDENT_OPENED
  INCIDENT_RESOLVED
}

enum DeliveryStatus {
  PENDING
  DELIVERED
  FAILED
  DEAD_LETTER
}

// ============================================
// ApiKey
// ============================================

model ApiKey {
  id          String    @id @default(cuid())
  userId      String
  
  name        String
  keyHash     String    @unique
  prefix      String
  
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  
  createdAt   DateTime  @default(now())
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([keyHash])
}

// ============================================
// StatusPage
// ============================================

model StatusPage {
  id          String    @id @default(cuid())
  userId      String
  
  slug        String    @unique
  title       String
  description String?
  
  monitorIds  String[]
  isPublic    Boolean   @default(true)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([slug])
  @@index([userId])
}
```

## Per-Model Rationale

### User

The account record. Holds business-level user data (email, name) but 
not authentication credentials — password hashes and session tokens 
are managed by Better Auth in its own tables. This separation keeps 
auth concerns isolated and means we don't have to redesign auth 
storage if we ever swap auth libraries.

We use `cuid()` for IDs (over UUIDs or auto-incrementing integers) 
because CUIDs are URL-safe, collision-resistant, lexicographically 
sortable, and don't leak signup volume.

### Monitor

Represents one endpoint a user wants checked. The `encryptedHeaders` 
field stores authentication headers (Bearer tokens, API keys) as 
an encrypted blob — the worker decrypts them just before making the 
check, and the API never returns the plaintext. The `bodyAssertions` 
JSON field stores validation rules; the structure can evolve over 
time without schema migrations.

`currentStatus` is denormalized: it duplicates information that could 
be computed by looking at the most recent check, but we store it on 
the monitor for fast dashboard rendering. The worker updates it after 
each check.

The composite index `@@index([isActive, intervalSeconds])` supports 
the worker's scheduler query: "find me all active monitors due for a 
check."

### Check

One row per check execution. This table grows fastest — a single user 
with 10 monitors at 60-second intervals produces 14,400 rows per day. 
At scale we may eventually need partitioning or rollup tables; for 
v1 we rely on aggressive indexing and short retention.

`responseSnippet` is capped at 2000 characters via `@db.VarChar(2000)` 
so we never store an entire 50MB response body if something pathological 
happens.

The composite index `@@index([monitorId, createdAt(sort: Desc)])` 
is the most important index in the entire schema — it supports the 
dashboard's "most recent checks per monitor" query, which runs 
constantly.

### Incident

Groups consecutive failed checks into a single logical event. Without 
this model, a 4-hour outage producing 240 failed checks would trigger 
240 alert emails. By grouping into one Incident with a `startedAt` 
and `resolvedAt`, we send exactly two notifications (started, 
resolved) per outage.

`ACKNOWLEDGED` lets a user mute further alerts on an ongoing incident 
without resolving it — useful when they know about the problem and 
are working on it.

### NotificationChannel

A user's configured delivery target. `encryptedConfig` stores 
channel-specific configuration as an encrypted JSON blob — the 
contents differ per channel type (email address for EMAIL, webhook 
URL for DISCORD/SLACK/WEBHOOK), and they often contain secrets 
(webhook tokens are embedded in Discord/Slack URLs).

### Alert

One row per notification delivery attempt. We log every attempt 
separately (not just per incident) so we have an audit trail: 
"the email to alice@example.com for incident #345 was delivered 
on attempt 3 after retries." `deliveryStatus = DEAD_LETTER` 
marks alerts that failed too many times and were given up on.

### ApiKey

For the public REST API in Phase 6. We store `keyHash` (the SHA-256 
of the actual key), never the plaintext — same security model as 
password storage. `prefix` (the first ~6 characters of the key) is 
stored separately so the dashboard can display "ph_a3f2x4..." 
without us being able to reconstruct the full key.

### StatusPage

A user-published status page. `slug` becomes the public URL 
(`pharos.app/status/{slug}`). `monitorIds` is a Postgres array of 
monitor IDs to expose — kept as an array rather than a join table 
because the list is small (typically <20) and rarely changes. If 
this grows into a many-to-many use case, we'll migrate to a join 
table.

## Schema Evolution

This schema is the starting point. Future changes will happen via 
Prisma migrations (`prisma migrate dev --name <description>`) with 
each migration recorded in `prisma/migrations/`. Significant 
modeling decisions will get entries in `DECISIONS.md`.

Anticipated future additions (post-v1):
- A `Webhook` model for inbound webhooks (Pharos as receiver)
- A `Team` / `Membership` model for team collaboration
- A `MaintenanceWindow` model for scheduled mute periods
- Index tuning based on observed query patterns