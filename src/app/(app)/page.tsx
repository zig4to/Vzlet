import { createClient } from "@/lib/supabase/server";
import { getVzletDays, getVzletTasks } from "@/lib/data/vzlet";
import VzletBoard from "@/components/vzlet/VzletBoard";

// „Vzlet“ / Misije — dnevni fokus na najpomembnejša opravila.
export default async function VzletPage() {
  const supabase = await createClient();
  const [tasks, days] = await Promise.all([
    getVzletTasks(supabase),
    getVzletDays(supabase),
  ]);

  return <VzletBoard tasks={tasks} days={days} />;
}
