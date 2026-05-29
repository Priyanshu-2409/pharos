# Pharos

> The lighthouse for your APIs. An open-source uptime monitoring platform 
> for indie developers and small teams.

[![Status: In Development](https://img.shields.io/badge/status-in%20development-yellow)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## What is Pharos?

Pharos monitors your API endpoints, alerts you when they go down, and 
gives your users a public status page — without the per-host pricing 
of enterprise tools.

**Currently in active development.** See [docs/PRODUCT.md](docs/PRODUCT.md) 
for the product vision and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 
for the technical design.

## Why "Pharos"?

The Pharos of Alexandria was one of the Seven Wonders of the Ancient World — 
a lighthouse that guided ships safely to shore for over 1,500 years. 
Pharos (the project) does the same for your APIs.

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, shadcn/ui
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Queue & Cache:** Redis with BullMQ
- **Auth:** Better Auth
- **Deployment:** Vercel (frontend), Railway (backend + DB + Redis)

See [docs/DECISIONS.md](docs/DECISIONS.md) for the reasoning behind 
each choice.

## Status

🚧 Building in public. Follow along by watching this repo.

## License

MIT