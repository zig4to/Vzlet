import { anthropic } from "@/lib/ai/anthropic";

/**
 * Vpraša Claude Haiko za oceno težavnosti opravila (1–10). Uporablja se
 * neposredno v `dayPoints()` seštevku, zato ob kakršni koli napaki (mrežni
 * izpad, neveljaven ključ, nerazumljiv odgovor) vrne `null` namesto da vrže
 * napako — dodajanje opravila se zato NE sme prekiniti. Uporabnik lahko
 * manjkajočo oceno kasneje vnese ročno (glej `setVzletTaskDifficultyAction`).
 */
export async function rateTaskDifficulty(title: string): Promise<number | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 5,
      system:
        "Oceni težavnost spodnjega opravila na lestvici 1-10. Bodi strog " +
        "ocenjevalec: visoke ocene si opravilo prisluzi le redko. " +
        "1-2 = trivialno, par minut, brez napora (npr. 'vzemi smeti ven'). " +
        "3-4 = preprosto vsakdanje opravilo, malo časa, brez posebnega " +
        "napora. 5-6 = zmerno zahtevno, zahteva osredotočenost ali daljši " +
        "čas. 7-8 = zahtevno, kompleksno ali dolgotrajno opravilo. " +
        "9-10 = izjemno zahtevno ali redko, veliko truda/tveganja/znanja. " +
        "Večina vsakdanjih opravil spada v 1-4 — ne prisojaj visokih ocen " +
        "brez jasnega razloga. Odgovori SAMO s celim številom, brez " +
        "besedila ali ločil.",
      messages: [{ role: "user", content: title }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) return null;

    const n = parseInt(textBlock.text.trim(), 10);
    if (Number.isNaN(n)) return null;

    return Math.min(10, Math.max(1, n));
  } catch (error) {
    console.error("AI ocena težavnosti ni uspela:", error);
    return null;
  }
}
