"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyVzletSharing,
  getVzletSharedTasks,
  getVzletSharers,
} from "@/lib/data/vzlet";
import {
  isLaterTask,
  isSameDayAdded,
  liveDayPoints,
} from "@/lib/vzlet/score";
// AI ocena težavnosti je začasno izklopljena — težavnost uporabnik vnese
// ročno (neobvezno) ob dodajanju ali kasneje prek "Oceni težavnost".
// import { rateTaskDifficulty } from "@/lib/ai/difficulty";
import type {
  VzletSharedTask,
  VzletSharer,
  VzletTaskSnapshotEntry,
} from "@/lib/types/database.types";

export type VzletFormState = { error?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PENALTY_PER_SETTLE = 5;

type Supa = Awaited<ReturnType<typeof createClient>>;

// Eksplicitni user_id filter je nujen povsod, kjer beremo pisi_vzlet_tasks/
// pisi_vzlet_days brez omejitve na en id — RLS sama po sebi ne zadostuje,
// ker "shared" police (za Tabla/Cilji drugih) dovolijo tudi branje podatkov
// drugih uporabnikov, ki delijo cilje (glej tudi src/lib/data/vzlet.ts).
async function nextVzletPosition(
  supabase: Supa,
  userId: string,
  forDate: string
): Promise<number> {
  const { data } = await supabase
    .from("pisi_vzlet_tasks")
    .select("position")
    .eq("user_id", userId)
    .eq("for_date", forDate)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

export async function addVzletTaskAction(
  title: string,
  forDate: string,
  manualDifficulty: number | null = null
): Promise<VzletFormState> {
  const clean = title.trim();
  if (!clean) return { error: "Opravilo ne sme biti prazno." };
  if (!DATE_RE.test(forDate)) return { error: "Neveljaven datum." };
  if (
    manualDifficulty != null &&
    (!Number.isInteger(manualDifficulty) ||
      manualDifficulty < 1 ||
      manualDifficulty > 10)
  ) {
    return { error: "Težavnost mora biti celo število med 1 in 10." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nisi prijavljen." };
  const position = await nextVzletPosition(supabase, user.id, forDate);

  // Dodatne (isti dan dodane) naloge so vedno vredne 1 bonus točko — ocene
  // zanje ne shranimo, ker je pri točkovanju ne uporabimo.
  const nowUtcDateStr = new Date().toISOString().slice(0, 10);
  const isLater = isSameDayAdded(nowUtcDateStr, forDate);
  // const difficulty = isLater ? null : await rateTaskDifficulty(clean);
  const difficulty = isLater ? null : manualDifficulty;

  const { error } = await supabase
    .from("pisi_vzlet_tasks")
    .insert({
      title: clean.slice(0, 500),
      for_date: forDate,
      position,
      difficulty,
    });

  if (error) return { error: "Napaka pri dodajanju: " + error.message };

  revalidatePath("/", "layout");
  return {};
}

/** Ročni vnos ali sprememba težavnosti obstoječega opravila. */
export async function setVzletTaskDifficultyAction(
  id: string,
  value: number
): Promise<VzletFormState> {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    return { error: "Težavnost mora biti celo število med 1 in 10." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("pisi_vzlet_tasks")
    .update({ difficulty: value })
    .eq("id", id);

  if (error) return { error: "Napaka pri shranjevanju: " + error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function toggleVzletTaskAction(
  id: string,
  done: boolean
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("pisi_vzlet_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function renameVzletTaskAction(
  id: string,
  title: string
): Promise<void> {
  const clean = title.trim();
  if (!clean) return;
  const supabase = await createClient();
  await supabase
    .from("pisi_vzlet_tasks")
    .update({ title: clean.slice(0, 500) })
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteVzletTaskAction(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pisi_vzlet_tasks").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/**
 * Trajen posnetek opravil za en dan — shrani se v `pisi_vzlet_days.
 * tasks_snapshot`, da je pogled "Zadnji dnevi" pravilen tudi potem, ko so
 * neopravljena opravila premaknjena na kasnejši dan (glej 0008 migracijo).
 */
function buildSnapshot(
  dayTasks: {
    title: string;
    done: boolean;
    is_penalty: boolean;
    difficulty: number | null;
    for_date: string;
    created_at: string;
  }[]
): VzletTaskSnapshotEntry[] {
  return dayTasks.map((t) => ({
    title: t.title,
    done: t.done,
    isPenalty: t.is_penalty,
    isLater: isLaterTask(t, t.created_at.slice(0, 10)),
    difficulty: t.difficulty,
  }));
}

function pickPenalties(titles: string[], count: number): string[] {
  if (titles.length === 0) return [];
  const shuffled = [...titles].sort(() => Math.random() - 0.5);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(shuffled[i % shuffled.length]);
  return out;
}

/**
 * Zaključi pretekle dneve: zapiše točke v `pisi_vzlet_days`, za zamujene dneve
 * doda kazenska opravila iz bazena, nato prenese neopravljena na `todayStr`.
 * Idempotentno — že zaključeni dnevi se preskočijo.
 */
export async function settleVzletAction(
  todayStr: string
): Promise<{ missedDays: number; penaltyAdded: number }> {
  if (!DATE_RE.test(todayStr)) return { missedDays: 0, penaltyAdded: 0 };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { missedDays: 0, penaltyAdded: 0 };

  const [{ data: pastTasks }, { data: settledDays }] = await Promise.all([
    supabase
      .from("pisi_vzlet_tasks")
      .select("title, for_date, done, is_penalty, difficulty, created_at")
      .eq("user_id", user.id)
      .lt("for_date", todayStr),
    supabase
      .from("pisi_vzlet_days")
      .select("day, all_done, settled_at")
      .eq("user_id", user.id)
      .lt("day", todayStr),
  ]);

  const byDay = new Map<string, NonNullable<typeof pastTasks>>();
  for (const t of pastTasks ?? []) {
    const arr = byDay.get(t.for_date) ?? [];
    arr.push(t);
    byDay.set(t.for_date, arr);
  }
  // Dnevi, ki so že poravnani (`settled_at`) ali v celoti (živo) zaključeni,
  // se ne dotikamo. Brez tega bi se zamujen dan ob vsakem nalaganju ponovno
  // ocenil — po prenosu neopravljenih nalog na njem ostanejo le opravljene,
  // kar je dalo ponovno -125 + nove kazni (ali pa tiho "uspešen" dan).
  const alreadyFinal = new Set(
    (settledDays ?? [])
      .filter((d) => d.all_done || d.settled_at != null)
      .map((d) => d.day)
  );
  const settledAt = new Date().toISOString();

  const rows: {
    user_id: string;
    day: string;
    points: number;
    tasks_total: number;
    tasks_done: number;
    all_done: boolean;
    tasks_snapshot: VzletTaskSnapshotEntry[];
    settled_at: string;
  }[] = [];
  let missedDays = 0;
  for (const [day, dayTasks] of byDay) {
    if (dayTasks.length < 1 || alreadyFinal.has(day)) continue;
    const live = liveDayPoints(dayTasks);
    const points = live.allDone ? live.points : -125;
    rows.push({
      user_id: user.id,
      day,
      points,
      tasks_total: live.tasksTotal,
      tasks_done: live.tasksDone,
      all_done: live.allDone,
      tasks_snapshot: buildSnapshot(dayTasks),
      settled_at: settledAt,
    });
    if (!live.allDone) missedDays += 1;
  }

  if (rows.length > 0) {
    await supabase
      .from("pisi_vzlet_days")
      .upsert(rows, { onConflict: "user_id,day" });
  }

  // Kazenska opravila za zamujene dneve.
  let penaltyAdded = 0;
  if (missedDays > 0) {
    const { data: pool } = await supabase
      .from("pisi_vzlet_penalty_pool")
      .select("title");
    const titles = pickPenalties(
      (pool ?? []).map((p) => p.title),
      Math.min(missedDays, MAX_PENALTY_PER_SETTLE)
    );
    if (titles.length > 0) {
      const base = await nextVzletPosition(supabase, user.id, todayStr);
      await supabase.from("pisi_vzlet_tasks").insert(
        titles.map((title, i) => ({
          title,
          for_date: todayStr,
          is_penalty: true,
          position: base + i,
        }))
      );
      penaltyAdded = titles.length;
    }
  }

  // Prenos neopravljenih preteklih opravil na danes.
  await supabase
    .from("pisi_vzlet_tasks")
    .update({ for_date: todayStr })
    .eq("user_id", user.id)
    .eq("done", false)
    .lt("for_date", todayStr);

  revalidatePath("/", "layout");
  return { missedDays, penaltyAdded };
}

/**
 * Sprotna (živa) sinhronizacija točk za DANAŠNJI dan v `pisi_vzlet_days` —
 * kliče se ob vsaki spremembi današnjih opravil, da se točke takoj poznajo
 * na strani "Napredek" in v "Tabli", namesto da čakajo na jutrišnjo
 * `settleVzletAction`. Glej `liveDayPoints` za pravila (vnaprej načrtovana
 * opravila štejejo šele, ko je dan v celoti zaključen; kasneje dodana
 * opravila +1 takoj ob vsakem odkljukanju).
 */
export async function syncTodayPointsAction(todayStr: string): Promise<void> {
  if (!DATE_RE.test(todayStr)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: todayTasks } = await supabase
    .from("pisi_vzlet_tasks")
    .select("title, done, created_at, for_date, is_penalty, difficulty")
    .eq("user_id", user.id)
    .eq("for_date", todayStr);

  if (!todayTasks || todayTasks.length === 0) {
    await supabase
      .from("pisi_vzlet_days")
      .delete()
      .eq("user_id", user.id)
      .eq("day", todayStr);
    revalidatePath("/", "layout");
    return;
  }

  const live = liveDayPoints(todayTasks);

  await supabase.from("pisi_vzlet_days").upsert(
    {
      user_id: user.id,
      day: todayStr,
      points: live.points,
      tasks_total: live.tasksTotal,
      tasks_done: live.tasksDone,
      all_done: live.allDone,
      tasks_snapshot: buildSnapshot(todayTasks),
    },
    { onConflict: "user_id,day" }
  );

  revalidatePath("/", "layout");
}

// ===== Kazenski seznam (pool) =====

async function nextPenaltyPoolPosition(supabase: Supa): Promise<number> {
  const { data } = await supabase
    .from("pisi_vzlet_penalty_pool")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

export async function addPenaltyPoolAction(
  _prevState: VzletFormState,
  formData: FormData
): Promise<VzletFormState> {
  const clean = String(formData.get("title") ?? "").trim();
  if (!clean) return { error: "Vnos ne sme biti prazen." };

  const supabase = await createClient();
  const position = await nextPenaltyPoolPosition(supabase);
  const { error } = await supabase
    .from("pisi_vzlet_penalty_pool")
    .insert({ title: clean.slice(0, 500), position });

  if (error) return { error: "Napaka pri dodajanju: " + error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function deletePenaltyPoolAction(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pisi_vzlet_penalty_pool").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ===== Splošni seznam opravil (backlog) =====

async function nextBacklogPosition(supabase: Supa): Promise<number> {
  const { data } = await supabase
    .from("pisi_vzlet_backlog")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

export async function addBacklogAction(title: string): Promise<VzletFormState> {
  const clean = title.trim();
  if (!clean) return { error: "Opravilo ne sme biti prazno." };

  const supabase = await createClient();
  const position = await nextBacklogPosition(supabase);
  const { error } = await supabase
    .from("pisi_vzlet_backlog")
    .insert({ title: clean.slice(0, 500), position });

  if (error) return { error: "Napaka pri dodajanju: " + error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteBacklogAction(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pisi_vzlet_backlog").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/**
 * Prestavi opravilo s splošnega seznama med opravila za `forDate` (danes ali
 * jutri). Za točkovanje velja enako kot pri ročnem dodajanju: prestavljeno
 * za danes je "dodatna naloga" (+1), za jutri pa vnaprej načrtovano (core).
 */
export async function moveBacklogToDayAction(
  id: string,
  forDate: string
): Promise<VzletFormState> {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("pisi_vzlet_backlog")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  if (!item) return { error: "Opravila ni več na seznamu." };

  const res = await addVzletTaskAction(item.title, forDate);
  if (res.error) return res;

  await supabase.from("pisi_vzlet_backlog").delete().eq("id", id);
  revalidatePath("/", "layout");
  return {};
}

// ===== Deljenje dnevnih ciljev =====

/** Vklopi/izklopi deljenje. Vrne dejansko shranjeno stanje. */
export async function setVzletSharingAction(shared: boolean): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const displayName = (user.email?.split("@")[0] ?? "Uporabnik").slice(0, 60);

  const { error } = await supabase
    .from("pisi_vzlet_sharing")
    .upsert(
      { user_id: user.id, shared, display_name: displayName },
      { onConflict: "user_id" }
    );
  if (error) return !shared;

  revalidatePath("/", "layout");
  return shared;
}

/** Trenutno stanje deljenja za prijavljenega uporabnika. */
export async function getMyVzletSharingAction(): Promise<boolean> {
  const supabase = await createClient();
  return getMyVzletSharing(supabase);
}

/** Osebe, ki trenutno delijo svoje cilje. */
export async function getVzletSharersAction(): Promise<VzletSharer[]> {
  const supabase = await createClient();
  return getVzletSharers(supabase);
}

/** Cilji izbrane osebe (za pogled „Cilji drugih“). */
export async function getVzletSharedTasksAction(
  userId: string
): Promise<VzletSharedTask[]> {
  if (!userId) return [];
  const supabase = await createClient();
  return getVzletSharedTasks(supabase, userId);
}
