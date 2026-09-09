"use client";

import clsx from "@/lib/utils/clsx";
import type { VzletLeaderboardEntry } from "@/lib/data/vzlet";
import { mondayOf, totalPoints, weekPoints } from "@/lib/vzlet/score";
import { IconTrophy } from "@/components/ui/icons";

type Ranked = {
  userId: string;
  name: string;
  week: number;
  total: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

/** Razkritje stopničk — nedelja od 21h dalje (lokalni čas), sicer tekoč seznam. */
function isRevealTime(d: Date): boolean {
  return d.getDay() === 0 && d.getHours() >= 21;
}

function Avatar({ name, className }: { name: string; className: string }) {
  return (
    <span
      className={clsx(
        "flex flex-shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        className
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

// Vzlet / Tabla — čez teden tekoč seznam (vsi udeleženci, razvrščeni po
// tedenskih točkah), v nedeljo od 21h dalje pa podij za prva tri mesta.
// Prikaže se ne glede na število udeležencev (tudi če je samo eden).
export default function VzletTabla({
  entries,
}: {
  entries: VzletLeaderboardEntry[];
}) {
  const now = new Date();
  const reveal = isRevealTime(now);
  const weekStart = mondayOf(now);

  const ranked: Ranked[] = entries
    .map((e) => ({
      userId: e.userId,
      name: e.name,
      week: weekPoints(e.days, weekStart),
      total: totalPoints(e.days),
    }))
    .sort((a, b) => b.week - a.week);

  const podium = ranked.slice(0, 3);
  // Vizualni vrstni red stopničk: 2. mesto, 1. mesto (na sredini, najvišje), 3. mesto.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(
    (p): p is Ranked => !!p
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-6 pt-4">
      <div className="flex items-center gap-2">
        <IconTrophy className="h-6 w-6 text-amber-500" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Tabla
        </h1>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {reveal
          ? "Teden je zaključen — končna razvrstitev."
          : "Tekoča razvrstitev tega tedna — stopničke se razkrijejo v nedeljo ob 21h."}
      </p>

      {reveal ? (
        <div className="flex items-end justify-center gap-3 rounded-xl border border-gray-200 p-4 pt-8 dark:border-gray-800">
          {podiumOrder.map((p) => {
            const place = podium.indexOf(p); // 0 = 1. mesto, 1 = 2., 2 = 3.
            return (
              <div key={p.userId} className="flex flex-col items-center gap-1.5">
                <Avatar
                  name={p.name}
                  className={
                    place === 0 ? "h-14 w-14 text-lg" : "h-11 w-11 text-base"
                  }
                />
                <p className="max-w-[5.5rem] truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {p.name}
                </p>
                <p className="text-base font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {p.week} točk
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {p.total} skupaj
                </p>
                <div
                  className={clsx(
                    "flex w-16 items-start justify-center rounded-t-lg pt-1 text-lg",
                    place === 0
                      ? "h-20 bg-amber-200 dark:bg-amber-900/60"
                      : place === 1
                        ? "h-14 bg-gray-200 dark:bg-gray-700"
                        : "h-10 bg-orange-200 dark:bg-orange-900/50"
                  )}
                >
                  {MEDALS[place]}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {ranked.map((p, i) => (
              <li
                key={p.userId}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span className="w-5 flex-shrink-0 text-center text-lg text-gray-400">
                  {i + 1}
                </span>
                <Avatar name={p.name} className="h-8 w-8 text-sm" />
                <span className="min-w-0 flex-1 truncate text-lg font-medium text-gray-800 dark:text-gray-200">
                  {p.name}
                </span>
                <span className="flex flex-shrink-0 flex-col items-end text-right">
                  <span className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {p.week} točk
                  </span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    {p.total} skupaj
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
