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
 * Efektivna vrednost opravila za točkovanje: kasneje (isti dan) dodana
 * opravila spodbujamo, da jih načrtujemo vnaprej — zato so vredna točno 1
 * točko ne glede na oceno težavnosti; vnaprej načrtovana opravila štejejo
 * po svoji oceni (`difficulty`, manjkajoča = 0).
 */
export function effectiveTaskPoints(
  createdAtDateStr: string,
  forDateStr: string,
  difficulty: number | null
): number {
  return isSameDayAdded(createdAtDateStr, forDateStr) ? 1 : difficulty ?? 0;
}

/**
 * Točke za zaključen dan po pravilih Vzleta: uspešen dan (vsa opravila
 * opravljena) je vreden 50 + vsota težavnosti (`difficulty`) opravil tega
 * dne; zamujen dan (eno ali več neopravljenih) odbije -500.
 */
export function dayPoints(
  tasksTotal: number,
  tasksDone: number,
  difficultySum: number
): number {
  if (tasksTotal <= 0) return 0;
  return tasksDone === tasksTotal ? 50 + difficultySum : -500;
}

/** Potencial današnjega dne, če dokončaš vse (`50 + vsota težavnosti`). */
export function potentialToday(tasksTotal: number, difficultySum: number): number {
  return tasksTotal > 0 ? 50 + difficultySum : 0;
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
