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
          "border-[color:oklch(0.74_0.17_158/0.3)] bg-[color:oklch(0.74_0.17_158/0.12)] text-[color:oklch(0.84_0.15_158)]",
        warning:
          "border-[color:oklch(0.82_0.17_78/0.3)] bg-[color:oklch(0.82_0.17_78/0.12)] text-[color:oklch(0.9_0.15_78)]",
        destructive:
          "border-[color:oklch(0.7_0.22_22/0.35)] bg-[color:oklch(0.7_0.22_22/0.12)] text-[color:oklch(0.85_0.18_22)]",
        info: "border-[color:oklch(0.74_0.14_232/0.3)] bg-[color:oklch(0.74_0.14_232/0.12)] text-[color:oklch(0.86_0.12_232)]",
        primary:
          "border-[color:rgb(0_200_83/0.35)] bg-[color:rgb(0_200_83/0.14)] text-[color:rgb(0_200_83)]",
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
