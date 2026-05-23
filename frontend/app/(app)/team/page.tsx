"use client";

import { motion } from "framer-motion";
import { MoreHorizontal, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { team } from "@/lib/data";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";

const roles = [
  { name: "Owner", desc: "Full org control, billing, danger zone." },
  { name: "Admin", desc: "Configure workspace, manage users." },
  { name: "Compliance Officer", desc: "Review audits, approve policies, run reports." },
  { name: "Analyst", desc: "Upload, classify, and label files." },
  { name: "Viewer", desc: "Read-only access to assigned spaces." },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Members" value={String(team.length)} />
        <Stat label="MFA enrolled" value={`${team.filter((t) => t.mfa).length}/${team.length}`} />
        <Stat label="Pending invites" value={String(team.filter((t) => t.status === "invited").length)} />
        <Stat label="Last access review" value="14 days ago" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Least-privilege by default. Roles are inherited at the workspace level.
            </CardDescription>
          </div>
          <Button>
            <UserPlus className="h-3.5 w-3.5" /> Invite member
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 border-b border-border/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <div>Member</div>
            <div className="hidden md:block">Department</div>
            <div>Role</div>
            <div className="hidden md:block">MFA</div>
            <div className="hidden lg:block">Last active</div>
            <div></div>
          </div>
          <div className="divide-y divide-border/60">
            {team.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-[12.5px] hover:bg-white/[0.025]"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{m.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {m.name}{" "}
                      {m.status !== "active" && (
                        <Badge
                          variant={m.status === "invited" ? "info" : "destructive"}
                          size="sm"
                          className="ml-1"
                        >
                          {m.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{m.email}</div>
                  </div>
                </div>
                <div className="hidden md:block text-[11px] text-muted-foreground">
                  {m.department}
                </div>
                <Badge
                  variant={
                    m.role === "Owner"
                      ? "primary"
                      : m.role === "Admin"
                      ? "info"
                      : m.role === "Compliance Officer"
                      ? "warning"
                      : "outline"
                  }
                  size="sm"
                >
                  {m.role}
                </Badge>
                <div className="hidden md:flex items-center justify-center">
                  {m.mfa ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[color:oklch(0.84_0.15_158)]">
                      <ShieldCheck className="h-3 w-3" /> on
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[color:oklch(0.85_0.18_22)]">
                      <ShieldOff className="h-3 w-3" /> off
                    </span>
                  )}
                </div>
                <TimeAgo
                  date={m.lastActive}
                  className="hidden lg:block text-[11px] text-muted-foreground tabular"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>Edit role</DropdownMenuItem>
                    <DropdownMenuItem>Reset MFA</DropdownMenuItem>
                    <DropdownMenuItem>Send activity report</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-[color:oklch(0.85_0.18_22)] focus:text-[color:oklch(0.85_0.18_22)]">
                      Suspend
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role definitions</CardTitle>
          <CardDescription>Permissions are evaluated at every action; see audit for details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((r) => (
              <div
                key={r.name}
                className="rounded-lg border border-border/70 bg-background/30 p-3"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <div className="text-[12.5px] font-medium">{r.name}</div>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{r.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm")}>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular tracking-tight">{value}</div>
    </div>
  );
}
