"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { IconPlus } from "@/components/ui/icons";

/** Trajanje veljavnosti rutine — `days` ali `months` od danes naprej. */
const DURATIONS = [
  { key: "1d", label: "1 dan", days: 1 },
  { key: "3d", label: "3 dni", days: 3 },
  { key: "1w", label: "1 teden", days: 7 },
  { key: "2w", label: "2 tedna", days: 14 },
  { key: "3w", label: "3 tedni", days: 21 },
  { key: "1m", label: "1 mesec", months: 1 },
  { key: "2m", label: "2 meseca", months: 2 },
  { key: "3m", label: "3 meseci", months: 3 },
  { key: "1y", label: "1 leto", months: 12 },
] as const;

type DurationKey = (typeof DURATIONS)[number]["key"];
const DEFAULT_DURATION: DurationKey = "1w";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Zadnji dan veljavnosti (vključno): "1 dan" = samo danes, "1 teden" = danes
 * + 6 dni, "1 mesec" = dan pred istim datumom naslednji mesec.
 */
function validUntilFor(key: DurationKey, from: Date): string {
  const d = DURATIONS.find((x) => x.key === key)!;
  const end = new Date(from);
  if ("months" in d) end.setMonth(end.getMonth() + d.months);
  else end.setDate(end.getDate() + d.days);
  end.setDate(end.getDate() - 1);
  return localDateStr(end);
}

export default function VzletRoutineDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (title: string, validUntil: string) => Promise<{ error?: string }>;
}) {
  const [value, setValue] = useState("");
  const [duration, setDuration] = useState<DurationKey>(DEFAULT_DURATION);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue("");
    setDuration(DEFAULT_DURATION);
    setLastAdded(null);
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
      const res = await onAdd(trimmed, validUntilFor(duration, new Date()));
      if (res?.error) {
        setError(res.error);
        return;
      }
      setValue("");
      setLastAdded(trimmed);
      setError(null);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Dodaj rutinsko opravilo">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <Field label="Opravilo" htmlFor="routine-title">
          <Input
            id="routine-title"
            autoFocus
            value={value}
            placeholder="npr. Cold plunge"
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="Velja" htmlFor="routine-duration">
          <select
            id="routine-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value as DurationKey)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
          >
            {DURATIONS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>

        {lastAdded && !error && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Dodano: {lastAdded}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Zapri
          </Button>
          <Button type="submit" disabled={pending}>
            <IconPlus />
            Dodaj
          </Button>
        </div>
      </form>
    </Modal>
  );
}
