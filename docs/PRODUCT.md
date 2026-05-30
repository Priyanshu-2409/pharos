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

🚧 *Remaining sections coming next: Core User Stories, What's in Scope, 
Success Criteria.*