"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import clsx from "@/lib/utils/clsx";
import { IconCheck, IconFlame, IconRocket } from "@/components/ui/icons";

const STEPS = [
  {
    icon: <IconRocket className="h-6 w-6" />,
    title: "Predstavitev aplikacije",
    body: (
      <p>
        Aplikacija je namenjena spremljanju dnevnega napredka ter izboljšanju
        konsistentnosti in organiziranosti pri najnujnejših opravilih, ki jih
        pogosto odlašamo ali pozabljamo.
      </p>
    ),
  },
  {
    icon: <IconCheck className="h-6 w-6" />,
    title: "Cilj",
    body: (
      <>
        <p>
          Vsak dan si za naslednji dan določimo realen in dosegljiv načrt.
          Izberemo le opravila, za katera smo 100 % prepričani, da jih bomo lahko
          opravili.
        </p>
        <p>
          Bolje je uspešno dokončati 1–3 pomembna opravila, kot si zadati preveč
          in ne slediti načrtu.
        </p>
        <p className="rounded-md bg-blue-50 px-3 py-2 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Cilj je vsak dan nekaj zares dokončati.
        </p>
      </>
    ),
  },
  {
    icon: <IconFlame className="h-6 w-6" />,
    title: "Pravila",
    body: (
      <>
        <p>
          Opravilo lahko prestavimo, če ga nismo mogli opraviti iz upravičenega
          razloga, na katerega nismo mogli vplivati.
        </p>
        <p>
          Če opravila ne opravimo zaradi slabe organizacije, odlašanja ali lastne
          napake, sledi kazenska naloga.
        </p>
        <p>
          Cilj ni izpolniti čim več opravil, ampak dosledno izpolnjevati realno
          zastavljene cilje.
        </p>
      </>
    ),
  },
];

type IntroDialogProps = {
  open: boolean;
  /** Sproži se ob zadnjem gumbu („Začni“ / „Zapri“). */
  onClose: () => void;
  /** Sproži se ob ✕ / Esc / kliku zunaj (privzeto isto kot onClose). */
  onDismiss?: () => void;
  /** Napis zadnjega gumba (npr. „Začni“ ali „Zapri“). */
  finishLabel?: string;
};

export default function IntroDialog({
  open,
  onClose,
  onDismiss,
  finishLabel = "Zapri",
}: IntroDialogProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setStep(0);
  }, [open]);

  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Modal open={open} onClose={onDismiss ?? onClose} title={current.title}>
      <div className="space-y-4">
        {/* Fiksna višina, da se popup med koraki ne premika. */}
        <div className="h-56 overflow-y-auto pr-1">
          <div className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              {current.icon}
            </span>
            <div className="space-y-2">{current.body}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    i === step
                      ? "bg-blue-600 dark:bg-blue-400"
                      : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
              ))}
            </div>
            {!last && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline dark:hover:text-gray-300"
              >
                Preskoči
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                Nazaj
              </Button>
            )}
            {last ? (
              <Button type="button" onClick={onClose}>
                {finishLabel}
              </Button>
            ) : (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                Naprej
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
