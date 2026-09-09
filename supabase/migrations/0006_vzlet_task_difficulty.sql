-- Pisi: Vzlet — AI/ročna ocena težavnosti opravila (1–10) za novo točkovanje
-- Zaženi v Supabase Dashboard -> SQL Editor.
--
-- Uspešen dan je odslej vreden 50 + vsota `difficulty` vseh opravil tega dne,
-- zamujen dan odbije -500 (glej src/lib/vzlet/score.ts).

alter table public.pisi_vzlet_tasks
  add column if not exists difficulty smallint
    constraint pisi_vzlet_tasks_difficulty_range
    check (difficulty is null or (difficulty between 1 and 10));
