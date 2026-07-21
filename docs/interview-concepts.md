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