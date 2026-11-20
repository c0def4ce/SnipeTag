"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  points: { price: number | null; recorded_at: string }[];
  target?: number | null;
  className?: string;
}

/** Inline 90-day SVG sparkline — cyan on drops, crimson on rises. */
export function Sparkline({ points, target, className }: SparklineProps) {
  const gradientId = useId().replace(/:/g, "");
  const values = points.map((p) => p.price).filter((p): p is number => p !== null);
  if (values.length < 2) {
    return (
      <div className={cn("flex h-9 items-center justify-center rounded border border-dashed border-border text-[10px] uppercase tracking-widest text-muted-foreground", className)}>
        Building history…
      </div>
    );
  }

  const width = 240, height = 44, pad = 3;
  const min = Math.min(...values, target ?? Infinity);
  const max = Math.max(...values, target ?? -Infinity);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const rising = values[values.length - 1] > values[0];
  const stroke = rising ? "#EF4444" : "#00F5D4";
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cn("h-9 w-full", className)} role="img" aria-label="90-day price history">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      {target != null && (
        <line x1={pad} x2={width - pad} y1={y(target)} y2={y(target)} stroke="#FF00A8" strokeWidth="1" strokeDasharray="3 3" opacity="0.75" />
      )}
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.5" fill={stroke} />
    </svg>
  );
}
