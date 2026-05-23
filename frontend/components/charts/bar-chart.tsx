"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: { name: string; value: number; gap?: number }[];
  height?: number;
}

export function ComplianceBars({ data, height = 220 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div
        className="shimmer rounded-md bg-white/[0.02]"
        style={{ width: "100%", height }}
      />
    );
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
          <CartesianGrid stroke="oklch(1 0 0 / 0.04)" horizontal={false} />
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="oklch(0.66 0.012 250)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={86}
          />
          <Tooltip
            cursor={{ fill: "oklch(1 0 0 / 0.05)" }}
            contentStyle={{
              background: "oklch(0.18 0.013 250 / 0.95)",
              border: "1px solid oklch(1 0 0 / 0.08)",
              borderRadius: 8,
              fontSize: 11,
              padding: "6px 8px",
            }}
            itemStyle={{ color: "oklch(0.96 0.005 240)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={12}>
            {data.map((d, i) => {
              const c =
                d.value >= 95
                  ? "oklch(0.78 0.17 158)"
                  : d.value >= 85
                  ? "oklch(0.72 0.18 264)"
                  : d.value >= 75
                  ? "oklch(0.86 0.16 78)"
                  : "oklch(0.78 0.22 22)";
              return <Cell key={i} fill={c} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
