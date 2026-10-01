import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  VzletBacklogItem,
  VzletDay,
  VzletPenaltyItem,
  VzletSharedTask,
  VzletSharer,
  VzletTask,
} from "@/lib/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Vrne opravila za pogled Vzlet: vsa neopravljena (ne glede na starost — da jih
 * lahko prenesemo na danes) in nedavno opravljena (za današnji prikaz in
 * jutrišnji načrt).
 *
 * Strežnik ne pozna lokalnega dneva uporabnika, zato bere širše okno (zadnjih
 * ~3 dni po UTC); natančno razvrščanje v „danes/jutri“ naredi klient po
 * lokalnem datumu.
 */
export async function getVzletTasks(
  supabase: TypedSupabaseClient
): Promise<VzletTask[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const sinceDate = new Date(Date.now() - 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Eksplicitni filter po user_id je nujen — RLS sama po sebi tu ne
  // zadostuje, ker "shared" police (za Tabla/Cilji drugih) dovolijo tudi
  // branje opravil drugih uporabnikov, ki delijo cilje.
  const { data, error } = await supabase
    .from("pisi_vzlet_tasks")
    .select("*")
    .eq("user_id", user.id)
    .or(`done.eq.false,for_date.gte.${sinceDate}`)
    .order("for_date", { ascending: true })
    .order("done", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Zaključeni dnevi s točkami, naraščajoče po dnevu (za graf napredka). */
export async function getVzletDays(
  supabase: TypedSupabaseClient
): Promise<VzletDay[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Glej opombo v getVzletTasks — enak razlog za eksplicitni user_id filter.
  const { data, error } = await supabase
    .from("pisi_vzlet_days")
    .select("*")
    .eq("user_id", user.id)
    .order("day", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Uporabnikov seznam kazenskih opravil. */
export async function getPenaltyPool(
  supabase: TypedSupabaseClient
): Promise<VzletPenaltyItem[]> {
  const { data, error } = await supabase
    .from("pisi_vzlet_penalty_pool")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Uporabnikov splošni seznam opravil (brez datuma). Ob napaki (npr. še ne
 * pognana migracija 0010) vrne prazen seznam, da stran Misije ne pade.
 */
export async function getVzletBacklog(
  supabase: TypedSupabaseClient
): Promise<VzletBacklogItem[]> {
  const { data, error } = await supabase
    .from("pisi_vzlet_backlog")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Branje splošnega seznama ni uspelo:", error);
    return [];
  }
  return data ?? [];
}

/** Ali trenutni uporabnik deli svoje dnevne cilje. */
export async function getMyVzletSharing(
  supabase: TypedSupabaseClient
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("pisi_vzlet_sharing")
    .select("shared")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.shared ?? false;
}

/** Osebe, ki trenutno delijo svoje cilje (brez trenutnega uporabnika). */
export async function getVzletSharers(
  supabase: TypedSupabaseClient
): Promise<VzletSharer[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("pisi_vzlet_sharing")
    .select("user_id, display_name")
    .eq("shared", true);

  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.user_id !== user?.id)
    .map((r) => ({
      userId: r.user_id,
      name: r.display_name?.trim() || "Uporabnik",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sl"));
}

/**
 * Opravila izbrane osebe, ki deli cilje. RLS omeji nabor na tekoče dni
 * (včeraj–jutri po UTC); klient prikaže svoj lokalni „danes“ in „jutri“.
 */
export async function getVzletSharedTasks(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<VzletSharedTask[]> {
  const { data, error } = await supabase
    .from("pisi_vzlet_tasks")
    .select("id, title, done, is_penalty, for_date")
    .eq("user_id", userId)
    .order("done", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type VzletLeaderboardEntry = {
  userId: string;
  name: string;
  days: { day: string; points: number }[];
};

/**
 * Vsi vidni udeleženci tedenske lestvice ("Tabla") — kdor deli cilje, plus
 * trenutni uporabnik sam (da vidi svoje mesto, tudi če sam ne deli) — z
 * njihovimi dnevnimi točkami. Tedenski/skupni seštevek izračuna klient
 * (lokalni "ponedeljek tedna", glej `mondayOf`/`weekPoints` v `vzlet/score`).
 */
export async function getVzletLeaderboard(
  supabase: TypedSupabaseClient
): Promise<VzletLeaderboardEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sharingRows, error: sharingError } = await supabase
    .from("pisi_vzlet_sharing")
    .select("user_id, display_name"); // RLS: shared=true vsi + moja lastna vrstica

  if (sharingError) throw sharingError;

  const names = new Map<string, string>();
  for (const r of sharingRows ?? []) {
    names.set(r.user_id, r.display_name?.trim() || "Uporabnik");
  }
  if (!names.has(user.id)) {
    names.set(user.id, (user.email?.split("@")[0] ?? "Jaz").slice(0, 60));
  }

  const userIds = [...names.keys()];
  const { data: dayRows, error: daysError } = await supabase
    .from("pisi_vzlet_days")
    .select("user_id, day, points")
    .in("user_id", userIds); // RLS: lastne + shared=true (glej 0007_vzlet_days_shared.sql)

  if (daysError) throw daysError;

  return userIds.map((id) => ({
    userId: id,
    name: names.get(id)!,
    days: (dayRows ?? [])
      .filter((d) => d.user_id === id)
      .map((d) => ({ day: d.day, points: d.points })),
  }));
}
