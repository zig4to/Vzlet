"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyVzletSharing,
  getVzletSharedTasks,
  getVzletSharers,
} from "@/lib/data/vzlet";
import { dayPoints } from "@/lib/vzlet/score";
import type {
  VzletSharedTask,
  VzletSharer,
} from "@/lib/types/database.types";

export type VzletFormState = { error?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PENALTY_PER_SETTLE = 5;

type Supa = Awaited<ReturnType<typeof createClient>>;

async function nextVzletPosition(supabase: Supa, forDate: string): Promise<number> {
  const { data } = await supabase
    .from("pisi_vzlet_tasks")
    .select("position")
    .eq("for_date", forDate)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

export async function addVzletTaskAction(
  title: string,
  forDate: string
): Promise<VzletFormState> {
  const clean = title.trim();
  if (!clean) return { error: "Opravilo ne sme biti prazno." };
  if (!DATE_RE.test(forDate)) return { error: "Neveljaven datum." };

  const supabase = await createClient();
  const position = await nextVzletPosition(supabase, forDate);

  const { error } = await supabase
    .from("pisi_vzlet_tasks")
    .insert({ title: clean.slice(0, 500), for_date: forDate, position });

  if (error) return { error: "Napaka pri dodajanju: " + error.message };

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

  const [{ data: pastTasks }, { data: settledDays }] = await Promise.all([
    supabase
      .from("pisi_vzlet_tasks")
      .select("for_date, done")
      .lt("for_date", todayStr),
    supabase.from("pisi_vzlet_days").select("day").lt("day", todayStr),
  ]);

  const byDay = new Map<string, { total: number; done: number }>();
  for (const t of pastTasks ?? []) {
    const e = byDay.get(t.for_date) ?? { total: 0, done: 0 };
    e.total += 1;
    if (t.done) e.done += 1;
    byDay.set(t.for_date, e);
  }
  const already = new Set((settledDays ?? []).map((d) => d.day));

  const rows: {
    day: string;
    points: number;
    tasks_total: number;
    tasks_done: number;
    all_done: boolean;
  }[] = [];
  let missedDays = 0;
  for (const [day, { total, done }] of byDay) {
    if (total < 1 || already.has(day)) continue;
    const allDone = done === total;
    const points = dayPoints(total, done);
    rows.push({
      day,
      points,
      tasks_total: total,
      tasks_done: done,
      all_done: allDone,
    });
    if (points < 0) missedDays += 1;
  }

  if (rows.length > 0) {
    await supabase.from("pisi_vzlet_days").insert(rows);
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
      const base = await nextVzletPosition(supabase, todayStr);
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
    .eq("done", false)
    .lt("for_date", todayStr);

  revalidatePath("/", "layout");
  return { missedDays, penaltyAdded };
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
