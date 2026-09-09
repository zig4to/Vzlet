"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "@/lib/utils/clsx";
import type { VzletSharedTask, VzletSharer } from "@/lib/types/database.types";
import {
  getVzletSharedTasksAction,
  getVzletSharersAction,
} from "@/actions/vzlet";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { IconCheck, IconUsers } from "@/components/ui/icons";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Gumb „Cilji drugih“ z dropdownom oseb, ki delijo cilje; ob izbiri se v
// pogovornem oknu pokažejo njihovi današnji cilji (samo za branje).
export default function OthersGoals() {
  const [open, setOpen] = useState(false);
  const [sharers, setSharers] = useState<VzletSharer[] | null>(null);
  const [viewing, setViewing] = useState<VzletSharer | null>(null);
  const [tasks, setTasks] = useState<VzletSharedTask[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => !v);
    if (sharers === null) {
      getVzletSharersAction()
        .then(setSharers)
        .catch(() => setSharers([]));
    }
  };

  const pick = (s: VzletSharer) => {
    setOpen(false);
    setViewing(s);
    setTasks(null);
    getVzletSharedTasksAction(s.userId)
      .then(setTasks)
      .catch(() => setTasks([]));
  };

  const todayStr = localDateStr(new Date());
  const todayTasks = (tasks ?? []).filter((t) => t.for_date === todayStr);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="secondary"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Cilji drugih"
        title="Cilji drugih"
      >
        <IconUsers className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40">
          {sharers === null ? (
            <p className="px-2 py-3 text-center text-sm text-gray-400">
              Nalagam …
            </p>
          ) : sharers.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-gray-400">
              Nihče trenutno ne deli ciljev.
            </p>
          ) : (
            sharers.map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => pick(s)}
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

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `Cilji za danes · ${viewing.name}` : ""}
      >
        {tasks === null ? (
          <p className="py-6 text-center text-sm text-gray-400">Nalagam …</p>
        ) : todayTasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Za danes še nima ciljev.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((t) => (
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
        )}
      </Modal>
    </div>
  );
}
