"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, Search, UploadCloud } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { RoboVaultLogo } from "./logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { navItems, pageMeta } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useState } from "react";

const coreNav = navItems.filter((item) =>
  ["/", "/dashboard", "/upload", "/review", "/export"].includes(item.href)
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? pageMeta["/dashboard"];

  return (
    <div className="min-h-svh bg-[oklch(0.975_0.012_245)] text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[oklch(0.09_0.03_260)] text-white shadow-[0_18px_48px_-34px_oklch(0.08_0.04_260/0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,oklch(0.58_0.22_280/0.22),transparent_34%),radial-gradient(circle_at_82%_20%,oklch(0.64_0.2_235/0.22),transparent_30%)]" />
        <div className="relative mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 md:px-6">
          <Link href="/" className="mr-2 flex min-w-0 items-center" aria-label="RoboVault home">
            <RoboVaultLogo className="h-9 max-w-[178px] brightness-0 invert" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {coreNav.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium text-white/68 transition hover:bg-white/8 hover:text-white",
                    active && "bg-white/10 text-white shadow-[inset_0_0_0_1px_oklch(1_0_0/0.08)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="ml-auto hidden items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/66 transition hover:bg-white/10 hover:text-white md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search documents...</span>
            <kbd className="ml-1 inline-flex items-center gap-1 rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-white/50">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>

          <Button
            asChild
            size="sm"
            className="rounded-lg bg-[oklch(0.58_0.22_286)] text-white shadow-[0_0_28px_oklch(0.58_0.22_286/0.38)] hover:bg-[oklch(0.54_0.22_286)]"
          >
            <Link href="/upload">
              <UploadCloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Start New Job</span>
              <span className="sm:hidden">Upload</span>
            </Link>
          </Button>
        </div>

        <div className="relative border-t border-white/8 lg:hidden">
          <nav className="mx-auto flex max-w-[1480px] gap-1 overflow-x-auto px-4 py-2 md:px-6">
            {coreNav.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white/66 transition hover:bg-white/8 hover:text-white",
                    active && "bg-white/10 text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[oklch(0.82_0.02_240)] bg-[linear-gradient(135deg,white,oklch(0.965_0.02_248))]">
        <div className="absolute right-[-10%] top-[-80px] h-64 w-64 rounded-full bg-[oklch(0.62_0.2_250/0.12)] blur-3xl" />
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-7 md:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="primary" className="mb-3">
              RoboVault workspace
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-[oklch(0.18_0.045_260)] md:text-4xl">
              {meta.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {meta.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-lg bg-white/70">
              <Link href="/">Home</Link>
            </Button>
            <Button
              asChild
              className="rounded-lg bg-[oklch(0.46_0.18_282)] text-white shadow-[0_0_24px_oklch(0.48_0.18_282/0.26)] hover:bg-[oklch(0.42_0.18_282)]"
            >
              <Link href="/upload">Start New Job</Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="relative">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-radial-spot" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-grid-fine opacity-40" />
        <div className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
