# Pharos — Product Requirements

> Status: Living document. Updated as the product evolves.
> Last updated: 2026-05-30

## The Problem

API integrations fail silently. Not the kind of failure that throws a 
500 and crashes your server — the kind that quietly returns 401, or 
returns 200 with malformed data, or responds in 8 seconds instead of 
80 milliseconds. Nothing crashes. Nothing logs. The integration just 
stops working, and you don't find out until a user complains — or 
worse, until you're standing in front of someone you needed to impress.

This happens to indie developers and students constantly:

- A third-party API key expires in the middle of the night
- A deployment quietly breaks your `/health` endpoint and you don't 
  notice for days
- A webhook you depend on changes its response format and your 
  integration silently produces garbage
- A payment provider's sandbox returns 200 OK but with an error in 
  the response body that your code happily ignores

Existing tools solve part of this problem, but with significant gaps. 
Enterprise platforms like Datadog start at $15/host/month and assume 
you have infrastructure to monitor. Free tools like UptimeRobot only 
check whether a URL returns *some* response — they don't catch 
authentication failures, schema drift, or malformed payloads. 
Open-source alternatives like Healthchecks.io invert the model 
(your server pings them, not the other way around), which works 
for cron jobs but not for monitoring third-party dependencies.

There's a gap in the middle: a tool that goes beyond "is the server 
up" to ask "is my integration actually working" — accessible to 
solo developers, students, and small teams, without enterprise 
pricing or complexity.

That's what Pharos is.

## Target User

Pharos is built for **the solo developer or small team running 
1–10 production services or critical integrations**, who needs 
real monitoring but can't justify enterprise pricing — and who 
needs to catch *integration* failures, not just server downtime.

Concretely, the three user archetypes:

**1. The indie hacker.** Building a SaaS product alone or with one 
co-founder. Has a production app live. Integrates with 3–5 third-party 
services (Stripe, SendGrid, OpenAI, etc.) — any of which can break 
their business if they fail silently. Currently using UptimeRobot's 
free tier or nothing at all. Won't pay $50/month for monitoring.

**2. The student / final-year project developer.** Building meaningful 
projects for portfolio, internship applications, or coursework. 
Often integrates with payment APIs (Razorpay), auth providers (Clerk, 
Auth0), and external services. Cannot afford paid monitoring tools 
but cares deeply that the project actually works — especially during 
demos and presentations. *(This is the user the founder of Pharos was 
when the project began.)*

**3. The bootstrapped team.** A small group (2–5 people, often friends 
from college) building something ambitious on their own time, without 
investor funding or enterprise budgets. Past the "weekend project" 
stage — they have real users or are about to — but they're paying for 
servers out of pocket. They need reliable monitoring of their stack, 
and they're exactly the team most likely to self-host Pharos rather 
than pay for hosted monitoring.

## Who Pharos is NOT for (v1)

Being explicit about who we're *not* serving helps keep the product 
focused. Pharos in its current form is not the right fit for:

- **Large engineering organizations** that need enterprise features 
  like SSO, audit logs, role-based access control, multi-region 
  monitoring, or SLA contracts. These users are better served by 
  Datadog, New Relic, or PagerDuty.
- **Infrastructure monitoring needs** — Pharos watches *endpoints*, 
  not servers, containers, or Kubernetes clusters. For infrastructure 
  metrics, use Prometheus + Grafana.
- **Full observability needs** — Pharos doesn't ingest logs, traces, 
  or application exceptions. For that, use Sentry, Honeycomb, or 
  the OpenTelemetry ecosystem.
- **Compliance-heavy industries** (banking, healthcare, regulated 
  software) that require SOC 2, HIPAA, or ISO 27001 certifications. 
  v1 does not pursue these.

A future version of Pharos may expand into some of these areas — 
but committing to v1 means committing to *not* trying to be 
everything to everyone today.

---

## Core User Stories (v1)

These stories define the functional scope of Pharos v1. Each story is 
written in the format *"As a [user type], I want to [action], so that 
[value]."* Every story is intended to be specific enough to test and 
ship.

### Account & Access

- **As a new user**, I want to sign up with email and password, so that 
  I can start monitoring my endpoints.
- **As a registered user**, I want to log in and out securely, so that 
  my monitors are private to me.
- **As a user**, I want my password to be securely hashed (bcrypt or 
  argon2) and never stored in plaintext, so that a database breach 
  doesn't expose my credentials.
- **As a user**, I want to reset my password via a time-limited email 
  link if I forget it, so that I'm not locked out of my account.

### Monitor Management

- **As a user**, I want to add a new monitor by providing a URL, HTTP 
  method, expected status code, and check interval, so that Pharos 
  starts watching that endpoint.
- **As a user**, I want to add custom request headers (including auth 
  headers like `Authorization: Bearer ...`) to a monitor, so that 
  Pharos can check authenticated endpoints exactly as my application 
  would.
- **As a user**, I want my auth headers and secrets to be encrypted 
  at rest, so that even if the database is compromised, my keys are 
  safe.
- **As a user**, I want to define response body validation rules 
  (e.g., "response must contain `success: true`"), so that Pharos 
  catches application-level failures hidden behind 200 OK responses.
