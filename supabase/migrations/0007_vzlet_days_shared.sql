-- Pisi: Vzlet — branje dnevnih točk tistih, ki delijo (za tedensko lestvico "Tabla")
-- Zaženi v Supabase Dashboard -> SQL Editor.
--
-- Dodatna (ne nadomestna) policy — obstoječa pisi_vzlet_days_select_own iz
-- 0004_vzlet_progress.sql ostane, Postgres RLS police se OR-ajo.

create policy "pisi_vzlet_days_select_shared" on public.pisi_vzlet_days
  for select using (
    exists (
      select 1 from public.pisi_vzlet_sharing s
      where s.user_id = pisi_vzlet_days.user_id and s.shared = true
    )
  );
