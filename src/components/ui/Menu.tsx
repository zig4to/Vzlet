"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "@/lib/utils/clsx";
import { IconMore } from "@/components/ui/icons";

type MenuProps = {
  children: (close: () => void) => ReactNode;
  label?: string;
  align?: "left" | "right";
  trigger?: ReactNode;
  className?: string;
};

export default function Menu({
  children,
  label = "Več možnosti",
  align = "right",
  trigger,
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className={clsx("relative", className)} ref={rootRef}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={clsx(
          "flex items-center justify-center rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200",
          open && "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        )}
      >
        {trigger ?? <IconMore />}
      </button>
      {open && (
        <div
          className={clsx(
            "absolute z-30 mt-1 min-w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
      )}
    >
      {children}
    </button>
  );
}
