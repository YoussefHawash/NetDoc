# NetDoc

Enterprise network documentation tool: device/site/subnet inventory, IP address
management (with CIDR-aware allocation views), an interactive topology canvas,
VLAN and VPN tunnel registries, static IP and ISP IP tracking, and a printable
report — all in Next.js, backed by Postgres via Prisma.

## Local development

1. Get a Postgres database reachable from your machine (a free
   [Neon](https://neon.tech) project works well, or run one locally: see
   below).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (and `DIRECT_URL` if
   your provider gives you a separate pooled/direct connection string pair).
3. Install dependencies and apply migrations:

   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed   # optional: loads sample sites/devices/subnets
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Running Postgres locally with Docker

```bash
docker run -d --name netdoc-postgres -e POSTGRES_PASSWORD=netdoc -e POSTGRES_DB=netdoc -p 5433:5432 postgres:16-alpine
```

Then set `DATABASE_URL="postgresql://postgres:netdoc@localhost:5433/netdoc"` in `.env`.

## Deploying to Vercel

1. Push this repo to GitHub (already done) and import it in
   [Vercel](https://vercel.com/new).
2. Provision a Postgres database — the simplest path is Vercel's own
   Postgres integration (Project → Storage → Create Database), which injects
   connection env vars automatically. Any Postgres provider (Neon, Supabase,
   RDS, etc.) works too.
3. In Project Settings → Environment Variables, set:
   - `DATABASE_URL` — the connection string the app uses at runtime. If your
     provider gives you a pooled connection string (hostname often contains
     `-pooler`, or a var like `POSTGRES_PRISMA_URL`), use that here.
   - `DIRECT_URL` (optional) — a direct, non-pooled connection string used
     only when running migrations during build. Some connection poolers
     reject the DDL statements migrations need. If you only have one
     connection string, skip this and `DATABASE_URL` is used for migrations
     too.
4. Deploy. The build runs `prisma migrate deploy` before `next build`, so
   your production database schema stays in sync automatically on every
   deploy.

Note: several pages (dashboard, subnets, sites, topology, report, etc.) are
statically prerendered at build time and query the database while doing so —
`DATABASE_URL` must be set and reachable *before* the build runs, not just at
runtime.

## Tech stack

- Next.js App Router + Server Actions (no separate API layer)
- Prisma 7 (driver adapters) + Postgres
- Tailwind CSS + shadcn/ui (Base UI)
- React Flow (`@xyflow/react`) for the topology canvas
