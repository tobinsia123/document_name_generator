import { cn } from "@/lib/utils";

export function RoboVaultLogo({ className }: { className?: string }) {
  return (
    <img
      src="/robovault-logo.svg"
      alt="RoboVault"
      className={cn("h-9 w-auto max-w-[176px]", className)}
    />
  );
}
