# Pharos — System Architecture

> Status: Living document. Updated as the architecture evolves.
> Last updated: 2026-05-30

## System Overview

Pharos is built as three logical components that share a single database 
and a single Redis instance:

1. A **Next.js web frontend** that serves the dashboard, signup/login 
   flows, and public status pages.
2. An **Express HTTP API** that handles all authenticated read/write 
   operations from the frontend, plus the public REST API consumed by 
   third parties.
3. A **Node.js worker process** that consumes scheduled jobs from a 
   Redis-backed queue, executes HTTP checks against user endpoints, 
   writes results to the database, and triggers alerts on incidents.

The split between API and worker is the most important architectural 
decision in Pharos: the web-facing API never blocks on slow operations 
like HTTP checks or email delivery — those happen asynchronously in 
the worker. This keeps the API responsive under any load and makes 
the system resilient to worker crashes (jobs stay queued until 
processed).

The API and Worker never communicate directly — they share state via 
PostgreSQL and Redis, which keeps each component independently 
scalable and deployable.

PostgreSQL is the source of truth for all persistent data. Redis 
serves three roles: job queue (via BullMQ), cache layer for expensive 
dashboard queries, and rate-limit counter for the public API.

## Components

This section describes each piece of Pharos at a high level. Detailed 
design decisions (which algorithms, exactly which libraries, configuration 
specifics) are made in the phase where each component is built and 
recorded in `DECISIONS.md`.

### Frontend — Next.js + TypeScript + Tailwind + shadcn/ui

What it is: the user-facing website. Dashboard, login, signup, monitor 
management, and public status pages live here.

Why these tools: Next.js is the most widely used React framework today 
and integrates cleanly with TypeScript. Tailwind avoids the time sink 
of naming CSS classes. shadcn/ui gives us professional-looking 
components without locking us into a design system.

How it talks to other components:
- Calls the **API** over HTTPS for all reads and writes.
- Receives live status updates from the **API** over Server-Sent Events.
- Does not talk directly to the database, Redis, or the worker.

### HTTP API — Node.js + Express + TypeScript

What it is: the backend service that the frontend (and external API 
users) call. Handles authentication, authorization, validation, and 
all writes to the database.

Why these tools: Express is the most-taught and most-documented Node.js 
backend framework — perfect for learning. TypeScript catches type 
errors at compile time.

How it talks to other components:
- Receives HTTPS requests from the **Frontend** and external API users.
- Reads and writes to **Postgres** via Prisma.
- Pushes new jobs into **Redis** (via BullMQ) when monitors are 
  created or modified.
- Uses **Redis** as a cache and as a rate-limit counter for the 
  public API.

### Worker — Node.js + BullMQ

What it is: a separate program that does the actual API monitoring 
work. Pulls scheduled "ping this monitor" jobs out of the queue, makes 
the HTTP request, records the result, and triggers alerts when 
incidents happen.

Why a separate process: keeps the API fast and responsive. Slow 
operations like pinging an unreliable endpoint don't block the 
dashboard. See "System Overview" above for the full rationale.

How it talks to other components:
- Pulls jobs from **Redis** via BullMQ.
- Writes check results, incident state, etc. to **Postgres** via Prisma.
- Makes outbound HTTP requests to user-configured **endpoints** (the 
  actual monitoring).
- Sends notifications via **Resend** (email) and **webhooks** (Discord, 
  Slack, user-provided URLs).

### Database — Postgres + Prisma

What it is: a single relational database storing everything that 
needs to persist: users, monitors, checks, incidents, notification 
channels, API keys, status page configs.

Why Postgres: the data is relational (a check belongs to a monitor 
belongs to a user). Postgres handles this naturally with foreign keys 
and transactions.

Why Prisma: provides type-safe database access from TypeScript, with 
a clean migration system. Detailed schema is documented in `SCHEMA.md`.

### Cache + Queue — Redis

What it is: a single Redis instance serving three purposes simultaneously:
- **Job queue:** holds scheduled check jobs (managed by BullMQ).
- **Cache:** stores expensive computed values (like 30-day uptime 
  percentages) for short periods.
- **Rate limit counters:** tracks how many requests each API key has 
  made, for the public API.

Specific algorithms and configurations are decided in the phase where 
each use case is built (Phase 2 for the queue, Phase 3 for the cache, 
Phase 6 for rate limiting).

### Authentication — Better Auth

What it is: a library that handles email/password signup, login, 
password reset, sessions, and API key generation.

Why Better Auth: it's self-hosted, open-source, and exposes the 
session and cookie mechanics clearly so we actually understand how 
auth works — unlike Clerk, which hides these details. Trade-off: 
slightly more configuration upfront in exchange for genuine 
understanding.

### Notifications — Resend (email) + Webhooks

What it is: how Pharos delivers alerts when incidents happen.

- **Resend** for email delivery: modern API, clean SDK, generous free 
  tier.
- **Webhooks** for Discord, Slack, and user-provided URLs: a single 
  code path (send HTTP POST) covers all of them.

### Hosting — Vercel + Railway

- **Vercel** hosts the Next.js frontend. Free, automatic deploys 
  from Git.
- **Railway** hosts the API, Worker, Postgres, and Redis as four 
  services in one project. Generous free tier, simple Dockerfile-based 
  deployment.

We're explicitly avoiding AWS for v1 because the time cost of 
learning IAM, VPCs, and ECS is too high for a project where the 
*application* is what we're trying to demonstrate. A future post-v1 
goal may be migrating to AWS.