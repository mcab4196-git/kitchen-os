# Kitchen OS

Personal kitchen inventory, expiry tracking, and AI meal planning. Mobile-first PWA.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · PostgreSQL (Supabase) · Prisma · Supabase Auth + Storage · Vercel.

---

## Milestone M0 — Foundation (this build)

What works after setup:

- Email/password auth (sign up, sign in, sign out) via Supabase.
- Route guarding: unauthenticated users are redirected to `/login`.
- The full database schema, migrated and seeded (categories, ingredients + aliases, shelf-life rules, unit conversions).
- Row-Level Security enabled on every user-owned table.
- A working app shell: dashboard (reading real, user-scoped data through Prisma) + bottom navigation + placeholder tabs.
- Installable PWA (manifest + icon).

Inventory entry, receipt scanning, recipes, etc. arrive in later milestones.

---

## Prerequisites

- **Node.js 20+** (built and tested on 22).
- A free **Supabase** project → https://supabase.com
- `psql` on your PATH (ships with the Postgres client tools) for applying RLS.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project and collect credentials

From your Supabase dashboard:

- **Project Settings → API**: `Project URL` and the `anon` `public` key.
- **Project Settings → Database → Connection string**: the pooled (Transaction, port `6543`) and direct (Session, port `5432`) URIs.

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`. The two Postgres URLs matter:

- `DATABASE_URL` → **pooled** connection, port `6543`, must end with `?pgbouncer=true`. Used at runtime.
- `DIRECT_URL` → **direct** connection, port `5432`. Used for migrations, RLS, and seeding.

### 4. Create the schema

```bash
npm run db:generate      # generate the Prisma client
npm run db:migrate       # create tables (uses DIRECT_URL)
```

### 5. Apply Row-Level Security + the signup trigger

```bash
npm run db:rls           # runs prisma/rls.sql against DIRECT_URL via psql
```

> Alternatively, paste `prisma/rls.sql` into the Supabase SQL editor and run it.

### 6. Seed reference data

```bash
npm run db:seed
```

Expected output ends with something like:
`Seed complete: { categories: 12, ingredients: 23, aliases: ~70, shelfLifeRules: 22, units: 14 }`

### 7. Run

```bash
npm run dev
```

Open http://localhost:3000 → you'll be redirected to `/login`.

---

## Verify M0 works

1. **Sign up** with an email + password. If email confirmation is on in Supabase, confirm via the emailed link (it returns to `/auth/callback`). For local dev you can disable "Confirm email" in Supabase → Authentication → Providers → Email.
2. After sign-in you land on `/dashboard`, greeted by time of day, with three zero-valued stat cards and an empty-state prompt. This confirms **auth + Prisma + user-scoped queries** all work end-to-end.
3. In Supabase → Table editor → `profiles`, confirm a row was auto-created for your user (the trigger). A `user_preferences` row is created on first dashboard load.
4. Tap through the bottom nav (Inventory / Meals / Shopping / Settings). **Settings → Sign out** returns you to `/login` and the guard blocks `/dashboard` until you sign back in.
5. **RLS smoke test (optional):** create a second account; confirm neither can see the other's `profiles`/`inventory_items` rows via the Supabase client.

---

## Security model (read this)

Runtime data access goes through **Prisma**, which connects with a privileged role and therefore **bypasses RLS**. Primary authorization is enforced in the **service/query layer**: every query is scoped to the authenticated `user.id` (see the dashboard queries for the pattern). **RLS is defense-in-depth** — it governs the `anon`/`authenticated` roles used by the browser Supabase client and Storage, so a leaked anon key can never read another user's rows. Keep both layers; don't rely on either alone.

---

## Project structure

```
prisma/
  schema.prisma      # full data model
  rls.sql            # signup trigger + RLS policies
  seed.ts            # reference data
src/
  app/
    (auth)/login/    # login page + auth server actions
    (app)/           # authenticated shell (dashboard + tab stubs)
    auth/callback/   # email-confirm / OAuth callback
  components/        # bottom nav, UI primitives
  lib/
    supabase/        # browser / server / middleware clients
    env.ts           # validated env
  server/db.ts       # Prisma singleton
middleware.ts        # session refresh + route guard
```

---

## Common issues

- **`Environment variable not found: DATABASE_URL`** — you haven't created `.env`, or you're running a DB command that needs `DIRECT_URL`.
- **Prisma `prepared statement` errors** — your `DATABASE_URL` is missing `?pgbouncer=true`.
- **Redirected to `/login` in a loop** — the anon key or Supabase URL is wrong, so `getUser()` never resolves a session.
- **Migrations hang** — you pointed `db:migrate` at the pooled URL; migrations must use the direct (`5432`) connection.

---

## Next: Milestone M1 — Inventory core

Manual add/edit/delete inventory, search/filter/sort, the expiry engine with status badges, and the cook/deduction flow. The schema and seed data here already support all of it.
