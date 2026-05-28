import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-border bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        success:
          "border-[color:oklch(0.58_0.14_158/0.28)] bg-[color:oklch(0.74_0.17_158/0.12)] text-[color:oklch(0.42_0.12_158)]",
        warning:
          "border-[color:oklch(0.68_0.15_78/0.3)] bg-[color:oklch(0.82_0.17_78/0.14)] text-[color:oklch(0.48_0.12_78)]",
        destructive:
          "border-[color:oklch(0.62_0.2_22/0.32)] bg-[color:oklch(0.7_0.22_22/0.11)] text-[color:oklch(0.5_0.17_22)]",
        info: "border-[color:oklch(0.58_0.09_232/0.28)] bg-[color:oklch(0.78_0.06_226/0.18)] text-[color:oklch(0.4_0.08_232)]",
        primary:
          "border-[color:oklch(0.34_0.115_262/0.28)] bg-[color:oklch(0.78_0.06_226/0.18)] text-[color:oklch(0.34_0.115_262)]",
        muted: "border-border bg-muted/40 text-muted-foreground",
      },
      size: {
        default: "h-5",
        sm: "h-4 px-1 text-[9.5px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}
