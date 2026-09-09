"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "@/lib/utils/clsx";
import { IconRocket, IconTrendingUp, IconTrophy } from "@/components/ui/icons";
import OthersGoals from "@/components/vzlet/OthersGoals";

const TABS = [
  { href: "/", label: "Misije", icon: <IconRocket /> },
  { href: "/napredek", label: "Napredek", icon: <IconTrendingUp /> },
  { href: "/tabla", label: "Tabla", icon: <IconTrophy /> },
];

export default function VzletTabs() {
  const pathname = usePathname();

  return (
    <div className="flex min-h-12 items-stretch gap-1 pl-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex items-center gap-1.5 border-b-2 px-2 py-2 text-sm font-medium transition-colors",
              active
                ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            )}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
      <div className="flex items-center">
        <OthersGoals />
      </div>
    </div>
  );
}
