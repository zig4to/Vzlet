-- Pisi: Vzlet — rutinski seznam opravil: ponavljajoča se opravila, ki
-- veljajo do datuma `valid_until` (vključno). Za razliko od splošnega
-- seznama se ob prestavitvi med današnja/jutrišnja opravila NE izbrišejo.
-- Zaženi v Supabase Dashboard -> SQL Editor.

create table if not exists public.pisi_vzlet_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  valid_until date not null,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pisi_vzlet_routines_user_id_idx
  on public.pisi_vzlet_routines(user_id);

alter table public.pisi_vzlet_routines enable row level security;

create policy "pisi_vzlet_routines_select_own" on public.pisi_vzlet_routines
  for select using (user_id = auth.uid());
create policy "pisi_vzlet_routines_insert_own" on public.pisi_vzlet_routines
  for insert with check (user_id = auth.uid());
create policy "pisi_vzlet_routines_update_own" on public.pisi_vzlet_routines
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_vzlet_routines_delete_own" on public.pisi_vzlet_routines
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_vzlet_routines to authenticated;
