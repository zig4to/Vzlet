-- Pisi: Vzlet — točkovanje, napredek in kazenska opravila
-- Zaženi v Supabase Dashboard -> SQL Editor.
--
-- Predpona `pisi_`, eksplicitni grant za `authenticated`, RLS (user_id = auth.uid()).
-- public.set_updated_at() je iz 0001_init.sql — ne redefiniramo je.

-- ============ pisi_vzlet_tasks: oznaka kazenskega opravila ============

alter table public.pisi_vzlet_tasks
  add column if not exists is_penalty boolean not null default false;

-- ============ pisi_vzlet_days (zaključen dan + točke) ============

create table public.pisi_vzlet_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  points integer not null,
  tasks_total integer not null default 0,
  tasks_done integer not null default 0,
  all_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pisi_vzlet_days_user_day_unique unique (user_id, day)
);

create index pisi_vzlet_days_user_id_idx on public.pisi_vzlet_days(user_id);
create index pisi_vzlet_days_user_day_idx
  on public.pisi_vzlet_days(user_id, day);

create trigger pisi_vzlet_days_set_updated_at
  before update on public.pisi_vzlet_days
  for each row execute function public.set_updated_at();

alter table public.pisi_vzlet_days enable row level security;

create policy "pisi_vzlet_days_select_own" on public.pisi_vzlet_days
  for select using (user_id = auth.uid());
create policy "pisi_vzlet_days_insert_own" on public.pisi_vzlet_days
  for insert with check (user_id = auth.uid());
create policy "pisi_vzlet_days_update_own" on public.pisi_vzlet_days
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_vzlet_days_delete_own" on public.pisi_vzlet_days
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_vzlet_days to authenticated;

-- ============ pisi_vzlet_penalty_pool (seznam kazenskih opravil) ============

create table public.pisi_vzlet_penalty_pool (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create index pisi_vzlet_penalty_pool_user_id_idx
  on public.pisi_vzlet_penalty_pool(user_id);

alter table public.pisi_vzlet_penalty_pool enable row level security;

create policy "pisi_vzlet_penalty_pool_select_own" on public.pisi_vzlet_penalty_pool
  for select using (user_id = auth.uid());
create policy "pisi_vzlet_penalty_pool_insert_own" on public.pisi_vzlet_penalty_pool
  for insert with check (user_id = auth.uid());
create policy "pisi_vzlet_penalty_pool_update_own" on public.pisi_vzlet_penalty_pool
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_vzlet_penalty_pool_delete_own" on public.pisi_vzlet_penalty_pool
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_vzlet_penalty_pool to authenticated;
