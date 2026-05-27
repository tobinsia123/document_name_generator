import { cn } from "@/lib/utils";

export function ProjectZLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <ProjectZMark />
      <span className="truncate text-[16px] font-semibold tracking-tight text-foreground">
        Project <span className="text-primary">Z.</span>
      </span>
    </div>
  );
}

export { ProjectZLogo as AegisLogo };

function ProjectZMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-9 w-9 shrink-0 drop-shadow-[0_10px_22px_rgb(0_200_83/0.28)]"
      aria-hidden
    >
      <rect width="64" height="64" rx="10" fill="white" />
      <path
        d="M13 10h41L20 54h35"
        fill="none"
        stroke="var(--brand-green)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 34h17"
        fill="none"
        stroke="var(--brand-green)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d="M10 21h14L10 36z" fill="#050505" />
      <path d="M48 39v15H34z" fill="#050505" />
    </svg>
  );
}
