import { createClient } from "@/lib/supabase/server";
import { getVzletLeaderboard } from "@/lib/data/vzlet";
import VzletTabla from "@/components/vzlet/VzletTabla";

// Vzlet / Tabla — tedenska lestvica tistih, ki delijo cilje.
export default async function VzletTablaPage() {
  const supabase = await createClient();
  const entries = await getVzletLeaderboard(supabase);

  return <VzletTabla entries={entries} />;
}
