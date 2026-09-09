"use client";

import { useEffect, useRef } from "react";

type FireworksProps = {
  /** Večji ognjemet ob dokončanju vseh opravil. */
  big?: boolean;
  /** Pokliče se, ko animacija zaključi (starš naj komponento odmontira). */
  onDone?: () => void;
};

const COLORS = [
  "#2563eb",
  "#60a5fa",
  "#f59e0b",
  "#fbbf24",
  "#ec4899",
  "#f472b6",
  "#10b981",
  "#34d399",
  "#a855f7",
  "#c084fc",
  "#ffffff",
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  decay: number;
  color: string;
  size: number;
  trail: boolean;
};

type Rocket = {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  arc: number;
  color: string;
  launchAt: number;
  duration: number;
  exploded: boolean;
};

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2.2);
}

/**
 * Lasten canvas ognjemet — brez odvisnosti. Rakete letijo z vseh robov zaslona
 * proti notranjim točkam in eksplodirajo v žive barvne delce. Spoštuje
 * `prefers-reduced-motion`.
 */
export default function Fireworks({ big = false, onDone }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      doneRef.current?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

    // Izhodišče na naključnem robu zaslona.
    const edgeStart = (): { sx: number; sy: number } => {
      const side = Math.floor(Math.random() * 4);
      const m = 12;
      if (side === 0) return { sx: rnd(0, w), sy: h + m }; // spodaj
      if (side === 1) return { sx: -m, sy: rnd(h * 0.1, h * 0.95) }; // levo
      if (side === 2) return { sx: w + m, sy: rnd(h * 0.1, h * 0.95) }; // desno
      return { sx: rnd(0, w), sy: -m }; // zgoraj
    };

    const rocketCount = big ? 12 : 6;
    const rockets: Rocket[] = [];
    for (let i = 0; i < rocketCount; i++) {
      const { sx, sy } = edgeStart();
      rockets.push({
        sx,
        sy,
        tx: rnd(w * 0.12, w * 0.88),
        ty: rnd(h * 0.12, h * 0.62),
        arc: rnd(-70, 70),
        color: pickColor(),
        launchAt: i * (big ? 90 : 130) + rnd(0, 60),
        duration: rnd(430, 680),
        exploded: false,
      });
    }

    const particles: Particle[] = [];

    const explode = (x: number, y: number, color: string) => {
      const count = big ? 84 : 62;
      // dva obroča: hitri navzven + počasnejši
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
        const ring = Math.random() < 0.5 ? 1 : 0.55;
        const speed = rnd(2.2, big ? 7.5 : 6) * ring;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rnd(0.009, 0.022),
          color: Math.random() < 0.3 ? pickColor() : color,
          size: rnd(1.5, 3.2),
          trail: Math.random() < 0.18,
        });
      }
      // nekaj isker s sledjo
      for (let i = 0; i < (big ? 14 : 9); i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = rnd(4, big ? 10 : 8);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rnd(0.006, 0.012),
          color: pickColor(),
          size: rnd(1.2, 2),
          trail: true,
        });
      }
    };

    let raf = 0;
    const start = performance.now();
    const lastLaunch = rockets.reduce((m, r) => Math.max(m, r.launchAt), 0);

    const tick = (nowT: number) => {
      const elapsed = nowT - start;
      ctx.clearRect(0, 0, w, h);

      for (const r of rockets) {
        if (r.exploded) continue;
        const local = elapsed - r.launchAt;
        if (local < 0) continue;
        const p = local / r.duration;
        if (p >= 1) {
          r.exploded = true;
          explode(r.tx, r.ty, r.color);
          continue;
        }
        const e = easeOut(p);
        const cx = r.sx + (r.tx - r.sx) * e;
        const cy = r.sy + (r.ty - r.sy) * e;
        // rahel bočni lok
        const perpX = -(r.ty - r.sy);
        const perpY = r.tx - r.sx;
        const plen = Math.hypot(perpX, perpY) || 1;
        const bow = Math.sin(p * Math.PI) * r.arc;
        const x = cx + (perpX / plen) * bow;
        const y = cy + (perpY / plen) * bow;

        // rep
        const tailE = easeOut(Math.max(0, p - 0.06));
        const tx = r.sx + (r.tx - r.sx) * tailE + (perpX / plen) * bow;
        const ty = r.sy + (r.ty - r.sy) * tailE + (perpY / plen) * bow;
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.trail) {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life) * 0.6;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.stroke();
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.055; // gravitacija
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const finished =
        elapsed > lastLaunch + 900 &&
        rockets.every((r) => r.exploded) &&
        particles.length === 0;
      if (finished || elapsed > lastLaunch + 4000) {
        window.removeEventListener("resize", resize);
        ctx.clearRect(0, 0, w, h);
        doneRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [big]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
    />
  );
}
