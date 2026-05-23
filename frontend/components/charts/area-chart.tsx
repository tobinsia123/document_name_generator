"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Record<string, string | number>[];
  xKey: string;
  series: SeriesConfig[];
  height?: number;
}

export function AreaSeriesChart({ data, xKey, series, height = 240 }: Props) {
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
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            {series.map((s) => (
              <linearGradient
                id={`grad-${s.key}`}
                key={s.key}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="oklch(1 0 0 / 0.04)" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="oklch(0.66 0.012 250)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            interval={4}
          />
          <YAxis
            stroke="oklch(0.66 0.012 250)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: "oklch(1 0 0 / 0.1)", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "oklch(0.18 0.013 250 / 0.95)",
              border: "1px solid oklch(1 0 0 / 0.08)",
              borderRadius: 8,
              fontSize: 11,
              padding: "6px 8px",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            labelStyle={{ color: "oklch(0.66 0.012 250)", fontSize: 10, marginBottom: 2 }}
            itemStyle={{ color: "oklch(0.96 0.005 240)" }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              fill={`url(#grad-${s.key})`}
              strokeWidth={1.6}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
