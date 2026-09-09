# Vzlet

Samostojna aplikacija za dnevni fokus: vsak dan si zadaš realen načrt
najpomembnejših opravil, jih odkljukaš, dobiš točke in spremljaš napredek
(graf, niz, rang, kazenska opravila). Omogoča tudi deljenje svojih dnevnih
ciljev z drugimi uporabniki.

Izločeno iz aplikacije **Pisi**, kjer je bilo prej podstran `/vzlet`.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
`@supabase/ssr`.

## Namestitev

```bash
npm install
```

## Okoljske spremenljivke

`.env.local` kaže na **isti** Supabase projekt kot `Pisi` (tabele `pisi_vzlet_*`
že obstajajo). Če želiš svoj projekt, prilagodi:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Baza (Supabase)

Ob istem projektu kot `Pisi` **ni treba zaganjati nobene migracije** — tabele
`pisi_vzlet_tasks`, `pisi_vzlet_days`, `pisi_vzlet_penalty_pool` in
`pisi_vzlet_sharing` ter RLS že obstajajo.

Za svež projekt zaženi v **Supabase Dashboard → SQL Editor** po vrsti:
`supabase/migrations/0001_init.sql` (samo funkcija `set_updated_at`),
nato `0002_dons_tasks.sql`, `0003_rename_dons_to_vzlet.sql`,
`0004_vzlet_progress.sql`, `0005_vzlet_sharing.sql`.

## Zagon

```bash
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Uporaba

- `/registracija` – ustvari račun · `/login` – prijava (isti uporabniki kot
  Pisi, če je isti Supabase; SSO deep-link iz huba deluje).
- `/` – **Misije**: dodaj cilje za danes/jutri, odkljukaj; ob vseh opravljenih
  „danes +N točk“.
- `/napredek` – graf točk, niz, rang, kazenski seznam.
- Meni (⋮) zgoraj desno: navigacija, **Deli moje cilje**, **Cilj aplikacije**,
  Nastavitve, Odjava.
- Gumb **Cilji drugih** v glavi Misij → seznam oseb, ki delijo, in ogled
  njihovih današnjih ciljev.
