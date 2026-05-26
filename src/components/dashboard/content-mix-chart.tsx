"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const baseline = [
  { name: "Blogs",   value: 42, color: "#1DB954" },
  { name: "Landing", value: 26, color: "#37D366" },
  { name: "City",    value: 18, color: "#5EE085" },
  { name: "GBP",     value: 14, color: "#94EAAE" },
];

/**
 * Animated donut: the recharts pie replays its draw animation on a slow
 * cadence (key bump) while the outer wrapper does a continuous, almost-
 * imperceptible breathing scale so the chart always feels alive.
 */
export function ContentMixChart() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 8000);
    return () => clearInterval(i);
  }, []);

  // Gentle ±2% wobble on the values so the slices subtly re-tween each tick.
  const data = baseline.map((d, i) => {
    const wobble = 1 + Math.sin((tick + i) * 0.9) * 0.02;
    return { ...d, value: Math.max(1, Math.round(d.value * wobble)) };
  });

  return (
    <motion.div
      className="h-full w-full"
      animate={{ scale: [1, 1.015, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart key={tick}>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            isAnimationActive
            animationDuration={1400}
            animationEasing="ease-out"
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
