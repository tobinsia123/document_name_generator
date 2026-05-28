"use client";

import type { CSSProperties } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fixed(value: number, digits = 4) {
  return value.toFixed(digits);
}

function heatStyle(value: number): CSSProperties {
  const lightness = 0.22 + value * 0.45;
  const chroma = 0.04 + value * 0.18;
  const hue = 264 - value * 30;
  const ring = 0.03 + value * 0.05;

  return {
    "--heat-bg": `oklch(${fixed(lightness)} ${fixed(chroma)} ${fixed(hue, 2)})`,
    "--heat-ring": `oklch(1 0 0 / ${fixed(ring)})`,
  } as CSSProperties;
}

export function RiskHeatmap({
  data,
}: {
  data: { hour: number; day: number; value: number }[];
}) {
  return (
    <TooltipProvider delayDuration={50}>
      <div className="space-y-1.5">
        <div className="ml-9 flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
        {days.map((d, di) => (
          <div key={d} className="flex items-center gap-2">
            <span className="w-7 text-[10px] uppercase tracking-wider text-muted-foreground">
              {d}
            </span>
            <div className="flex flex-1 gap-[2px]">
              {Array.from({ length: 24 }).map((_, hi) => {
                const cell = data.find((c) => c.day === di && c.hour === hi);
                const v = cell?.value ?? 0;
                const intensity = v;
                return (
                  <Tooltip key={hi}>
                    <TooltipTrigger asChild>
                      <div
                        className="heatmap-cell h-5 flex-1 rounded-[3px] transition-transform hover:scale-110"
                        style={heatStyle(intensity)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="font-mono">
                        {d} {hi.toString().padStart(2, "0")}:00 — score {(v * 100).toFixed(0)}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
        <div className="ml-9 mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-[2px]">
            {[0.05, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
              <div
                key={v}
                className="heatmap-swatch h-2.5 w-5 rounded-[2px]"
                style={heatStyle(v)}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
