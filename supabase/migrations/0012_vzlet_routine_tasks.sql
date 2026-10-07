-- Pisi: Vzlet — samodejno dodajanje rutin med dnevna opravila.
-- `routine_id` poveže kopijo z rutino (taka opravila so vedno "core"),
-- `generated_until` pa hrani zadnji dan, za katerega je kopija že nastala —
-- da se ročno izbrisana kopija ob naslednjem nalaganju ne pojavi znova.
-- Zaženi v Supabase Dashboard -> SQL Editor.

alter table public.pisi_vzlet_tasks
  add column if not exists routine_id uuid
    references public.pisi_vzlet_routines(id) on delete set null;

-- Največ ena kopija rutine na dan (NULL-i so med sabo različni, zato
-- običajnih opravil ne omejuje).
create unique index if not exists pisi_vzlet_tasks_routine_day_uniq
  on public.pisi_vzlet_tasks(routine_id, for_date);

alter table public.pisi_vzlet_routines
  add column if not exists generated_until date;
