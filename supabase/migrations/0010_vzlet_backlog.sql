-- Pisi: Vzlet — splošni seznam opravil (backlog): opravila brez datuma, ki
-- jih uporabnik kasneje prestavi med današnja opravila ali v cilje za jutri.
-- Zaženi v Supabase Dashboard -> SQL Editor.

create table if not exists public.pisi_vzlet_backlog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pisi_vzlet_backlog_user_id_idx
  on public.pisi_vzlet_backlog(user_id);

alter table public.pisi_vzlet_backlog enable row level security;

create policy "pisi_vzlet_backlog_select_own" on public.pisi_vzlet_backlog
  for select using (user_id = auth.uid());
create policy "pisi_vzlet_backlog_insert_own" on public.pisi_vzlet_backlog
  for insert with check (user_id = auth.uid());
create policy "pisi_vzlet_backlog_update_own" on public.pisi_vzlet_backlog
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_vzlet_backlog_delete_own" on public.pisi_vzlet_backlog
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_vzlet_backlog to authenticated;
