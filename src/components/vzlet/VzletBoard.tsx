"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import clsx from "@/lib/utils/clsx";
import type { VzletDay, VzletTask } from "@/lib/types/database.types";
import {
  addVzletTaskAction,
  deleteVzletTaskAction,
  renameVzletTaskAction,
  setVzletTaskDifficultyAction,
  settleVzletAction,
  syncTodayPointsAction,
  toggleVzletTaskAction,
} from "@/actions/vzlet";
import { celebrationMessage, pluralOpravki } from "@/lib/vzlet/messages";
import {
  currentStreak,
  effectiveTaskPoints,
  isSameDayAdded,
  potentialToday,
} from "@/lib/vzlet/score";
import Button from "@/components/ui/Button";
import Menu, { MenuItem } from "@/components/ui/Menu";
import PromptDialog from "@/components/ui/PromptDialog";
import {
  IconCheck,
  IconChevronDown,
  IconFlame,
  IconPlus,
  IconRocket,
} from "@/components/ui/icons";
import Fireworks from "@/components/vzlet/Fireworks";
import Crash from "@/components/vzlet/Crash";
import VzletPlanDialog from "@/components/vzlet/VzletPlanDialog";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Barva značka glede na težavnost: zelena=lahko, rumena=srednje, rdeča=težko. */
function difficultyBadgeClass(value: number): string {
  if (value <= 3) {
    return "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
  if (value <= 6) {
    return "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  }
  return "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200";
}

/**
 * Vsota efektivnih točk opravil — kasneje (isti dan) dodana opravila štejejo
 * kot 1 (spodbuda za načrtovanje vnaprej), sicer po oceni težavnosti.
 */
function difficultySum(tasks: VzletTask[]): number {
  return tasks.reduce(
    (sum, t) =>
      sum +
      effectiveTaskPoints(
        localDateStr(new Date(t.created_at)),
        t.for_date,
        t.difficulty
      ),
    0
  );
}

/**
 * Kartica opravila — skupna za današnji seznam (z možnostjo odkljukanja) in
 * jutrišnjo "Misijo" (brez kljukice, dokler dan ne pride na vrsto).
 */
function TaskCard({
  task,
  showCheckbox,
  onToggle,
  onRename,
  onRate,
  onDelete,
}: {
  task: VzletTask;
  showCheckbox: boolean;
  onToggle?: () => void;
  onRename: () => void;
  onRate: () => void;
  onDelete: () => void;
}) {
  // Dodatne (isti dan dodane) naloge so vedno vredne 1 bonus točko — zanje
  // ocena težavnosti ni relevantna, zato se "Oceni težavnost" ne ponudi.
  const isLater = isSameDayAdded(
    localDateStr(new Date(task.created_at)),
    task.for_date
  );

  return (
    <li
      className={clsx(
        "group flex items-center gap-3 rounded-xl border px-4 py-3.5",
        task.is_penalty
          ? "border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      )}
    >
      {showCheckbox && (
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={
            task.done ? "Označi kot nedokončano" : "Označi kot opravljeno"
          }
          onClick={onToggle}
          className={clsx(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors",
            task.done
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 text-transparent hover:border-blue-500 dark:border-gray-600"
          )}
        >
          <IconCheck className="h-4 w-4" />
        </button>
      )}
      {showCheckbox ? (
        <button
          type="button"
          onClick={onToggle}
          className={clsx(
            "min-w-0 flex-1 text-left text-lg sm:text-xl",
            task.done
              ? "text-gray-400 line-through dark:text-gray-500"
              : "text-gray-900 dark:text-gray-100"
          )}
        >
          {task.title}
        </button>
      ) : (
        <span className="min-w-0 flex-1 text-left text-lg text-gray-900 dark:text-gray-100 sm:text-xl">
          {task.title}
        </span>
      )}
      {task.is_penalty && (
        <span className="flex-shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          kazen
        </span>
      )}
      {task.difficulty != null && (
        <span
          title="AI ocena težavnosti"
          className={clsx(
            "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
            difficultyBadgeClass(task.difficulty)
          )}
        >
          {task.difficulty}/10
        </span>
      )}
      {isLater && (
        <span
          title="Dodatna naloga — bonus točka"
          className="flex-shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        >
          1 točka
        </span>
      )}
      <Menu>
        {(close) => (
          <>
            <MenuItem
              onClick={() => {
                close();
                onRename();
              }}
            >
              Preimenuj
            </MenuItem>
            {task.difficulty == null && !isLater && (
              <MenuItem
                onClick={() => {
                  close();
                  onRate();
                }}
              >
                Oceni težavnost
              </MenuItem>
            )}
            <MenuItem
              danger
              onClick={() => {
                close();
                if (confirm(`Izbrišem opravilo „${task.title}“?`)) onDelete();
              }}
            >
              Izbriši
            </MenuItem>
          </>
        )}
      </Menu>
    </li>
  );
}

export default function VzletBoard({
  tasks: initialTasks,
  days,
}: {
  tasks: VzletTask[];
  days: VzletDay[];
}) {
  const [tasks, setTasks] = useState<VzletTask[]>(initialTasks);
  const [dialog, setDialog] = useState<"today" | "tomorrow" | null>(null);
  const [rename, setRename] = useState<{ id: string; value: string } | null>(
    null
  );
  const [rateDifficulty, setRateDifficulty] = useState<{ id: string } | null>(
    null
  );
  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [burst, setBurst] = useState<{ id: number; big: boolean } | null>(null);
  const [crash, setCrash] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const settledRef = useRef(false);
  const burstSeq = useRef(0);
  const toastSeq = useRef(0);

  // Motivacijski popup se sam skrije po 2,5 s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(initialTasks);
  }, [initialTasks]);

  const now = new Date();
  const todayStr = localDateStr(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrow);

  // Zaključi pretekle dneve (točke + kazni) in prenesi neopravljena na danes —
  // enkrat na prikaz.
  useEffect(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    startTransition(async () => {
      const res = await settleVzletAction(todayStr);
      if (res.missedDays > 0) setCrash(res.missedDays);
    });
  }, [todayStr, startTransition]);

  const todayTasks = tasks
    .filter((t) => t.for_date === todayStr || (!t.done && t.for_date < todayStr))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.done && b.done)
        return (b.done_at ?? "").localeCompare(a.done_at ?? "");
      return a.position - b.position;
    });

  // Podpis "danes" stanja (id:opravljeno:težavnost) — spremeni se ob vsakem
  // odkljukanju/dodajanju/brisanju/oceni, ne pa ob vsakem re-renderju z isto
  // vsebino (v nasprotju s primerjavo referenc `tasks`/`todayTasks`).
  const todaySignature = todayTasks
    .map((t) => `${t.id}:${t.done ? 1 : 0}:${t.difficulty ?? "-"}`)
    .sort()
    .join("|");

  // Sprotna sinhronizacija današnjih točk v pisi_vzlet_days — takoj vidno na
  // strani "Napredek" in v "Tabli", brez čakanja na jutrišnjo poravnavo.
  useEffect(() => {
    startTransition(() => {
      syncTodayPointsAction(todayStr);
    });
  }, [todayStr, todaySignature, startTransition]);

  // Naloge, dodane isti dan (za razliko od tistih, ki so bile za danes
  // načrtovane že prej), gredo pod ločen naslov "Dodatne naloge" — in so
  // pri točkovanju vredne točno 1 bonus točko (glej `effectiveTaskPoints`).
  const earlierTodayTasks = todayTasks.filter(
    (t) => !isSameDayAdded(localDateStr(new Date(t.created_at)), t.for_date)
  );
  const laterTodayTasks = todayTasks.filter((t) =>
    isSameDayAdded(localDateStr(new Date(t.created_at)), t.for_date)
  );

  const tomorrowTasks = tasks
    .filter((t) => t.for_date === tomorrowStr)
    .sort((a, b) => a.position - b.position);

  const totalToday = todayTasks.length;
  const doneToday = todayTasks.filter((t) => t.done).length;
  const remaining = totalToday - doneToday;
  const allDoneToday = totalToday > 0 && remaining === 0;
  // Dnevni cilj = vsa vnaprej načrtovana ("Današnje naloge") opravila
  // opravljena — dodatne (bonus) naloge na to ne vplivajo.
  const coreAllDone =
    earlierTodayTasks.length > 0 && earlierTodayTasks.every((t) => t.done);
  const doneCore = earlierTodayTasks.filter((t) => t.done).length;
  const remainingCore = earlierTodayTasks.length - doneCore;
  // `days` lahko že vsebuje živo sinhronizirano vrstico za danes (glej
  // syncTodayPointsAction) — izключimo jo, da se `coreAllDone` ne prišteje
  // dvakrat (enkrat iz baze, enkrat živo).
  const pastDays = days.filter((d) => d.day < todayStr);
  const streakNow = currentStreak(pastDays) + (coreAllDone ? 1 : 0);
  const potentialPoints = potentialToday(totalToday, difficultySum(todayTasks));

  const toggle = (task: VzletTask) => {
    const next = !task.done;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              done: next,
              done_at: next ? new Date().toISOString() : null,
            }
          : t
      )
    );
    startTransition(() => toggleVzletTaskAction(task.id, next));

    if (next) {
      const newRemaining = Math.max(0, remaining - 1);
      setToast({
        id: ++toastSeq.current,
        text: celebrationMessage(newRemaining),
      });
      setBurst({ id: ++burstSeq.current, big: newRemaining === 0 });
    } else {
      setToast(null);
    }
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(() => deleteVzletTaskAction(id));
  };

  // Sporočilo o dnevnem cilju gleda IZKLJUČNO na "Današnje naloge" (vnaprej
  // načrtovane) — nedokončane dodatne (bonus) naloge nanj ne vplivajo.
  const progressLine =
    totalToday === 0
      ? "Načrtuj svoj dan."
      : coreAllDone
        ? "Dan zaključen 🎉"
        : remainingCore > 0
          ? `Še ${remainingCore} ${pluralOpravki(remainingCore)} za danes`
          : "Nič ni bilo načrtovano vnaprej za danes.";

  // Dodatne naloge (če obstajajo) se vedno prikažejo nad "Današnje naloge" —
  // takoj ko je dodana ena sama, ne šele ko je dnevni cilj dosežen.
  const todaySection = earlierTodayTasks.length > 0 && (
    <div key="today-section" className="flex min-h-0 flex-1 flex-col gap-2">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        Današnje naloge
      </h2>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {earlierTodayTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            showCheckbox
            onToggle={() => toggle(task)}
            onRename={() => setRename({ id: task.id, value: task.title })}
            onRate={() => setRateDifficulty({ id: task.id })}
            onDelete={() => handleDelete(task.id)}
          />
        ))}
      </ul>
    </div>
  );

  const laterSection = laterTodayTasks.length > 0 && (
    <div
      key="later-section"
      className="flex flex-shrink-0 flex-col gap-2 border-b border-gray-200 pb-4 dark:border-gray-800"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        Dodatne naloge
      </h2>
      <ul className="space-y-2">
        {laterTodayTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            showCheckbox
            onToggle={() => toggle(task)}
            onRename={() => setRename({ id: task.id, value: task.title })}
            onRate={() => setRateDifficulty({ id: task.id })}
            onDelete={() => handleDelete(task.id)}
          />
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6 pt-3">
        {/* glava — poravnana na vrh (gumb menija je nad zavihki, ne nad vsebino) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconRocket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Vzlet
            </h1>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setDialog("today")}>
              <IconPlus />
              Dodatna naloga
            </Button>
            <Button onClick={() => setDialog("tomorrow")}>
              <IconPlus />
              Cilji za jutri
            </Button>
          </div>
        </div>

        {/* napredek */}
        <div>
          <p
            className={clsx(
              "text-lg font-medium",
              coreAllDone
                ? "text-green-600 dark:text-green-400"
                : "text-gray-900 dark:text-gray-100"
            )}
          >
            {progressLine}
          </p>
          {totalToday > 0 && (
            <p className="flex flex-wrap items-center gap-x-1 text-sm text-gray-500 dark:text-gray-400">
              <span>{doneToday}/{totalToday} opravljeno</span>
              <span aria-hidden>·</span>
              {allDoneToday ? (
                <span>
                  danes{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    +{potentialPoints} točk
                  </span>
                </span>
              ) : (
                <span>
                  danes{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    +{potentialPoints} točk
                  </span>
                  , če dokončaš vse
                </span>
              )}
              {streakNow > 0 && (
                <span className="inline-flex items-center gap-0.5 text-orange-500 dark:text-orange-400">
                  <span aria-hidden>·</span>
                  <IconFlame className="h-4 w-4" />
                  {streakNow}
                </span>
              )}
            </p>
          )}
        </div>

        {/* opozorilo ob preveč opravkih (le dokler je še kaj za narediti) */}
        {remaining > 0 && totalToday >= 5 ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Pet ali več za en dan — kar ne narediš danes, te čaka jutri + kazenska naloga.
          </p>
        ) : remaining > 0 && totalToday >= 3 ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Fokusiraj se na najpomembnejše.
          </p>
        ) : null}

        {/* seznam ali prazno stanje */}
        {totalToday === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <IconRocket className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Danes še nimaš opravkov.
            </p>
            <Button onClick={() => setDialog("today")}>
              <IconPlus />
              Dodaj dodatno nalogo
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Načrt za jutri narediš z gumbom zgoraj.
            </p>
          </div>
        ) : (
          <>
            {laterSection}
            {todaySection}
          </>
        )}

        {/* Misija jutri — zložljiv predogled jutrišnjih ciljev */}
        {tomorrowTasks.length > 0 && (
          <div className="flex flex-shrink-0 flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setTomorrowOpen((v) => !v)}
              aria-expanded={tomorrowOpen}
              className="flex items-center gap-2 text-left"
            >
              <IconChevronDown
                className={clsx(
                  "h-4 w-4 flex-shrink-0 text-gray-400 transition-transform",
                  !tomorrowOpen && "-rotate-90"
                )}
              />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Misija jutri
              </h2>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                ({tomorrowTasks.length})
              </span>
            </button>
            {tomorrowOpen && (
              <ul className="space-y-2">
                {tomorrowTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showCheckbox={false}
                    onRename={() => setRename({ id: task.id, value: task.title })}
                    onRate={() => setRateDifficulty({ id: task.id })}
                    onDelete={() => handleDelete(task.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {burst && (
        <Fireworks
          key={`burst-${burst.id}`}
          big={burst.big}
          onDone={() => setBurst(null)}
        />
      )}

      {crash != null && (
        <Crash count={crash} onDone={() => setCrash(null)} />
      )}

      {toast && (
        <div
          key={`toast-${toast.id}`}
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4"
        >
          <div
            role="status"
            aria-live="polite"
            className="vzlet-fire-border max-w-full rounded-xl border-2 border-orange-400 bg-white px-6 py-4 text-center text-lg font-semibold text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
          >
            {toast.text}
          </div>
        </div>
      )}

      <VzletPlanDialog
        open={dialog === "tomorrow"}
        onClose={() => setDialog(null)}
        mode="tomorrow"
        tasks={tomorrowTasks}
        onAdd={(title) => addVzletTaskAction(title, tomorrowStr)}
        onDelete={handleDelete}
      />
      <VzletPlanDialog
        open={dialog === "today"}
        onClose={() => setDialog(null)}
        mode="today"
        tasks={todayTasks}
        onAdd={(title) => addVzletTaskAction(title, todayStr)}
        onDelete={handleDelete}
      />
      <PromptDialog
        open={rename !== null}
        onClose={() => setRename(null)}
        title="Preimenuj opravilo"
        label="Opravilo"
        initialValue={rename?.value ?? ""}
        onSubmit={async (value) => {
          if (rename) await renameVzletTaskAction(rename.id, value);
        }}
      />
      <PromptDialog
        open={rateDifficulty !== null}
        onClose={() => setRateDifficulty(null)}
        title="Oceni težavnost"
        label="Težavnost (1–10)"
        placeholder="npr. 5"
        submitLabel="Shrani"
        onSubmit={async (value) => {
          if (!rateDifficulty) return;
          const n = Number(value);
          if (!Number.isInteger(n)) {
            return { error: "Vnesi celo število med 1 in 10." };
          }
          return setVzletTaskDifficultyAction(rateDifficulty.id, n);
        }}
      />
    </div>
  );
}
