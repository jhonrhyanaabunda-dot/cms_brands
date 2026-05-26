"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; organic: number; direct: number };

const baselineFallback: Point[] = Array.from({ length: 30 }, (_, i) => {
  const base = 1200 + Math.sin(i / 3) * 220 + i * 18;
  return { day: `D${i + 1}`, organic: Math.round(base), direct: Math.round(base * 0.4) };
});

/**
 * Adds a small phase-shifted oscillation to the baseline data so the chart
 * "breathes" without losing its shape — each tick we nudge values up/down
 * by ≤ ~3% along a sine curve and bump a key so recharts replays the path
 * animation. Stable enough that tooltips still feel meaningful.
 */
function shiftSeries(data: Point[], phase: number): Point[] {
  return data.map((p, i) => {
    const k = (i + phase * 1.7) / 3.1;
    const oWobble = 1 + Math.sin(k) * 0.03;
    const dWobble = 1 + Math.cos(k * 1.3) * 0.04;
    return {
      day: p.day,
      organic: Math.max(0, Math.round(p.organic * oWobble)),
      direct: Math.max(0, Math.round(p.direct * dWobble)),
    };
  });
}

export function TrafficChart({ data }: { data?: Point[] }) {
  const baseline = useMemo(
    () => (data && data.length > 0 ? data : baselineFallback),
    [data]
  );
  const [phase, setPhase] = useState(0);
  const [tick, setTick] = useState(0);
  const mounted = useRef(false);

  // Replay the mount animation every ~6s so the chart feels alive without
  // becoming distracting. Each tick also rolls the phase forward so the
  // underlying values shift gently — a "live" feeling, not a hard refresh.
  useEffect(() => {
    mounted.current = true;
    const i = setInterval(() => {
      setPhase((p) => p + 1);
      setTick((t) => t + 1);
    }, 6000);
    return () => clearInterval(i);
  }, []);

  const series = useMemo(() => shiftSeries(baseline, phase), [baseline, phase]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart key={tick} data={series} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1DB954" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#1DB954" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#5EE085" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#5EE085" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
        <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="organic"
          stroke="#1DB954"
          strokeWidth={2}
          fill="url(#g1)"
          isAnimationActive
          animationDuration={1400}
          animationEasing="ease-out"
        />
        <Area
          type="monotone"
          dataKey="direct"
          stroke="#5EE085"
          strokeWidth={2}
          fill="url(#g2)"
          isAnimationActive
          animationDuration={1400}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
