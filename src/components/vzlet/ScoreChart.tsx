"use client";

import { useMemo, useState } from "react";

export type ChartPoint = {
  label: string; // datum (kratko) — prikaže se tudi na osi X
  total: number;
  provisional?: boolean;
};

const W = 640;
const H = 200;
const PAD_X = 16;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

export default function ScoreChart({ points }: { points: ChartPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    if (points.length === 0) return null;

    const totals = points.map((p) => p.total);
    let minY = Math.min(0, ...totals);
    let maxY = Math.max(0, ...totals);
    if (minY === maxY) {
      minY -= 5;
      maxY += 5;
    }
    const span = maxY - minY;
    minY -= span * 0.1;
    maxY += span * 0.1;

    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_TOP - PAD_BOTTOM;
    const x = (i: number) =>
      points.length === 1
        ? W / 2
        : PAD_X + (i / (points.length - 1)) * innerW;
    const y = (v: number) =>
      PAD_TOP + (1 - (v - minY) / (maxY - minY)) * innerH;

    const linePts = points.map((p, i) => ({ x: x(i), y: y(p.total) }));
    const linePath = linePts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const lastX = linePts[linePts.length - 1].x;
    const firstX = linePts[0].x;
    const areaPath = `${linePath} L${lastX.toFixed(1)},${y(0).toFixed(
      1
    )} L${firstX.toFixed(1)},${y(0).toFixed(1)} Z`;

    const zeroFrac = Math.max(
      0,
      Math.min(1, (y(0) - PAD_TOP) / innerH)
    );

    // oznake dni na osi X — pri veliko točkah jih razredčimo
    const stepEvery = Math.max(1, Math.ceil(points.length / 7));
    const ticks = points
      .map((p, i) => ({ i, label: p.label, x: linePts[i].x }))
      .filter(
        (t) => t.i % stepEvery === 0 || t.i === points.length - 1
      );

    return {
      x,
      y,
      linePts,
      linePath,
      areaPath,
      zeroFrac,
      best: Math.max(...totals),
      ticks,
    };
  }, [points]);

  if (!model) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-gray-200 text-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
        Še ni podatkov — opravi prvi dan misij.
      </div>
    );
  }

  const { linePath, areaPath, zeroFrac, best, linePts, ticks } = model;
  const yZero = model.y(0);
  const yBest = model.y(best);
  const current = points[points.length - 1].total;
  const last = linePts[linePts.length - 1];
  const up = current >= 0;
  const lineColor = up ? "var(--vc-pos)" : "var(--vc-neg)";
  const hoverPt = hover != null ? linePts[hover] : null;

  return (
    <div className="vzlet-chart relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Graf točk skozi čas, trenutno ${current}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let nearest = 0;
          let dist = Infinity;
          linePts.forEach((p, i) => {
            const d = Math.abs(p.x - px);
            if (d < dist) {
              dist = d;
              nearest = i;
            }
          });
          setHover(nearest);
        }}
      >
        <defs>
          <linearGradient
            id="vc-fill"
            x1="0"
            y1={PAD_TOP}
            x2="0"
            y2={H - PAD_BOTTOM}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="var(--vc-pos-fill)" />
            <stop offset={zeroFrac} stopColor="var(--vc-pos-fill)" />
            <stop offset={zeroFrac} stopColor="var(--vc-neg-fill)" />
            <stop offset="1" stopColor="var(--vc-neg-fill)" />
          </linearGradient>
        </defs>

        {/* ničelna črta */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={yZero}
          y2={yZero}
          className="text-gray-300 dark:text-gray-600"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <text
          x={PAD_X}
          y={yZero - 4}
          className="fill-gray-400 text-[10px] dark:fill-gray-500"
        >
          0
        </text>

        {/* osebni rekord — le če si bil že višje kot zdaj */}
        {best > current && best > 0 && Math.abs(yBest - yZero) > 12 && (
          <>
            <line
              x1={PAD_X}
              x2={W - PAD_X}
              y1={yBest}
              y2={yBest}
              className="text-amber-400/70"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 5"
            />
            <text
              x={W - PAD_X}
              y={yBest - 4}
              textAnchor="end"
              className="fill-amber-500 text-[10px]"
            >
              rekord {best}
            </text>
          </>
        )}

        {/* oznake dni (os X) */}
        {ticks.map((t) => (
          <g key={t.i}>
            <line
              x1={t.x}
              x2={t.x}
              y1={H - PAD_BOTTOM}
              y2={H - PAD_BOTTOM + 4}
              className="text-gray-300 dark:text-gray-600"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              x={t.x}
              y={H - PAD_BOTTOM + 16}
              textAnchor={
                t.i === 0
                  ? "start"
                  : t.i === points.length - 1
                    ? "end"
                    : "middle"
              }
              className="fill-gray-400 text-[10px] dark:fill-gray-500"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* ploskev + črta (rahlo žarenje = širša prosojna spodaj) */}
        <path d={areaPath} fill="url(#vc-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.14"
        />
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* trenutna točka + raketa */}
        <circle cx={last.x} cy={last.y} r="9" fill={lineColor} opacity="0.18" />
        <circle
          cx={last.x}
          cy={last.y}
          r="5"
          fill={lineColor}
          stroke="white"
          strokeWidth="2.5"
        />
        <svg
          x={last.x - 22}
          y={last.y - 32}
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            up
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }
        >
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>

        {/* namig */}
        {hoverPt && (
          <>
            <line
              x1={hoverPt.x}
              x2={hoverPt.x}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              className="text-gray-300 dark:text-gray-600"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle
              cx={hoverPt.x}
              cy={hoverPt.y}
              r="4"
              className="fill-gray-900 dark:fill-gray-100"
            />
          </>
        )}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-md dark:border-gray-700 dark:bg-gray-900"
          style={{
            left: `${(linePts[hover].x / W) * 100}%`,
            top: `${(linePts[hover].y / H) * 100}%`,
          }}
        >
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {points[hover].total} točk
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {points[hover].label}
            {points[hover].provisional ? " · danes" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
