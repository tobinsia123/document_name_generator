"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  data: { name: string; value: number; key?: string }[];
  colors: string[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
}

export function DonutChart({
  data,
  colors,
  centerLabel,
  centerValue,
  height = 220,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div
        className="shimmer rounded-md bg-accent/30"
        style={{ width: "100%", height }}
      />
    );
  return (
    <div className="relative" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius="60%"
            outerRadius="86%"
            paddingAngle={2}
            stroke="oklch(0.16 0.012 250)"
            strokeWidth={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "oklch(0.18 0.013 250 / 0.95)",
              border: "1px solid oklch(1 0 0 / 0.08)",
              borderRadius: 8,
              fontSize: 11,
              padding: "6px 8px",
            }}
            itemStyle={{ color: "oklch(0.96 0.005 240)" }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <div className="text-2xl font-semibold tabular tracking-tight text-foreground">
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {centerLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
