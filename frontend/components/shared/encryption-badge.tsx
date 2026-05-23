import { Lock, LockOpen, ShieldCheck } from "lucide-react";
import type { EncryptionState } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EncryptionBadge({ state }: { state: EncryptionState }) {
  if (state === "none") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <LockOpen className="h-3 w-3" /> Plain
      </span>
    );
  }
  const map: Record<Exclude<EncryptionState, "none">, { label: string; cls: string; Icon: typeof Lock }> = {
    aes256: {
      label: "AES-256",
      cls: "border-[color:oklch(0.78_0.17_158/0.35)] bg-[color:oklch(0.78_0.17_158/0.1)] text-[color:oklch(0.86_0.15_158)]",
      Icon: Lock,
    },
    chacha20: {
      label: "ChaCha20",
      cls: "border-[color:oklch(0.78_0.17_158/0.35)] bg-[color:oklch(0.78_0.17_158/0.1)] text-[color:oklch(0.86_0.15_158)]",
      Icon: Lock,
    },
    "client-managed": {
      label: "Client-managed",
      cls: "border-[color:oklch(0.72_0.16_264/0.35)] bg-[color:oklch(0.72_0.16_264/0.1)] text-[color:oklch(0.86_0.13_264)]",
      Icon: ShieldCheck,
    },
  };
  const m = map[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        m.cls
      )}
    >
      <m.Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}
