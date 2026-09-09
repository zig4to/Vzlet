// Motivacijska sporočila in slovenska sklanjatev za pogled Vzlet.

const PRAISES = [
  "Odlično!",
  "Bravo!",
  "Tako se dela!",
  "Krasno!",
  "Si na pravi poti!",
  "Kar tako naprej!",
  "Vsak dan šteje.",
  "Konsistentnost zmaga.",
  "Še en korak naprej.",
  "Točno tako.",
];

const ALL_DONE = [
  "Vse za danes je opravljeno! 🎉",
  "Dnevni cilj dosežen. 🎉",
  "Popoln dan — vse odkljukano! 🎉",
];

/** Sklanjatev besede „opravek“ glede na število. */
export function pluralOpravki(n: number): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return "opravkov";
  if (d === 1) return "opravek";
  if (d === 2) return "opravka";
  if (d === 3 || d === 4) return "opravki";
  return "opravkov";
}

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

/** Sporočilo ob odkljukanem opravilu; `remaining` je število preostalih danes. */
export function celebrationMessage(remaining: number): string {
  if (remaining <= 0) return pick(ALL_DONE);
  return `${pick(PRAISES)} Še ${remaining} ${pluralOpravki(remaining)} danes.`;
}
