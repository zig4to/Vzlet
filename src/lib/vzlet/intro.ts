// Predstavitev aplikacije („Cilj aplikacije“) samodejno pokažemo le ob prvem
// odprtju; zastavico shranimo v localStorage.
export const INTRO_SEEN_KEY = "pisi:vzlet-intro-seen";

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    // Ob nedostopnem shranjevanju raje ne motimo uporabnika s popupom.
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // brez veze — samodejni prikaz se bo morda ponovil
  }
}
