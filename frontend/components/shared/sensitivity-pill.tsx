import { cn } from "@/lib/utils";
import type { Sensitivity } from "@/lib/types";

const map: Record<
  Sensitivity,
  { label: string; cls: string; dot: string }
> = {
  public: {
    label: "Public",
    cls: "border-border text-muted-foreground bg-secondary/40",
    dot: "bg-muted-foreground",
  },
  internal: {
    label: "Internal",
    cls: "border-[color:oklch(0.74_0.14_232/0.3)] bg-[color:oklch(0.74_0.14_232/0.1)] text-[color:oklch(0.86_0.12_232)]",
    dot: "bg-[color:oklch(0.74_0.14_232)]",
  },
  confidential: {
    label: "Confidential",
    cls: "border-[color:oklch(0.82_0.17_78/0.3)] bg-[color:oklch(0.82_0.17_78/0.1)] text-[color:oklch(0.9_0.15_78)]",
    dot: "bg-[color:oklch(0.86_0.16_78)]",
  },
  restricted: {
    label: "Restricted",
    cls: "border-[color:oklch(0.7_0.22_22/0.35)] bg-[color:oklch(0.7_0.22_22/0.1)] text-[color:oklch(0.85_0.18_22)]",
    dot: "bg-[color:oklch(0.78_0.22_22)]",
  },
};

export function SensitivityPill({
  level,
  className,
}: {
  level: Sensitivity;
  className?: string;
}) {
  const m = map[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        m.cls,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
