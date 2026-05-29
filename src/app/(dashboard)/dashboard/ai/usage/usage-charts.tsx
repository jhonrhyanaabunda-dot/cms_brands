"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#1DB954", "#37D366", "#5EE085", "#94EAAE", "#0F7C39", "#0B5C2A"];

export function UsageCharts({
  daily,
  byKind,
}: {
  daily: Array<{ day: string; tokens: number; runs: number; cost: number }>;
  byKind: Array<{ kind: string; tokens: number; runs: number; cost: number }>;
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Daily token usage</CardTitle>
          <CardDescription>Last 30 days · input + output combined.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#1DB954" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#1DB954" stopOpacity={0} />
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
              <Area type="monotone" dataKey="tokens" stroke="#1DB954" strokeWidth={2} fill="url(#ug)" isAnimationActive animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token split by kind</CardTitle>
          <CardDescription>Where the tokens went.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Pie
                data={byKind}
                dataKey="tokens"
                nameKey="kind"
                innerRadius={50}
                outerRadius={85}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                isAnimationActive
                animationDuration={1200}
                paddingAngle={2}
              >
                {byKind.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
