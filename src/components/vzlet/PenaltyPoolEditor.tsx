"use client";

import { useActionState, useState, useTransition } from "react";
import type { VzletPenaltyItem } from "@/lib/types/database.types";
import {
  addPenaltyPoolAction,
  deletePenaltyPoolAction,
  type VzletFormState,
} from "@/actions/vzlet";
import {
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";

const initialState: VzletFormState = {};

export default function PenaltyPoolEditor({
  items,
}: {
  items: VzletPenaltyItem[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addPenaltyPoolAction,
    initialState
  );
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="text-gray-400">
          {open ? <IconChevronDown /> : <IconChevronRight />}
        </span>
        <span className="flex-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Kazenski seznam
          </span>{" "}
          <span className="text-xs text-gray-400">({items.length})</span>
        </span>
      </button>

      {open && (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ob zamujenem dnevu se za danes doda naključno opravilo s tega
            seznama.
          </p>

          <form action={formAction} className="flex gap-2">
            <input
              name="title"
              placeholder="Novo kazensko opravilo …"
              className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <IconPlus />
              Dodaj
            </button>
          </form>
          {state.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}

          <ul className="space-y-1">
            {items.length === 0 && (
              <li className="text-sm text-gray-400">Seznam je prazen.</li>
            )}
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
              >
                <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => deletePenaltyPoolAction(item.id))
                  }
                  aria-label="Izbriši"
                  className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                >
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
