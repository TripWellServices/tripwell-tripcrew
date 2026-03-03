# Database + Vercel + Prisma: Intentional Env Configuration

This doc explains our **intentional** use of `DATABASE_PRISMA_DATABASE_URL` (not `DATABASE_URL`) for the Prisma datasource, and why we do not revert to `DATABASE_URL`.

---

## Cursor Note – Prisma Env Configuration

We are **intentionally** using:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_PRISMA_DATABASE_URL")
}
```

**instead of** `url = env("DATABASE_URL")`.

### Why?

- **Vercel’s Prisma integration** automatically sets:
  - `DATABASE_URL` → **direct** Postgres URL (`postgres://...@db.prisma.io:5432`)
  - `DATABASE_PRISMA_DATABASE_URL` → **Prisma Accelerate** URL (`prisma+postgres://...`)

- On **Vercel serverless**, direct Postgres connections fail due to connection pooling limits.

- The integration **locks** `DATABASE_URL` and does **not** allow overriding it in project settings.

- Therefore we **intentionally** point Prisma at `DATABASE_PRISMA_DATABASE_URL`, which is the Accelerate connection string and works correctly in serverless environments.

**This is not a workaround for schema issues.**  
**This is an intentional serverless connection configuration.**

**Do not revert to `DATABASE_URL`** unless the Vercel integration behavior changes.

---

## Two Connection Types (Reference)

| Type | URL shape | Where it works |
|------|-----------|----------------|
| **Direct Postgres** | `postgres://...@db.prisma.io:5432/postgres?sslmode=require` | Local dev, long-lived servers. **Not** from Vercel serverless. |
| **Prisma Accelerate** | `prisma+postgres://accelerate.prisma-data.net/?api_key=...` | Serverless (Vercel), connection pooling. |

---

## Local Development

- In `.env` (or `.env.local`), set **`DATABASE_PRISMA_DATABASE_URL`**.
- For local dev you can use either:
  - The **Accelerate** URL (same as production), or
  - A **direct** Postgres URL to a local or remote Postgres instance (e.g. `postgres://user:pass@localhost:5432/mydb`).

`prisma generate` and the app read the datasource URL from `DATABASE_PRISMA_DATABASE_URL` only.

---

## If Something Breaks

1. **Vercel:** Confirm `DATABASE_PRISMA_DATABASE_URL` is set by the Prisma integration (Accelerate URL). You do **not** need to override `DATABASE_URL`.
2. **Schema:** The datasource must use `env("DATABASE_PRISMA_DATABASE_URL")`. Do not change it back to `DATABASE_URL` without a clear reason (e.g. Vercel changing how the integration works).

---

## Schema / migrations out of sync (e.g. "TripCrew.handle does not exist")

If you see **`The column 'TripCrew.handle' does not exist in the current database`** (or similar), the production DB is behind the Prisma schema. Apply pending migrations:

1. **From your machine** (with production DB URL in env):
   ```bash
   export DATABASE_PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
   npx prisma migrate deploy
   ```
   Or use the **direct** Postgres URL for the same DB if your CLI can’t use Accelerate.

2. **Or run the migration SQL by hand** in your provider’s SQL console (e.g. Prisma Data Platform), using the contents of `prisma/migrations/20260303000000_add_tripcrew_handle/migration.sql`.

After the migration is applied, redeploy or retry; the error should stop.
