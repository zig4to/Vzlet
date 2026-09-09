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
  onAdd: (title: string) => Promise<{ error?: string }>;
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue("");
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const title = mode === "tomorrow" ? "Načrt za jutri" : "Dodaj za danes";
  const count = tasks.length;

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
      setError(null);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {mode === "tomorrow"
            ? "Pripravi nekaj najpomembnejših stvari za jutri. Manj je več."
            : "Dodaj, kar želiš danes zares narediti."}
        </p>

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
            Pet ali več za en dan — kar ne narediš danes, te čaka jutri.
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
