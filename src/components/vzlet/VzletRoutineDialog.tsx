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

type DurationKey = (typeof DURATIONS)[number]["key"] | "custom";
const DEFAULT_DURATION: DurationKey = "1w";

/** Enote za trajanje po meri. */
const CUSTOM_UNITS = [
  { key: "days", label: "dni" },
  { key: "weeks", label: "tednov" },
  { key: "months", label: "mesecev" },
] as const;
type CustomUnit = (typeof CUSTOM_UNITS)[number]["key"];
const MAX_CUSTOM: Record<CustomUnit, number> = {
  days: 730,
  weeks: 104,
  months: 24,
};

const SELECT_CLASSES =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Zadnji dan veljavnosti (vključno): 1 dan = samo danes, 1 teden = danes
 * + 6 dni, 1 mesec = dan pred istim datumom naslednji mesec.
 */
function validUntil(from: Date, days: number, months: number): string {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() + days - 1);
  return localDateStr(end);
}

function presetValidUntil(
  key: Exclude<DurationKey, "custom">,
  from: Date
): string {
  const d = DURATIONS.find((x) => x.key === key)!;
  return "months" in d
    ? validUntil(from, 0, d.months)
    : validUntil(from, d.days, 0);
}

function customValidUntil(amount: number, unit: CustomUnit, from: Date): string {
  if (unit === "months") return validUntil(from, 0, amount);
  return validUntil(from, unit === "weeks" ? amount * 7 : amount, 0);
}

/** `YYYY-MM-DD` → `d. m. yyyy`. */
function formatDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
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
  const [customAmount, setCustomAmount] = useState("10");
  const [customUnit, setCustomUnit] = useState<CustomUnit>("days");
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue("");
    setDuration(DEFAULT_DURATION);
    setCustomAmount("10");
    setCustomUnit("days");
    setLastAdded(null);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const amount = Number(customAmount);
  const customValid =
    Number.isInteger(amount) && amount >= 1 && amount <= MAX_CUSTOM[customUnit];
  // Izračun ob vsakem prikazu je poceni; `null` = neveljaven vnos po meri.
  const until =
    duration === "custom"
      ? customValid
        ? customValidUntil(amount, customUnit, new Date())
        : null
      : presetValidUntil(duration, new Date());

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Opravilo ne sme biti prazno.");
      return;
    }
    if (!until) {
      setError(
        `Trajanje mora biti celo število med 1 in ${MAX_CUSTOM[customUnit]}.`
      );
      return;
    }
    startTransition(async () => {
      const res = await onAdd(trimmed, until);
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
            className={SELECT_CLASSES}
          >
            {DURATIONS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
            <option value="custom">Po meri …</option>
          </select>
        </Field>
        {duration === "custom" && (
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_CUSTOM[customUnit]}
              step={1}
              aria-label="Trajanje"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-24 flex-shrink-0"
            />
            <select
              aria-label="Enota trajanja"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value as CustomUnit)}
              className={SELECT_CLASSES}
            >
              {CUSTOM_UNITS.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {until
            ? `Velja do vključno ${formatDate(until)}.`
            : `Vnesi celo število med 1 in ${MAX_CUSTOM[customUnit]}.`}
        </p>

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
