"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { navItems } from "@/lib/nav";
import { files } from "@/lib/data";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <Command
          label="Global command palette"
          className="bg-transparent"
          loop
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              placeholder="Search pages, files, audit events, policies…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px] tracking-wider text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
              No results
            </Command.Empty>
            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={`go ${item.label} ${item.group}`}
                    onSelect={() => {
                      router.push(item.href);
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] data-[selected=true]:bg-accent"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.group}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
            <Command.Group
              heading="Recent files"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {files.slice(0, 6).map((f) => (
                <Command.Item
                  key={f.id}
                  value={`file ${f.renamedTo ?? f.originalName} ${f.id}`}
                  onSelect={() => {
                    router.push("/files");
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] data-[selected=true]:bg-accent"
                >
                  <span className="truncate">{f.renamedTo ?? f.originalName}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                    {f.sensitivity}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
