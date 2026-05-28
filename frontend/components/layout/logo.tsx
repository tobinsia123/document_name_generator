import { cn } from "@/lib/utils";

type RoboVaultLogoProps = {
  className?: string;
  /** Light backdrop so the full-color wordmark reads on dark nav bars. */
  onDark?: boolean;
};

export function RoboVaultLogo({ className, onDark = false }: RoboVaultLogoProps) {
  const image = (
    <img
      src="/robovault-logo.svg"
      alt="RoboVault"
      className={cn("h-9 w-auto max-w-[190px]", className)}
      width={680}
      height={180}
    />
  );

  if (!onDark) return image;

  return (
    <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 shadow-sm">
      {image}
    </span>
  );
}
