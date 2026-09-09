import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default async function NastavitvePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-6 pt-14 md:pt-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Nastavitve
      </h1>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Tema
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Svetla, temna ali sistemska tema aplikacije.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Račun
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Prijavljen kot{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {user?.email}
          </span>
        </p>
      </div>
    </div>
  );
}
