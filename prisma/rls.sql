-- Kitchen OS — auth trigger + Row-Level Security
-- Run AFTER `prisma migrate` has created the tables:
--     npm run db:rls
-- Safe to re-run (N4): every policy is dropped before it's created, and the whole
-- file is one transaction, so a failure leaves the existing policies untouched.
--
-- NOTE ON THE SECURITY MODEL
-- The app's runtime data access goes through Prisma, which connects with a
-- privileged role and therefore BYPASSES RLS. Primary authorization is enforced
-- in the service layer: every query is scoped to the authenticated user id.
-- RLS below is DEFENSE IN DEPTH: it governs the `anon` / `authenticated` roles
-- used by the browser Supabase client and by Storage, so a leaked anon key or a
-- direct client query can never read another user's rows.

begin;

-- ─────────────── 1. Auto-create a profile row on signup ───────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────── 2. Enable RLS on all user-owned tables ───────────────
alter table public.profiles            enable row level security;
alter table public.user_preferences    enable row level security;
alter table public.receipts            enable row level security;
alter table public.receipt_items       enable row level security;
alter table public.inventory_items     enable row level security;
alter table public.recipes             enable row level security;
alter table public.recipe_ingredients  enable row level security;
alter table public.meal_plans          enable row level security;
alter table public.meal_plan_items     enable row level security;
alter table public.shopping_lists      enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.consumption_records enable row level security;
alter table public.notifications       enable row level security;

-- AI usage (N6) is server-only: RLS on and no policies, so the client can neither
-- read it nor reset its own allowance.
alter table public.ai_usage            enable row level security;

-- Reference tables are readable by any authenticated user, writable by no one
-- via the client (seeded/maintained server-side through Prisma).
alter table public.categories        enable row level security;
alter table public.ingredients       enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.shelf_life_rules  enable row level security;
alter table public.unit_conversions  enable row level security;

-- ─────────────── 3. Owner-only policies ───────────────
-- profiles: a user can see/update only their own row.
drop policy if exists "own profile - select" on public.profiles;
create policy "own profile - select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "own profile - update" on public.profiles;
create policy "own profile - update" on public.profiles
  for update using (auth.uid() = id);

-- Helper macro pattern: each table below is owned via user_id = auth.uid().
drop policy if exists "own - all" on public.user_preferences;
create policy "own - all" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own - all" on public.receipts;
create policy "own - all" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own - all" on public.inventory_items;
create policy "own - all" on public.inventory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own - all" on public.meal_plans;
create policy "own - all" on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own - all" on public.shopping_lists;
create policy "own - all" on public.shopping_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own - all" on public.notifications;
create policy "own - all" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipes: owned rows OR global rows (user_id is null) are readable.
drop policy if exists "own or global - select" on public.recipes;
create policy "own or global - select" on public.recipes
  for select using (user_id is null or auth.uid() = user_id);
drop policy if exists "own - write" on public.recipes;
create policy "own - write" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child tables inherit ownership through their parent. (For a FOR ALL policy
-- without WITH CHECK, Postgres applies the USING expression to writes too.)
drop policy if exists "own via receipt" on public.receipt_items;
create policy "own via receipt" on public.receipt_items
  for all using (exists (
    select 1 from public.receipts r
    where r.id = receipt_items.receipt_id and r.user_id = auth.uid()));

-- N4: ingredients of global recipes are readable by everyone but writable by no
-- client. The old single FOR ALL policy also let any user edit global recipes.
drop policy if exists "own via recipe" on public.recipe_ingredients;
drop policy if exists "own or global via recipe - select" on public.recipe_ingredients;
create policy "own or global via recipe - select" on public.recipe_ingredients
  for select using (exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and (r.user_id = auth.uid() or r.user_id is null)));
drop policy if exists "own via recipe - write" on public.recipe_ingredients;
create policy "own via recipe - write" on public.recipe_ingredients
  for all using (exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id and r.user_id = auth.uid()))
  with check (exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id and r.user_id = auth.uid()));

drop policy if exists "own via plan" on public.meal_plan_items;
create policy "own via plan" on public.meal_plan_items
  for all using (exists (
    select 1 from public.meal_plans m
    where m.id = meal_plan_items.meal_plan_id and m.user_id = auth.uid()));

drop policy if exists "own via list" on public.shopping_list_items;
create policy "own via list" on public.shopping_list_items
  for all using (exists (
    select 1 from public.shopping_lists s
    where s.id = shopping_list_items.shopping_list_id and s.user_id = auth.uid()));

drop policy if exists "own via item" on public.consumption_records;
create policy "own via item" on public.consumption_records
  for all using (exists (
    select 1 from public.inventory_items i
    where i.id = consumption_records.inventory_item_id and i.user_id = auth.uid()));

-- Reference data: any authenticated user may read.
drop policy if exists "read reference" on public.categories;
create policy "read reference" on public.categories        for select using (auth.role() = 'authenticated');
drop policy if exists "read reference" on public.ingredients;
create policy "read reference" on public.ingredients       for select using (auth.role() = 'authenticated');
drop policy if exists "read reference" on public.ingredient_aliases;
create policy "read reference" on public.ingredient_aliases for select using (auth.role() = 'authenticated');
drop policy if exists "read reference" on public.shelf_life_rules;
create policy "read reference" on public.shelf_life_rules  for select using (auth.role() = 'authenticated');
drop policy if exists "read reference" on public.unit_conversions;
create policy "read reference" on public.unit_conversions  for select using (auth.role() = 'authenticated');

commit;
