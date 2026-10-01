# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kaj je Vzlet

Samostojna aplikacija za dnevni fokus: uporabnik si vsak dan zada realen
načrt najpomembnejših opravil, jih odkljuka, dobi točke in spremlja napredek
(graf, niz, rang, tedenska lestvica, kazenska opravila). Omogoča tudi
deljenje dnevnih ciljev z drugimi uporabniki.

Izločeno iz aplikacije **Pisi**, kjer je bilo prej podstran `/vzlet` — zato
so Supabase tabele še vedno prefiksirane `pisi_vzlet_*` in privzeto delijo
isti Supabase projekt kot sestrski aplikaciji Pisi/Posel (glej SSO spodaj).

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
`@supabase/ssr` · Anthropic SDK (Claude Haiku 4.5 za AI oceno težavnosti).

## Ukazi

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

Testov (unit/e2e) v projektu ni.

## Okoljske spremenljivke (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=sk-ant-...   # brez NEXT_PUBLIC_ — bere se samo na strežniku
```

`.env.local` privzeto kaže na isti Supabase projekt kot Pisi/Posel (tabele
`pisi_vzlet_*` že obstajajo tam).

## Baza (Supabase) — migracije se poganjajo ROČNO

V projektu **ni** Supabase CLI/`db push` toka. Vsaka `supabase/migrations/
000N_*.sql` datoteka se po nastanku prilepi ročno v **Supabase Dashboard →
SQL Editor** in požene — commitanje `.sql` datoteke v git je torej samo
zapis migracije, ne pomeni, da je bila dejansko izvedena na bazi (na
Vercelu/produkciji jo je treba pognati posebej po deployu).

`src/lib/types/database.types.ts` je **ročno napisan** tip (ne generiran s
`supabase gen types`) — ob vsaki novi migraciji, ki doda stolpec/tabelo, ga
je treba ročno posodobiti.

Tabele: `pisi_vzlet_tasks`, `pisi_vzlet_days`, `pisi_vzlet_penalty_pool`,
`pisi_vzlet_sharing`, `pisi_vzlet_backlog` (splošni seznam opravil brez
datuma — `VzletBacklogDialog`; `moveBacklogToDayAction` ga prek
`addVzletTaskAction` prestavi na danes (= dodatna naloga) ali jutri (= core)). RLS povsod `user_id = auth.uid()` + dodatne
"shared"-police za branje podatkov uporabnikov, ki imajo v
`pisi_vzlet_sharing.shared = true` (glej `0005_vzlet_sharing.sql` za naloge,
`0007_vzlet_days_shared.sql` za dnevne točke) — police se v Postgresu
OR-ajo, torej so dodatne, ne nadomestne.

## Arhitektura

**Sloji** (v vrstnem redu klicanja): server komponenta v `src/app/(app)/*/
page.tsx` → bere prek `src/lib/data/vzlet.ts` (samo branje, tipiziran
`SupabaseClient<Database>`) → poda podatke `"use client"` predstavitveni
komponenti v `src/components/vzlet/`. Mutacije gredo prek `"use server"`
akcij v `src/actions/vzlet.ts` (vsaka odpre svoj `createClient()`, konča z
`revalidatePath("/", "layout")`). Čista domenska logika brez I/O (točkovanje,
rangi, datumska aritmetika) živi v `src/lib/vzlet/score.ts` in `rank.ts`, da
je testljiva/ponovno uporabljena tako v akcijah kot v klientskih komponentah.

**Zavihki** (`src/components/vzlet/VzletTabs.tsx`, seznam `TABS`): Misije
(`/`) · Napredek (`/napredek`) · Tabla (`/tabla`) — vsi pod `(app)` route
group layoutom, ki injicira tab bar; dodajanje nove strani = nov vnos v
`TABS` + nova mapa pod `src/app/(app)/`.

### Točkovanje — živ (sproten) model, ne enkrat-na-dan poravnava

Vsa logika je v `src/lib/vzlet/score.ts`, funkcija **`liveDayPoints(tasks)`**
je edini vir resnice za izračun točk enega dne (uporablja jo tako sprotna
sinhronizacija kot poravnava preteklih dni):

- Opravilo je **"core"** (načrtovano vnaprej) ali **"kasneje dodano"**
  (`isLaterTask`: `created_at`-datum >= `for_date`, npr. dodano na hitro
  isti dan namesto dan prej prek "Cilji za jutri"). **Kazenska opravila
  (`is_penalty`) so vedno core**, čeprav nastanejo isti dan.
- Osnova **10 + vsota težavnosti core opravil** se prišteje šele, ko so
  **čisto vsa** opravila tega dne (core in kasneje dodana) odkljukana.
- **Kasneje dodana opravila prispevajo +1 vsako posebej, takoj ko so
  odkljukana** — neodvisno od tega, ali je vse ostalo že opravljeno
  (spodbuja načrtovanje dan prej namesto dodajanja na hitro).
- Zamujen (pretekel, nedokončan) dan je vedno vreden -125 — to se ugotovi
  šele ob poravnavi (glej spodaj), nikoli živo med dnevom.

**Sprotna sinhronizacija** (`syncTodayPointsAction` v `src/actions/
vzlet.ts`): `VzletBoard.tsx` ima `useEffect`, ki ob vsaki spremembi
današnjih nalog (podpis `id:done:difficulty` v odvisnostih, da se izogne
neskončni zanki prek referenc objektov) upsert-a vrstico za `today` v
`pisi_vzlet_days` — zato se točke takoj poznajo na "Napredek" in "Tabli",
brez čakanja na jutri.

**Poravnava preteklih dni** (`settleVzletAction`, klicana enkrat ob nalaganju
`VzletBoard.tsx`): ker lahko za "danes" že obstaja živo sinhronizirana
vrstica, poravnava dneve **upserta**, ne inserta, in dan preskoči, če že
ima `all_done = true` (živo dokončan) ali `settled_at` (že poravnan, migracija
`0009`) — sicer ga oceni (-125, če core ni dokončan) in nastavi `settled_at`.
Brez `settled_at` bi se zamujen dan ob vsakem nalaganju strani ponovno
poravnal (ponovni -125 + nove kazni). `syncTodayPointsAction` `settled_at`
nikoli ne nastavlja. Po poravnavi doda kazenska
opravila iz `pisi_vzlet_penalty_pool` za zamujene dni in prenese
neopravljena opravila na `todayStr`.

**Rangi** (`rank.ts`, `TIERS`) in **tedenska lestvica "Tabla"**
(`getVzletLeaderboard` v `data/vzlet.ts`, `mondayOf`/`weekPoints` v
`score.ts`) so izpeljani nad istimi `pisi_vzlet_days.points` vrednostmi —
prag rangov je bil ročno umerjen na staro lestvico točk (50/-500 osnova) in
NI bil preskaliran ob prehodu na 10/-125 osnovo; ob naslednji spremembi
formule jih je treba ponovno umeriti.

### AI ocena težavnosti (`src/lib/ai/`)

`anthropic.ts` izvozi en server-only Anthropic klient (`new Anthropic()`,
bere `ANTHROPIC_API_KEY` iz env — NE uvažaj v `"use client"` datoteke).
`difficulty.ts` (`rateTaskDifficulty`) kliče `claude-haiku-4-5`, a je klic
v `addVzletTaskAction` **trenutno zakomentiran** (AI ocena izklopljena).
Težavnost uporabnik vnese ročno in neobvezno: polje 1–10 v "Cilji za jutri"
(`VzletPlanDialog`, 3. argument `addVzletTaskAction`) ali kasneje prek
menijske postavke "Oceni težavnost" (`setVzletTaskDifficultyAction`).
Manjkajoča ocena (`null`) šteje 0. Za ponovni vklop odkomentiraj import in
klic v `addVzletTaskAction` (ob napaki vrne `null`, dodajanja ne prekine).

### PWA / middleware past — past, ki se lahko ponovi

`src/proxy.ts` (middleware) ščiti vse poti, ki niso v `PUBLIC_PATHS`
(`/login`, `/registracija`), s preusmeritvijo na prijavo. Matcher **mora**
izključevati statične `.js` datoteke (`sw.js`, `install-promo.js`) — če jih
middleware prestreže, neprijavljenega uporabnika preusmeri nanje na HTML
stran za prijavo namesto na pravi JS, kar v brskalniku pokvari service
worker s `SyntaxError: Unexpected token '<'`. Pri dodajanju nove statične
skripte v `public/` preveri, da jo `config.matcher` v `proxy.ts` izključuje.

### Deljenje med uporabniki

`pisi_vzlet_sharing` (stolpec `shared`, `display_name`) je edini vir za to,
kateri uporabniki so si "vidni" — brez povezave na `auth.users` razen
`user_id`. `getVzletSharers()` izключi trenutnega uporabnika (za spustni
seznam "Cilji drugih"); `getVzletLeaderboard()` ga **vključi** (za "Tabla",
da vidiš svoje mesto tudi če sam ne deliš). Avatar je povsod krog s prvo
črko imena — v projektu ni sistema za slike profila.
