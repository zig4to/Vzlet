"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconPlus } from "@/components/ui/icons";
import type {
  VzletBacklogItem,
  VzletRoutine,
} from "@/lib/types/database.types";
import clsx from "@/lib/utils/clsx";

type ListKind = "general" | "routine";
type When = "today" | "tomorrow";
type Result = Promise<{ error?: string }>;

type VzletBacklogDialogProps = {
  open: boolean;
  /** "list" = samo pregled in prestavljanje, "add" = samo dodajanje. */
  mode: "list" | "add";
  onClose: () => void;
  items: VzletBacklogItem[];
  /** Samo še veljavna rutinska opravila (filtrira klicatelj). */
  routines: VzletRoutine[];
  onAdd: (title: string) => Result;
  onMove: (id: string, when: When) => Result;
  onDelete: (id: string) => void;
  /** Odpre ločeno okno za dodajanje rutinskega opravila. */
  onAddRoutine: () => void;
  onRoutineToDay: (id: string, when: When) => Result;
  onDeleteRoutine: (id: string) => void;
};

/** `YYYY-MM-DD` → `d. m. yyyy`. */
function formatDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

/**
 * Seznam opravil s preklopom med splošnim (opravila brez datuma — ob
 * prestavitvi se odstranijo) in rutinskim seznamom (opravila z rokom
 * veljavnosti — ob dodajanju na dan ostanejo na seznamu). Klik na opravilo
 * razpre mini meni pod njim (Danes / Jutri / Izbriši) — namesto plavajočega
 * menija, ker ga `Modal` (`overflow-hidden`) ob spodnjem robu odreže.
 */
export default function VzletBacklogDialog({
  open,
  mode,
  onClose,
  items,
  routines,
  onAdd,
  onMove,
  onDelete,
  onAddRoutine,
  onRoutineToDay,
  onDeleteRoutine,
}: VzletBacklogDialogProps) {
  const [kind, setKind] = useState<ListKind>("general");
  const [value, setValue] = useState("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue("");
    setLastAdded(null);
    setSelected(null);
    setNotice(null);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Opravilo ne sme biti prazno.");
      return;
    }
    startTransition(async () => {
      const res = await onAdd(trimmed);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setValue("");
      setLastAdded(trimmed);
      setError(null);
    });
  };

  const move = (id: string, title: string, when: When) => {
    setSelected(null);
    setNotice(null);
    startTransition(async () => {
      const res =
        kind === "general" ? await onMove(id, when) : await onRoutineToDay(id, when);
      setError(res?.error ?? null);
      if (!res?.error && kind === "routine") {
        setNotice(
          `„${title}“ dodano ${when === "today" ? "med današnje naloge" : "v cilje za jutri"}.`
        );
      }
    });
  };

  const list: { id: string; title: string; sub?: string }[] =
    kind === "general"
      ? items
      : routines.map((r) => ({
          id: r.id,
          title: r.title,
          sub: `velja do ${formatDate(r.valid_until)}`,
        }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Dodaj na splošni seznam" : "Seznam opravil"}
    >
      <div className="space-y-4">
        {mode === "list" && (
          <>
            <div
              role="tablist"
              className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
            >
              {(
                [
                  ["general", "Splošni", items.length],
                  ["routine", "Rutinski", routines.length],
                ] as const
              ).map(([k, label, count]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => {
                    setKind(k);
                    setSelected(null);
                    setNotice(null);
                    setError(null);
                  }}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    kind === k
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1 text-gray-400 dark:text-gray-500">
                      ({count})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {kind === "general"
                ? "Opravila brez datuma. Klikni na opravilo in ga prestavi med današnje naloge ali v cilje za jutri."
                : "Ponavljajoča se opravila. Klikni na opravilo in ga dodaj med današnje naloge ali v cilje za jutri — na seznamu ostane do izteka veljavnosti."}
            </p>

            {list.length > 0 ? (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {list.map((item) => {
                  const isOpen = selected === item.id;
                  return (
                    <li
                      key={item.id}
                      className={clsx(
                        "rounded-md border text-sm",
                        isOpen
                          ? "border-blue-400 dark:border-blue-600"
                          : "border-gray-200 dark:border-gray-800"
                      )}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setSelected(isOpen ? null : item.id)}
                        className="w-full px-3 py-2 text-left text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                      >
                        {item.title}
                        {item.sub && (
                          <span className="block text-xs text-gray-400 dark:text-gray-500">
                            {item.sub}
                          </span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="flex flex-wrap gap-2 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => move(item.id, item.title, "today")}
                          >
                            Danes
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => move(item.id, item.title, "tomorrow")}
                          >
                            Jutri
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            disabled={pending}
                            onClick={() => {
                              if (confirm(`Izbrišem „${item.title}“?`)) {
                                setSelected(null);
                                if (kind === "general") onDelete(item.id);
                                else onDeleteRoutine(item.id);
                              }
                            }}
                            className="ml-auto"
                          >
                            Izbriši
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {kind === "general"
                  ? "Seznam je prazen — opravila dodaš z gumbom +."
                  : "Ni veljavnih rutinskih opravil — dodaš jih z gumbom + in nato „Dodaj novo rutinsko opravilo“."}
              </p>
            )}
            {notice && !error && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {notice}
              </p>
            )}
          </>
        )}

        {mode === "add" && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex gap-2"
            >
              <Input
                autoFocus
                value={value}
                placeholder="Novo opravilo"
                onChange={(e) => setValue(e.target.value)}
              />
              <Button type="submit" disabled={pending} className="flex-shrink-0">
                <IconPlus />
                Dodaj
              </Button>
            </form>
            <Button
              type="button"
              variant="secondary"
              onClick={onAddRoutine}
              className="w-full"
            >
              <IconPlus />
              Dodaj novo rutinsko opravilo
            </Button>
            {lastAdded && !error && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Dodano: {lastAdded}
              </p>
            )}
          </>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Zapri
          </Button>
        </div>
      </div>
    </Modal>
  );
}
