"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const baseline = [
  { name: "Blogs",   value: 42, color: "#1DB954" },
  { name: "Landing", value: 26, color: "#37D366" },
  { name: "City",    value: 18, color: "#5EE085" },
  { name: "GBP",     value: 14, color: "#94EAAE" },
];

/**
 * Animated donut driven by requestAnimationFrame (~60fps). Phase advances
 * smoothly, slices wobble by ±7%, and the outer wrapper does a slow
 * breathing scale via framer-motion. Recharts' own tween is disabled so
 * the two systems don't collide and stutter.
 */
export function ContentMixChart() {
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastTick = 0;
    const FRAME_MS = 1000 / 30;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      phaseRef.current += dt * 1.6;
      if (!document.hidden && now - lastTick >= FRAME_MS) {
        setPhase(phaseRef.current);
        lastTick = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const data = useMemo(
    () => baseline.map((d, i) => {
      const wobble = 1 + Math.sin(phase + i * 1.4) * 0.07;
      return { ...d, value: Math.max(1, d.value * wobble) };
    }),
    [phase]
  );

  return (
    <motion.div
      className="h-full w-full"
      animate={{ scale: [1, 1.025, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
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
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            isAnimationActive={false}
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
