"use client";

import { useEffect, useState } from "react";
import IntroDialog from "@/components/vzlet/IntroDialog";
import { hasSeenIntro, markIntroSeen } from "@/lib/vzlet/intro";

// Predstavitev aplikacije se samodejno pokaže samo ob prvem odprtju aplikacije.
export default function IntroFirstRun() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasSeenIntro()) setOpen(true);
  }, []);

  const close = () => {
    markIntroSeen();
    setOpen(false);
  };

  return <IntroDialog open={open} onClose={close} onDismiss={close} />;
}
