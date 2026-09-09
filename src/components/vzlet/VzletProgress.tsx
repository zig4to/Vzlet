"use client";

import { useState } from "react";
import clsx from "@/lib/utils/clsx";
import type {
  VzletDay,
  VzletPenaltyItem,
  VzletTask,
} from "@/lib/types/database.types";
import {
  bestStreak,
  cumulativeSeries,
  currentStreak,
  totalPoints,
} from "@/lib/vzlet/score";
import { rankForPoints } from "@/lib/vzlet/rank";
import { IconFlame, IconRocket } from "@/components/ui/icons";
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
  const todayStr = localDateStr(new Date());
  const todayTasks = tasks.filter(
    (t) => t.for_date === todayStr || (!t.done && t.for_date < todayStr)
  );
  const todayTotal = todayTasks.length;
  const todayDone = todayTasks.filter((t) => t.done).length;
  const todayAllDone = todayTotal > 0 && todayDone === todayTotal;

  const committed = totalPoints(days);
  const todayBanked =
    todayTotal > 0 ? (todayAllDone ? 5 + todayDone : todayDone) : 0;
  const currentTotal = committed + todayBanked;

  const rank = rankForPoints(currentTotal);
  const streak = currentStreak(days) + (todayAllDone ? 1 : 0);
  const best = Math.max(bestStreak(days), streak);

  const hasData = days.length > 0 || todayTotal > 0;
  const series: ChartPoint[] = hasData
    ? [
        { label: "začetek", total: 0 },
        ...cumulativeSeries(days).map((p) => ({
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
            {recent.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="w-20 text-gray-600 dark:text-gray-300">
                  {short(d.day)}
                </span>
                <span className="text-gray-400">
                  {d.tasks_done}/{d.tasks_total}
                </span>
                <span
                  className={clsx(
                    "w-14 text-right font-semibold tabular-nums",
                    d.points >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {d.points > 0 ? "+" : ""}
                  {d.points}
                </span>
              </li>
            ))}
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
