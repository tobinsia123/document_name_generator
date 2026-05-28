"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  deltaSuffix?: string;
  icon: LucideIcon;
  trend?: number[];
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  hint?: string;
}

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "from-[oklch(0.78_0.06_226/0.28)] to-transparent text-primary",
  success: "from-[oklch(0.74_0.17_158/0.16)] to-transparent text-[color:oklch(0.42_0.12_158)]",
  warning: "from-[oklch(0.82_0.17_78/0.16)] to-transparent text-[color:oklch(0.48_0.12_78)]",
  destructive:
    "from-[oklch(0.7_0.22_22/0.14)] to-transparent text-[color:oklch(0.5_0.17_22)]",
  info: "from-[oklch(0.78_0.06_226/0.22)] to-transparent text-[color:oklch(0.4_0.08_232)]",
};

export function KpiCard({
  label,
  value,
  delta,
  deltaSuffix = "%",
  icon: Icon,
  trend,
  accent = "primary",
  hint,
}: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  const accentCls = accentMap[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/80 p-4 shadow-[0_1px_0_0_oklch(1_0_0/0.85)_inset,0_18px_44px_-34px_oklch(0.24_0.03_252/0.44)] backdrop-blur-sm"
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl",
          accentCls
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular">
              {value}
            </span>
            {typeof delta === "number" && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-medium",
                  positive ? "text-[color:oklch(0.42_0.12_158)]" : "text-[color:oklch(0.5_0.17_22)]"
                )}
              >
                {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}{deltaSuffix}
              </span>
            )}
          </div>
          {hint && (
            <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
          )}
        </div>
        <div
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg border border-border bg-background/40",
            accentCls
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      {trend && trend.length > 1 && (
        <div className="relative mt-4 h-9">
          <Sparkline values={trend} accent={accent} />
        </div>
      )}
    </motion.div>
  );
}

function Sparkline({ values, accent }: { values: number[]; accent: KpiCardProps["accent"] }) {
  const w = 240;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v: number) =>
    max === min ? h / 2 : h - ((v - min) / (max - min)) * (h - 4) - 2;
  const step = w / (values.length - 1);
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step},${norm(v)}`)
    .join(" ");
  const colors: Record<NonNullable<KpiCardProps["accent"]>, string> = {
    primary: "oklch(0.34 0.115 262)",
    success: "oklch(0.78 0.17 158)",
    warning: "oklch(0.86 0.16 78)",
    destructive: "oklch(0.78 0.22 22)",
    info: "oklch(0.78 0.14 232)",
  };
  const stroke = colors[accent ?? "primary"];
  const id = `g-${(accent ?? "primary").toString()}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w},${h} L 0,${h} Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
