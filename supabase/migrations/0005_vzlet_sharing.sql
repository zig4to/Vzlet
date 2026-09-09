-- Pisi: Vzlet — deljenje dnevnih ciljev z drugimi uporabniki
-- Zaženi v Supabase Dashboard -> SQL Editor.
--
-- Predpona `pisi_`, eksplicitni grant za vlogo `authenticated`.
-- Uporabnik lahko vklopi deljenje svojih dnevnih ciljev; drugi prijavljeni
-- uporabniki lahko takrat berejo njegova opravila za tekoče dni.
-- public.set_updated_at() je iz 0001_init.sql — ne redefiniramo je.

-- ============ pisi_vzlet_sharing (zastavica deljenja + prikazno ime) ============

create table public.pisi_vzlet_sharing (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  shared boolean not null default false,
  display_name text not null default '',
  updated_at timestamptz not null default now()
);

create trigger pisi_vzlet_sharing_set_updated_at
  before update on public.pisi_vzlet_sharing
  for each row execute function public.set_updated_at();

alter table public.pisi_vzlet_sharing enable row level security;

-- Vsak prijavljen uporabnik vidi svojo vrstico in vrstice tistih, ki delijo.
create policy "pisi_vzlet_sharing_select" on public.pisi_vzlet_sharing
  for select using (shared = true or user_id = auth.uid());
create policy "pisi_vzlet_sharing_insert_own" on public.pisi_vzlet_sharing
  for insert with check (user_id = auth.uid());
create policy "pisi_vzlet_sharing_update_own" on public.pisi_vzlet_sharing
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_vzlet_sharing_delete_own" on public.pisi_vzlet_sharing
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_vzlet_sharing to authenticated;

-- ============ pisi_vzlet_tasks: branje ciljev tistih, ki delijo ============
-- Poleg obstoječe politike „own“ dovolimo branje opravil uporabnikov z
-- vklopljenim deljenjem — le za tekoče dni (včeraj/danes/jutri po UTC, da
-- pokrijemo časovni pas; klient prikaže samo lokalni „danes“).

create policy "pisi_vzlet_tasks_select_shared" on public.pisi_vzlet_tasks
  for select using (
    for_date between current_date - 1 and current_date + 1
    and exists (
      select 1 from public.pisi_vzlet_sharing s
      where s.user_id = pisi_vzlet_tasks.user_id and s.shared = true
    )
  );
