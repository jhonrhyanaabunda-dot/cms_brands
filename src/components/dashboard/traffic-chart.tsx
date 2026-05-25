"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; organic: number; direct: number };

const fallback: Point[] = Array.from({ length: 30 }, (_, i) => {
  const base = 1200 + Math.sin(i / 3) * 220 + i * 18;
  return { day: `D${i + 1}`, organic: Math.round(base), direct: Math.round(base * 0.4) };
});

export function TrafficChart({ data }: { data?: Point[] }) {
  const series = data && data.length > 0 ? data : fallback;
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
        <Area type="monotone" dataKey="organic" stroke="#1DB954" strokeWidth={2} fill="url(#g1)" />
        <Area type="monotone" dataKey="direct"  stroke="#5EE085" strokeWidth={2} fill="url(#g2)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
