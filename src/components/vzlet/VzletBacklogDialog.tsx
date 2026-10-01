"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconPlus } from "@/components/ui/icons";
import type { VzletBacklogItem } from "@/lib/types/database.types";
import clsx from "@/lib/utils/clsx";

type VzletBacklogDialogProps = {
  open: boolean;
  /** "list" = samo pregled in prestavljanje, "add" = samo dodajanje. */
  mode: "list" | "add";
  onClose: () => void;
  items: VzletBacklogItem[];
  onAdd: (title: string) => Promise<{ error?: string }>;
  onMove: (id: string, when: "today" | "tomorrow") => Promise<{ error?: string }>;
  onDelete: (id: string) => void;
};

/**
 * Splošni seznam opravil brez datuma. Klik na opravilo razpre mini meni pod
 * njim (Danes / Jutri / Izbriši) — namesto plavajočega menija, ker ga
 * `Modal` (`overflow-hidden`) ob spodnjem robu odreže.
 */
export default function VzletBacklogDialog({
  open,
  mode,
  onClose,
  items,
  onAdd,
  onMove,
  onDelete,
}: VzletBacklogDialogProps) {
  const [value, setValue] = useState("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue("");
    setLastAdded(null);
    setSelected(null);
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

  const move = (id: string, when: "today" | "tomorrow") => {
    setSelected(null);
    startTransition(async () => {
      const res = await onMove(id, when);
      setError(res?.error ?? null);
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === "add" ? "Dodaj na splošni seznam" : "Splošni seznam opravil"
      }
    >
      <div className="space-y-4">
        {mode === "list" && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Opravila brez datuma. Klikni na opravilo in ga prestavi med današnje
              naloge ali v cilje za jutri.
            </p>

            {items.length > 0 ? (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {items.map((item) => {
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
                      </button>
                      {isOpen && (
                        <div className="flex flex-wrap gap-2 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => move(item.id, "today")}
                          >
                            Danes
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => move(item.id, "tomorrow")}
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
                                onDelete(item.id);
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
                Seznam je prazen — opravila dodaš z gumbom +.
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
