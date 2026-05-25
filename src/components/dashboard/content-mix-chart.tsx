"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Blogs",   value: 42, color: "#1DB954" },
  { name: "Landing", value: 26, color: "#37D366" },
  { name: "City",    value: 18, color: "#5EE085" },
  { name: "GBP",     value: 14, color: "#94EAAE" },
];

export function ContentMixChart() {
  return (
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
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} stroke="hsl(var(--background))" strokeWidth={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
