"use client";

import { useEffect, useState } from "react";
import clsx from "@/lib/utils/clsx";
import type { VzletSharedTask, VzletSharer } from "@/lib/types/database.types";
import {
  getVzletSharedTasksAction,
  getVzletSharersAction,
} from "@/actions/vzlet";
import Modal from "@/components/ui/Modal";
import { IconCheck, IconChevronDown, IconUsers } from "@/components/ui/icons";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Bralni seznam deljenih opravil (za en dan) v pogovornem oknu „Cilji drugih“.
function SharedTaskList({ items }: { items: VzletSharedTask[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800"
        >
          <span
            className={clsx(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2",
              t.done
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 text-transparent dark:border-gray-600"
            )}
          >
            <IconCheck className="h-3 w-3" />
          </span>
          <span
            className={clsx(
              "min-w-0 flex-1 text-sm",
              t.done
                ? "text-gray-400 line-through dark:text-gray-500"
                : "text-gray-900 dark:text-gray-100"
            )}
          >
            {t.title}
          </span>
          {t.is_penalty && (
            <span className="flex-shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              kazen
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Postavka „Cilji drugih“ v meniju (`VzletMenu`): klik razpre seznam oseb,
 * ki delijo cilje, kar znotraj menija. Izbira osebe pokliče `onPick` —
 * okno s cilji (`SharedGoalsDialog`) živi zunaj menija, ker se meni ob
 * izbiri zapre.
 */
export function OthersGoalsMenuItem({
  onPick,
}: {
  onPick: (s: VzletSharer) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sharers, setSharers] = useState<VzletSharer[] | null>(null);

  const toggle = () => {
    setExpanded((v) => !v);
    if (sharers === null) {
      getVzletSharersAction()
        .then(setSharers)
        .catch(() => setSharers([]));
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <IconUsers className="h-4 w-4" />
        <span className="flex-1">Cilji drugih</span>
        <IconChevronDown
          className={clsx(
            "h-4 w-4 text-gray-400 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="max-h-56 overflow-y-auto pl-4">
          {sharers === null ? (
            <p className="px-2 py-2 text-sm text-gray-400">Nalagam …</p>
          ) : sharers.length === 0 ? (
            <p className="px-2 py-2 text-sm text-gray-400">
              Nihče trenutno ne deli ciljev.
            </p>
          ) : (
            sharers.map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => onPick(s)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {s.name.slice(0, 1)}
                </span>
                <span className="truncate">{s.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Okno s cilji izbrane osebe za danes in jutri (samo za branje). */
export function SharedGoalsDialog({
  sharer,
  onClose,
}: {
  sharer: VzletSharer | null;
  onClose: () => void;
}) {
  const [tasks, setTasks] = useState<VzletSharedTask[] | null>(null);

  useEffect(() => {
    if (!sharer) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(null);
    getVzletSharedTasksAction(sharer.userId)
      .then((t) => !cancelled && setTasks(t))
      .catch(() => !cancelled && setTasks([]));
    return () => {
      cancelled = true;
    };
  }, [sharer]);

  const now = new Date();
  const todayStr = localDateStr(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrow);
  const todayTasks = (tasks ?? []).filter((t) => t.for_date === todayStr);
  const tomorrowTasks = (tasks ?? []).filter((t) => t.for_date === tomorrowStr);

  return (
    <Modal
      open={sharer !== null}
      onClose={onClose}
      title={sharer ? `Cilji · ${sharer.name}` : ""}
    >
      {tasks === null ? (
        <p className="py-6 text-center text-sm text-gray-400">Nalagam …</p>
      ) : (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Danes
            </h3>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Za danes še nima ciljev.
              </p>
            ) : (
              <SharedTaskList items={todayTasks} />
            )}
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Jutri
            </h3>
            {tomorrowTasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Za jutri še nima ciljev.
              </p>
            ) : (
              <SharedTaskList items={tomorrowTasks} />
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
