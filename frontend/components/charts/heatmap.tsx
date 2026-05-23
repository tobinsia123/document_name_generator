"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
                        className="h-5 flex-1 rounded-[3px] transition-transform hover:scale-110"
                        style={{
                          background: `oklch(${0.22 + intensity * 0.45} ${
                            0.04 + intensity * 0.18
                          } ${264 - intensity * 30})`,
                          boxShadow: `inset 0 0 0 1px oklch(1 0 0 / ${
                            0.03 + intensity * 0.05
                          })`,
                        }}
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
                className="h-2.5 w-5 rounded-[2px]"
                style={{
                  background: `oklch(${0.22 + v * 0.45} ${0.04 + v * 0.18} ${
                    264 - v * 30
                  })`,
                }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
