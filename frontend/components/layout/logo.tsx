import { cn } from "@/lib/utils";

type RoboVaultLogoProps = {
  className?: string;
  onDark?: boolean;
};

export function RoboVaultLogo({ className }: RoboVaultLogoProps) {
  const image = (
    <img
      src="/new_logo_part2.png"
      alt="RoboVault"
      className={cn("h-12 w-auto max-w-[260px]", className)}
      width={680}
      height={180}
    />
  );

  return image;
}
