"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import type { VzletTask } from "@/lib/types/database.types";
import clsx from "@/lib/utils/clsx";

type VzletPlanDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: "today" | "tomorrow";
  tasks: VzletTask[];
  onAdd: (
    title: string,
    difficulty: number | null
  ) => Promise<{ error?: string }>;
  onDelete: (id: string) => void;
};

export default function VzletPlanDialog({
  open,
  onClose,
  mode,
  tasks,
  onAdd,
  onDelete,
}: VzletPlanDialogProps) {
  const [value, setValue] = useState("");
  // Neobvezna ročna ocena težavnosti (1–10) — samo za načrt za jutri, ker so
  // dodatne naloge vedno vredne 1 točko.
  const [difficulty, setDifficulty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue("");
    setDifficulty("");
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const title = mode === "tomorrow" ? "Načrt za jutri" : "Dodatna naloga";
  const count = tasks.length;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Opravilo ne sme biti prazno.");
      return;
    }
    const rawDifficulty = mode === "tomorrow" ? difficulty.trim() : "";
    const n = rawDifficulty === "" ? null : Number(rawDifficulty);
    if (n != null && (!Number.isInteger(n) || n < 1 || n > 10)) {
      setError("Težavnost mora biti celo število med 1 in 10.");
      return;
    }
    startTransition(async () => {
      const res = await onAdd(trimmed, n);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setValue("");
      setDifficulty("");
      setError(null);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {mode === "tomorrow" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pripravi nekaj najpomembnejših stvari za jutri. Manj je več.
          </p>
        )}

        {count > 0 && (
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
              >
                <span
                  className={clsx(
                    "min-w-0 flex-1 truncate",
                    t.done
                      ? "text-gray-400 line-through dark:text-gray-500"
                      : "text-gray-800 dark:text-gray-200"
                  )}
                >
                  {t.title}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  aria-label="Izbriši opravilo"
                  className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                >
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        )}

        {count >= 5 ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {mode === "tomorrow"
              ? "Pet ali več za en dan — kar ne narediš danes, te čaka jutri."
              : "Dodatne naloge niso del dnevnega cilja, vendar dodajo po eno točko na nalogo."}
          </p>
        ) : count >= 3 ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Fokusiraj se na najpomembnejše.
          </p>
        ) : null}

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
            placeholder="Kaj želiš narediti?"
            onChange={(e) => setValue(e.target.value)}
          />
          {mode === "tomorrow" && (
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              step={1}
              value={difficulty}
              placeholder="1–10"
              title="Težavnost (neobvezno, 1–10)"
              aria-label="Težavnost (neobvezno, 1–10)"
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-20 flex-shrink-0"
            />
          )}
          <Button type="submit" disabled={pending} className="flex-shrink-0">
            <IconPlus />
            {pending ? "Dodajam …" : "Dodaj"}
          </Button>
        </form>
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
