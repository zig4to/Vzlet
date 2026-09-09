-- Pisi: Dons — dnevni fokus na najpomembnejša opravila
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`).
--
-- Ta Supabase projekt je skupen z aplikacijo "Posel", zato ima tabela predpono
-- `pisi_`, pravice za vlogo `authenticated` pa so podeljene eksplicitno.
-- Dostop do vrstic ureja RLS (user_id = auth.uid()).
--
-- Funkcija public.set_updated_at() je ustvarjena v 0001_init.sql — tukaj je ne
-- redefiniramo, le nanjo vežemo trigger.

-- ============ pisi_dons_tasks (dnevno opravilo) ============

create table public.pisi_dons_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  for_date date not null,
  done boolean not null default false,
  done_at timestamptz,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pisi_dons_tasks_user_id_idx on public.pisi_dons_tasks(user_id);
create index pisi_dons_tasks_user_date_idx
  on public.pisi_dons_tasks(user_id, for_date);

create trigger pisi_dons_tasks_set_updated_at
  before update on public.pisi_dons_tasks
  for each row execute function public.set_updated_at();

alter table public.pisi_dons_tasks enable row level security;

create policy "pisi_dons_tasks_select_own" on public.pisi_dons_tasks
  for select using (user_id = auth.uid());
create policy "pisi_dons_tasks_insert_own" on public.pisi_dons_tasks
  for insert with check (user_id = auth.uid());
create policy "pisi_dons_tasks_update_own" on public.pisi_dons_tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_dons_tasks_delete_own" on public.pisi_dons_tasks
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_dons_tasks to authenticated;
