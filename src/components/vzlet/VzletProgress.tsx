"use client";

import { useState } from "react";
import clsx from "@/lib/utils/clsx";
import type {
  VzletDay,
  VzletPenaltyItem,
  VzletTask,
  VzletTaskSnapshotEntry,
} from "@/lib/types/database.types";
import {
  bestStreak,
  cumulativeSeries,
  currentStreak,
  totalPoints,
} from "@/lib/vzlet/score";
import { rankForPoints } from "@/lib/vzlet/rank";
import {
  IconCheck,
  IconChevronDown,
  IconFlame,
  IconRocket,
} from "@/components/ui/icons";
import ScoreChart, { type ChartPoint } from "@/components/vzlet/ScoreChart";
import PenaltyPoolEditor from "@/components/vzlet/PenaltyPoolEditor";
import IntroDialog from "@/components/vzlet/IntroDialog";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function short(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "short",
  });
}

/** Razvrsti trajen posnetek dneva v tri skupine za pogled "Zadnji dnevi". */
function groupSnapshot(snapshot: VzletTaskSnapshotEntry[] | null) {
  const entries = snapshot ?? [];
  return {
    today: entries.filter((t) => t.done && !t.isLater),
    later: entries.filter((t) => t.done && t.isLater),
    notDone: entries.filter((t) => !t.done),
  };
}

function SnapshotGroup({
  title,
  entries,
}: {
  title: string;
  entries: VzletTaskSnapshotEntry[];
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {entries.map((t, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span
              className={clsx(
                "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2",
                t.done
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 text-transparent dark:border-gray-600"
              )}
            >
              <IconCheck className="h-2.5 w-2.5" />
            </span>
            <span
              className={clsx(
                "flex-1",
                t.done
                  ? "text-gray-400 line-through dark:text-gray-500"
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              {t.title}
            </span>
            {t.isPenalty && (
              <span className="flex-shrink-0 text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                kazen
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VzletProgress({
  days,
  tasks,
  pool,
}: {
  days: VzletDay[];
  tasks: VzletTask[];
  pool: VzletPenaltyItem[];
}) {
  const [introOpen, setIntroOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const todayStr = localDateStr(new Date());
  const todayTasks = tasks.filter(
    (t) => t.for_date === todayStr || (!t.done && t.for_date < todayStr)
  );
  const todayTotal = todayTasks.length;
  const todayDone = todayTasks.filter((t) => t.done).length;
  const todayAllDone = todayTotal > 0 && todayDone === todayTotal;

  // Vrstica za danes se zdaj sproti sinhronizira (glej syncTodayPointsAction
  // v VzletBoard), zato jo tu samo preberemo — brez podvajanja izračuna.
  const pastDays = days.filter((d) => d.day < todayStr);
  const todayRow = days.find((d) => d.day === todayStr);
  const committed = totalPoints(pastDays);
  const todayBanked = todayRow?.points ?? 0;
  const currentTotal = committed + todayBanked;

  const rank = rankForPoints(currentTotal);
  // Streak nad `pastDays` (ne `days`) + živ dodatek za danes, da se današnji
  // napredek ne šteje dvakrat, če je vrstica za danes že sinhronizirana.
  const streak = currentStreak(pastDays) + (todayAllDone ? 1 : 0);
  const best = Math.max(bestStreak(pastDays), streak);

  const hasData = days.length > 0 || todayTotal > 0;
  const series: ChartPoint[] = hasData
    ? [
        { label: "začetek", total: 0 },
        ...cumulativeSeries(pastDays).map((p) => ({
          label: short(p.day),
          total: p.total,
        })),
        { label: "danes", total: currentTotal, provisional: true },
      ]
    : [];

  const recent = [...days].slice(-7).reverse();
  const nextProgress =
    rank.nextAt != null
      ? Math.max(
          0,
          Math.min(1, (currentTotal - rank.min) / (rank.nextAt - rank.min))
        )
      : 1;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-6 pt-4">
      {/* točke + rang */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Točke
            </p>
            <p
              className={clsx(
                "text-3xl font-bold tabular-nums",
                currentTotal >= 0
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {currentTotal}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {rank.emoji} {rank.name}
            </p>
            {rank.nextAt != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rank.nextAt - currentTotal > 0
                  ? `še ${rank.nextAt - currentTotal} do „${rank.nextName}“`
                  : `na pragu „${rank.nextName}“`}
              </p>
            )}
          </div>
        </div>
        {rank.nextAt != null && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${nextProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* niz */}
      <div className="flex items-center gap-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <IconFlame
            className={clsx(
              "h-7 w-7",
              streak > 0
                ? "text-orange-500 dark:text-orange-400"
                : "text-gray-300 dark:text-gray-600"
            )}
          />
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {streak}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              dni zapored
            </p>
          </div>
        </div>
        <div className="border-l border-gray-200 pl-5 dark:border-gray-800">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {best}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">rekord niza</p>
        </div>
      </div>

      {/* graf */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Napredek točk
        </p>
        <ScoreChart points={series} />
      </div>

      {/* zadnji dnevi */}
      {recent.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Zadnji dnevi
          </p>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recent.map((d) => {
              const isOpen = expandedDay === d.day;
              const { today, later, notDone } = groupSnapshot(
                d.tasks_snapshot
              );
              return (
                <li key={d.id} className="py-1.5">
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isOpen ? null : d.day)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-2 text-left text-sm"
                  >
                    <IconChevronDown
                      className={clsx(
                        "h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform",
                        !isOpen && "-rotate-90"
                      )}
                    />
                    <span className="w-16 flex-shrink-0 text-gray-600 dark:text-gray-300">
                      {short(d.day)}
                    </span>
                    <span className="flex-1 text-gray-400">
                      {d.tasks_done}/{d.tasks_total}
                    </span>
                    <span
                      className={clsx(
                        "w-14 flex-shrink-0 text-right font-semibold tabular-nums",
                        d.points >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {d.points > 0 ? "+" : ""}
                      {d.points}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-2 space-y-2 pl-6">
                      {today.length === 0 &&
                      later.length === 0 &&
                      notDone.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Ni podrobnosti za ta dan.
                        </p>
                      ) : (
                        <>
                          <SnapshotGroup title="Današnje naloge" entries={today} />
                          <SnapshotGroup title="Dodatne naloge" entries={later} />
                          <SnapshotGroup
                            title="Nenarejene naloge"
                            entries={notDone}
                          />
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* kazenski seznam */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <PenaltyPoolEditor items={pool} />
      </div>

      {/* predstavitev aplikacije */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setIntroOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
        >
          <IconRocket className="h-4 w-4" />
          Cilj aplikacije
        </button>
      </div>

      <IntroDialog
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        onDismiss={() => setIntroOpen(false)}
      />
    </div>
  );
}
