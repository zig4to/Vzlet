import type { VzletDay } from "@/lib/types/database.types";

/** Razlika v dnevih med dvema datumoma `YYYY-MM-DD` (b − a). */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** `YYYY-MM-DD` iz lokalnega (ne UTC) datuma. */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ponedeljek tedna, ki vsebuje dani datum (lokalni čas, `YYYY-MM-DD`). */
export function mondayOf(d: Date): string {
  const wd = d.getDay(); // 0 = nedelja … 6 = sobota
  const diff = wd === 0 ? -6 : 1 - wd;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return localDateStr(monday);
}

/** Vsota `points` od (vključno) danega datuma dalje. */
export function weekPoints(
  days: { day: string; points: number }[],
  weekStartStr: string
): number {
  return days
    .filter((d) => d.day >= weekStartStr)
    .reduce((sum, d) => sum + d.points, 0);
}

/**
 * Ali je bilo opravilo dodano isti dan, za katerega je bilo namenjeno
 * (namesto vnaprej, npr. dan prej prek "Cilji za jutri"). `createdAtDateStr`
 * in `forDateStr` sta oba `YYYY-MM-DD`; klicatelj poskrbi za pravo izpeljavo
 * (lokalni čas na klientu, UTC na strežniku — glej klicna mesta).
 */
export function isSameDayAdded(
  createdAtDateStr: string,
  forDateStr: string
): boolean {
  return createdAtDateStr >= forDateStr;
}

/**
 * Ali opravilo šteje kot "kasneje dodano" (bonus +1). Kazenska opravila so
 * vedno "core" — čeprav nastanejo isti dan, morajo biti opravljena, da je
 * dan uspešen (sicer bi bil dan s samimi kaznimi vedno zamujen).
 */
export function isLaterTask(
  task: { is_penalty: boolean; for_date: string },
  createdAtDateStr: string
): boolean {
  return !task.is_penalty && isSameDayAdded(createdAtDateStr, task.for_date);
}

/**
 * Efektivna vrednost opravila za točkovanje: kasneje (isti dan) dodana
 * opravila spodbujamo, da jih načrtujemo vnaprej — zato so vredna točno 1
 * točko ne glede na oceno težavnosti; vnaprej načrtovana opravila štejejo
 * po svoji oceni (`difficulty`, manjkajoča = 0).
 */
export function effectiveTaskPoints(
  task: { is_penalty: boolean; for_date: string; difficulty: number | null },
  createdAtDateStr: string
): number {
  return isLaterTask(task, createdAtDateStr) ? 1 : task.difficulty ?? 0;
}

export type LiveDayPoints = {
  points: number;
  tasksTotal: number;
  tasksDone: number;
  allDone: boolean;
};

/**
 * Živa (sprotna) vrednost točk za dan, ki še traja ali čaka na poravnavo.
 * Opravila, načrtovana vnaprej, in kazenska ("core", glej `isLaterTask`), skupaj z
 * osnovo 10 točk prispevajo, TAKOJ KO JE CORE SEZNAM V CELOTI DOKONČAN —
 * neodvisno od dodatnih (isti dan dodanih) opravil. Dodatne naloge so samo
 * bonus: vsaka prispeva +1 takoj, ko je posamično opravljena, ne glede na
 * stanje core seznama. Brez core opravil dan ne more biti "uspešen"
 * (`allDone = false`, glej spodaj). Uporablja se tako za živo sprotno stanje
 * danes (`syncTodayPointsAction`) kot za poravnavo preteklih dni
 * (`settleVzletAction`, kjer se `points` ob `!allDone` nadomesti z -125).
 */
export function liveDayPoints(
  tasks: {
    done: boolean;
    for_date: string;
    created_at: string;
    difficulty: number | null;
    is_penalty: boolean;
  }[]
): LiveDayPoints {
  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.done).length;

  const core = tasks.filter(
    (t) => !isLaterTask(t, t.created_at.slice(0, 10))
  );
  const later = tasks.filter((t) => isLaterTask(t, t.created_at.slice(0, 10)));

  // "Dan uspešen" = dokončan seznam, ki je bil za ta dan načrtovan vnaprej
  // (core) — dodatne (isti dan dodane) naloge so samo bonus in na to NE
  // vplivajo. Brez core opravil (nič ni bilo načrtovano vnaprej) dan ne
  // more biti "uspešen".
  const coreAllDone = core.length > 0 && core.every((t) => t.done);
  const coreDifficultySum = core.reduce(
    (sum, t) => sum + (t.difficulty ?? 0),
    0
  );
  const corePoints = coreAllDone ? 10 + coreDifficultySum : 0;
  // Dodatne naloge: vsaka dokončana doda točno 1 bonus točko, sproti,
  // neodvisno od core seznama.
  const laterPoints = later.filter((t) => t.done).length;

  return {
    points: corePoints + laterPoints,
    tasksTotal,
    tasksDone,
    allDone: coreAllDone,
  };
}

/** Potencial današnjega dne, če dokončaš vse (`10 + vsota težavnosti`). */
export function potentialToday(tasksTotal: number, difficultySum: number): number {
  return tasksTotal > 0 ? 10 + difficultySum : 0;
}

export type CumulativePoint = {
  day: string;
  dayPoints: number;
  total: number;
};

/** Tekoča vsota točk skozi dneve (dnevi morajo biti naraščajoče urejeni). */
export function cumulativeSeries(days: VzletDay[]): CumulativePoint[] {
  let total = 0;
  return days.map((d) => {
    total += d.points;
    return { day: d.day, dayPoints: d.points, total };
  });
}

/** Skupno število točk (sprejme tudi "tanjšo" obliko, le `{ points }`). */
export function totalPoints(days: { points: number }[]): number {
  return days.reduce((sum, d) => sum + d.points, 0);
}

/**
 * Trenutni niz: zaporedni koledarski dnevi (razmik točno 1 dan), ki so vsi
 * `all_done`, šteto od zadnjega zapisa nazaj. Manjkajoč dan prekine niz.
 */
export function currentStreak(days: VzletDay[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (!days[i].all_done) break;
    if (i === days.length - 1) {
      streak = 1;
      continue;
    }
    if (dayDiff(days[i].day, days[i + 1].day) === 1) streak++;
    else break;
  }
  return streak;
}

/** Najdaljši niz zaporednih `all_done` dni. */
export function bestStreak(days: VzletDay[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    if (!days[i].all_done) {
      run = 0;
      continue;
    }
    if (
      i > 0 &&
      days[i - 1].all_done &&
      dayDiff(days[i - 1].day, days[i].day) === 1
    ) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }
  return best;
}
