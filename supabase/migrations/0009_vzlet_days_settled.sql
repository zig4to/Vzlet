-- Pisi: Vzlet — oznaka, da je bil dan že poravnan (settleVzletAction). Brez
-- nje se je poravnava ob vsakem nalaganju strani ponovila za dneve z
-- all_done = false (ponovna animacija -125 in nova kazenska opravila).
-- Zaženi v Supabase Dashboard -> SQL Editor.

alter table public.pisi_vzlet_days
  add column if not exists settled_at timestamptz;

-- Obstoječi pretekli dnevi, ki so bili že poravnani (uspešni ali -125).
update public.pisi_vzlet_days
  set settled_at = now()
  where settled_at is null
    and day < current_date
    and (all_done or points = -125);