- **As a user**, I want to view a list of all my monitors with their 
  current status (up/down/degraded), so that I can see my whole stack 
  at a glance.
- **As a user**, I want to edit or pause a monitor, so that I can 
  adjust intervals or stop monitoring during planned maintenance.
- **As a user**, I want to delete a monitor I no longer need, so that 
  my dashboard stays relevant.

### Checks & Validation

- **As a user**, I want Pharos to ping each of my monitors at the 
  interval I configured (down to 60 seconds), so that I get timely 
  awareness of failures.
- **As a user**, I want each check to record status code, response 
  time, response body (or assertion result), and timestamp, so that 
  I have historical data to investigate issues.
- **As a user**, I want a check to be marked as failed if any of 
  (status code, response time, body validation) violates the rules, 
  so that I catch all classes of failure.
- **As a user**, I want to view a chart of response time over the 
  last 24 hours / 7 days / 30 days for each monitor, so that I can 
  spot performance degradation trends.
- **As a user**, I want to view a list of recent failed checks per 
  monitor with details (status code, response snippet, error), so 
  that I can debug what went wrong.
- **As a user**, I want my dashboard to update in real-time when a 
  monitor's status changes, so that I don't have to refresh manually.

### Alerts & Notifications

- **As a user**, I want to configure email, Discord, Slack, and 
  generic webhook notification channels, so that I can be alerted 
  in the tools I already use.
- **As a user**, I want alerts to fire only after N consecutive 
  failed checks (configurable per monitor), so that I'm not woken 
  up by transient blips.
- **As a user**, I want consecutive failures to be grouped into a 
  single "incident" rather than triggering an alert per failed 
  check, so that I don't get spammed during outages.
- **As a user**, I want to receive a "recovery" notification when 
  an incident resolves, so that I know things are working again.

### Status Pages & Public API

- **As a user**, I want to publish a public status page at 
  `pharos.app/status/[my-slug]` that shows the live status of 
  monitors I choose, so that I can share system health with my 
  users without exposing private monitors.
- **As a user**, I want my public status page to show current 
  uptime percentage and a 90-day history bar, so that visitors can 
  see reliability at a glance.
- **As a developer**, I want to access Pharos data via a REST API 
  with API key authentication, so that I can integrate Pharos into 
  my own tools, CI pipelines, or scripts.
- **As a developer**, I want the public REST API to be rate-limited 
  per API key, so that one user's heavy usage doesn't degrade the 
  service for others.

  ## What's In Scope (v1)

A summarized list of what Pharos v1 will include:

- Email/password authentication with secure password reset
- HTTP/HTTPS endpoint monitoring with configurable intervals (60s minimum)
- Authenticated checks (custom headers including bearer tokens)
- Response validation: status code, response time threshold, response body assertions
- Encrypted storage of user secrets and auth credentials
- Dashboard with monitor list, status overview, and response-time charts
- Real-time dashboard updates via Server-Sent Events
- Incident grouping and consecutive-failure debouncing
- Multi-channel notifications: email, Discord, Slack, generic webhooks
- Public status pages with customizable slug and 90-day uptime history
- REST API for programmatic access with per-key API authentication and rate limiting
- Self-hostable: full Docker Compose setup for self-deployment

## What's Out of Scope (v1)

Explicitly deferred to future versions or never:

- Multi-region monitoring (single-region only in v1)
- Synthetic browser monitoring (clicking through user flows)
- Mobile push notifications, SMS, or phone-call alerts
- Team collaboration, shared workspaces, role-based access control
- SSO (SAML, OAuth-based enterprise login)
- GraphQL API
- Distributed tracing, log management, or error tracking
- Infrastructure monitoring (CPU, memory, disk, network)
- SSL certificate expiry tracking
- DNS monitoring
- Custom domains for status pages
- Maintenance windows / scheduled mute
- Compliance certifications (SOC 2, HIPAA, ISO 27001)
- AI-driven alerting or anomaly detection

## Success Criteria for v1

Pharos v1 is considered "shipped" when all of the following are true:

**Functional completeness:**
- All user stories in this document work end-to-end on a deployed instance
- A user can sign up, add a monitor, see it pinged on schedule, receive 
  an alert when it fails, and view its history — without bugs blocking 
  any step

**Quality bar:**
- Critical paths (signup, monitor creation, check execution, alert 
  delivery) have integration test coverage
- No P0/P1 bugs in the issue tracker
- Production deploy reachable at a public URL with TLS

**Documentation:**
- README explains what Pharos is and how to run it locally
- All four `docs/` files (PRODUCT, ARCHITECTURE, SCHEMA, DECISIONS) 
  are complete and current
- OpenAPI specification published for the REST API

**Real-world validation:**
- At least one person other than the founder has used Pharos to 
  monitor at least one of their own endpoints for at least one week
- Self-hosting instructions verified by a second person who has 
  successfully deployed their own instance

When all of these are true, Pharos v1 is done. Post-v1 work happens 
on a separate roadmap.

---

*This document is the source of truth for what Pharos v1 is. Significant 
scope changes require an entry in `DECISIONS.md` explaining the rationale.*