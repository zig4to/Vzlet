-- Pisi: preimenovanje „Dons“ -> „Vzlet“
-- Zaženi v Supabase Dashboard -> SQL Editor.
--
-- Preimenuje tabelo pisi_dons_tasks v pisi_vzlet_tasks ter njene indekse,
-- prožilec in RLS politike. Pravice (grant) sledijo tabeli same.

alter table if exists public.pisi_dons_tasks rename to pisi_vzlet_tasks;

alter index if exists public.pisi_dons_tasks_pkey
  rename to pisi_vzlet_tasks_pkey;
alter index if exists public.pisi_dons_tasks_user_id_idx
  rename to pisi_vzlet_tasks_user_id_idx;
alter index if exists public.pisi_dons_tasks_user_date_idx
  rename to pisi_vzlet_tasks_user_date_idx;

alter trigger pisi_dons_tasks_set_updated_at on public.pisi_vzlet_tasks
  rename to pisi_vzlet_tasks_set_updated_at;

alter policy "pisi_dons_tasks_select_own" on public.pisi_vzlet_tasks
  rename to "pisi_vzlet_tasks_select_own";
alter policy "pisi_dons_tasks_insert_own" on public.pisi_vzlet_tasks
  rename to "pisi_vzlet_tasks_insert_own";
alter policy "pisi_dons_tasks_update_own" on public.pisi_vzlet_tasks
  rename to "pisi_vzlet_tasks_update_own";
alter policy "pisi_dons_tasks_delete_own" on public.pisi_vzlet_tasks
  rename to "pisi_vzlet_tasks_delete_own";
