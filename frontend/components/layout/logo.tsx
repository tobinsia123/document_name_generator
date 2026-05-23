import { cn } from "@/lib/utils";

export function AegisLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative h-7 w-7">
        <div className="absolute inset-0 rounded-md bg-gradient-to-br from-[oklch(0.78_0.18_264)] via-[oklch(0.62_0.2_264)] to-[oklch(0.4_0.14_252)] shadow-[0_0_0_1px_oklch(1_0_0/0.08)_inset,0_8px_24px_-8px_oklch(0.62_0.2_264/0.7)]" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow"
          aria-hidden
        >
          <path
            d="M12 2.5l8 3.2v6.6c0 4.4-3.4 8.6-8 9.2-4.6-.6-8-4.8-8-9.2V5.7l8-3.2z"
            fill="currentColor"
            fillOpacity="0.95"
          />
          <path
            d="M9 12.5l2.2 2.2L15.5 10.4"
            stroke="oklch(0.18 0.04 252)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          AEGIS
        </span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Governance OS
        </span>
      </div>
    </div>
  );
}
