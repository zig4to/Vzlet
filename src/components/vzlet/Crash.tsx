"use client";

import { useEffect, useRef, useState } from "react";

type CrashProps = {
  /** Koliko zamujenih dni. */
  count: number;
  onDone?: () => void;
};

/**
 * „Crash“ ob zamujenem dnevu: rdeč blisk + tresljaj zaslona + padajoča raketa
 * z delci navzdol + sporočilo „−50 · zamujen dan“. Sam se odmontira po ~2 s.
 * Spoštuje `prefers-reduced-motion`.
 */
export default function Crash({ count, onDone }: CrashProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(onDone);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // tresljaj zaslona
    let shakeTimer: ReturnType<typeof setTimeout> | undefined;
    if (!reduce) {
      document.body.classList.add("vzlet-shake");
      shakeTimer = setTimeout(
        () => document.body.classList.remove("vzlet-shake"),
        600
      );
    }

    const hide = setTimeout(() => {
      setVisible(false);
      doneRef.current?.();
    }, 2200);

    if (reduce)
      return () => {
        clearTimeout(hide);
        clearTimeout(shakeTimer);
      };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx)
      return () => {
        clearTimeout(hide);
        clearTimeout(shakeTimer);
      };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rocket = { x: w * 0.5, y: -40, vx: (Math.random() - 0.5) * 2, vy: 3, rot: 0 };
    const parts = Array.from({ length: 40 }, () => ({
      x: w * 0.5,
      y: -20,
      vx: (Math.random() - 0.5) * 5,
      vy: 1 + Math.random() * 3,
      life: 1,
      size: 1.5 + Math.random() * 2.5,
    }));

    let raf = 0;
    let frame = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      rocket.x += rocket.vx;
      rocket.y += rocket.vy;
      rocket.vy += 0.35;
      rocket.rot += 0.14;
      ctx.save();
      ctx.translate(rocket.x, rocket.y);
      ctx.rotate(rocket.rot + Math.PI);
      ctx.strokeStyle = "#f87171";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(6, 8);
      ctx.lineTo(-6, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16;
        p.life -= 0.012;
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = Math.random() < 0.5 ? "#ef4444" : "#f97316";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (frame < 150 && rocket.y < h + 60) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(hide);
      clearTimeout(shakeTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.body.classList.remove("vzlet-shake");
    };
  }, [count]);

  if (!visible) return null;

  const label =
    count > 1 ? `−${50 * count} · ${count} zamujeni dnevi` : "−50 · zamujen dan";

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div className="vzlet-crash-flash absolute inset-0 bg-red-600" />
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="status"
          aria-live="polite"
          className="vzlet-fire-border max-w-full rounded-xl border-2 border-red-500 bg-white px-6 py-4 text-center text-lg font-semibold text-red-700 shadow-2xl dark:bg-gray-900 dark:text-red-300"
        >
          {label}
        </div>
      </div>
    </div>
  );
}
