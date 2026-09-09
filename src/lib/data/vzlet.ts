import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
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
  const sinceDate = new Date(Date.now() - 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("pisi_vzlet_tasks")
    .select("*")
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
  const { data, error } = await supabase
    .from("pisi_vzlet_days")
    .select("*")
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
 * Opravila izbrane osebe, ki deli cilje. RLS omeji nabor na tekoče dni;
 * klient prikaže samo svoj lokalni „danes“.
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
