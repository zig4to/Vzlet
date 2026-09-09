// Ravni / „višina rakete“ glede na skupno število točk.

export type Rank = {
  name: string;
  emoji: string;
  /** Spodnji prag te ravni. */
  min: number;
  /** Prag naslednje ravni (null pri najvišji). */
  nextAt: number | null;
  nextName: string | null;
};

const TIERS: { name: string; emoji: string; min: number }[] = [
  { name: "Pod gladino", emoji: "🌊", min: -Infinity },
  { name: "Na rampi", emoji: "🛫", min: 0 },
  { name: "Vzlet", emoji: "🚀", min: 20 },
  { name: "Stratosfera", emoji: "🌤️", min: 50 },
  { name: "Orbita", emoji: "🛰️", min: 100 },
  { name: "Luna", emoji: "🌙", min: 200 },
  { name: "Mars", emoji: "🔴", min: 350 },
  { name: "Globoki vesolje", emoji: "✨", min: 600 },
];

export function rankForPoints(total: number): Rank {
  let i = 0;
  for (let j = 0; j < TIERS.length; j++) {
    if (total >= TIERS[j].min) i = j;
  }
  const tier = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  return {
    name: tier.name,
    emoji: tier.emoji,
    min: tier.min === -Infinity ? 0 : tier.min,
    nextAt: next ? next.min : null,
    nextName: next ? next.name : null,
  };
}
