"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; organic: number; direct: number };

const baselineFallback: Point[] = Array.from({ length: 30 }, (_, i) => {
  const base = 1200 + Math.sin(i / 3) * 220 + i * 18;
  return { day: `D${i + 1}`, organic: Math.round(base), direct: Math.round(base * 0.4) };
});

function shiftSeries(data: Point[], phase: number): Point[] {
  return data.map((p, i) => {
    const k = (i + phase) / 3.1;
    const oWobble = 1 + Math.sin(k) * 0.07;
    const dWobble = 1 + Math.cos(k * 1.3) * 0.08;
    return {
      day: p.day,
      organic: Math.max(0, Math.round(p.organic * oWobble)),
      direct: Math.max(0, Math.round(p.direct * dWobble)),
    };
  });
}

/**
 * Smooth-motion chart driven by requestAnimationFrame instead of setInterval.
 * Phase advances ~60×/sec by a tiny delta — the chart moves continuously
 * instead of "stepping" every Nth ms. Recharts' built-in tween is disabled
 * because it would fight with this and cause the stutter we'd otherwise see.
 */
export function TrafficChart({ data }: { data?: Point[] }) {
  const baseline = useMemo(
    () => (data && data.length > 0 ? data : baselineFallback),
    [data]
  );
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Speed: ~1.4 phase units per second. Tunable; higher = faster wave.
      phaseRef.current += dt * 1.4;
      setPhase(phaseRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const series = useMemo(() => shiftSeries(baseline, phase), [baseline, phase]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
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
        <Area type="monotone" dataKey="organic" stroke="#1DB954" strokeWidth={2} fill="url(#g1)" isAnimationActive={false} />
        <Area type="monotone" dataKey="direct"  stroke="#5EE085" strokeWidth={2} fill="url(#g2)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
