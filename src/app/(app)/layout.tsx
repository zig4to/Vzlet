import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import SsoHashCleanup from "@/components/auth/SsoHashCleanup";
import IntroFirstRun from "@/components/vzlet/IntroFirstRun";
import VzletTabs from "@/components/vzlet/VzletTabs";
import VzletMenu from "@/components/vzlet/VzletMenu";

// Ogrodje samostojne aplikacije Vzlet: zgornja vrstica z zavihki in menijem,
// pod njo drseča vsebina. Predstavitev aplikacije se ob prvem obisku pokaže
// sama (IntroFirstRun).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  return (
    <div className="flex h-screen w-full flex-col">
      <SsoHashCleanup />
      <IntroFirstRun />
      <header className="flex items-stretch justify-between gap-1 border-b border-gray-200 bg-white pr-2 dark:border-gray-800 dark:bg-gray-900">
        <VzletTabs />
        <div className="flex items-center">
          <VzletMenu email={user?.email ?? null} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
