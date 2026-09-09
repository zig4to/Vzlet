-- Pisi: Vzlet — trajen posnetek opravil za vsak zaključen dan (za pogled
-- "Zadnji dnevi" na strani Napredek: prikaz, kaj je bilo tisti dan
-- opravljeno/ne, tudi potem ko so neopravljena opravila premaknjena naprej).
-- Zaženi v Supabase Dashboard -> SQL Editor.

alter table public.pisi_vzlet_days
  add column if not exists tasks_snapshot jsonb;
