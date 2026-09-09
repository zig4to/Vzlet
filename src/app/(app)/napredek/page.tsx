import { createClient } from "@/lib/supabase/server";
import {
  getPenaltyPool,
  getVzletDays,
  getVzletTasks,
} from "@/lib/data/vzlet";
import VzletProgress from "@/components/vzlet/VzletProgress";

// Vzlet / Napredek — graf točk, niz, rang, kazenski seznam.
export default async function VzletNapredekPage() {
  const supabase = await createClient();
  const [days, tasks, pool] = await Promise.all([
    getVzletDays(supabase),
    getVzletTasks(supabase),
    getPenaltyPool(supabase),
  ]);

  return <VzletProgress days={days} tasks={tasks} pool={pool} />;
}
