"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Eye, EyeOff, KeyRound, MoreHorizontal, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiKeys } from "@/lib/data";
import { TimeAgo } from "@/components/shared/time-ago";

export default function ApiKeysPage() {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              Active keys
            </CardTitle>
            <CardDescription>
              Programmatic access tokens with scoped permissions
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-3.5 w-3.5" /> Generate key
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 border-b border-border/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <div>Name & key</div>
            <div className="hidden md:block">Env</div>
            <div className="hidden md:block">Scopes</div>
            <div className="hidden lg:block">Last used</div>
            <div></div>
          </div>
          <div className="divide-y divide-border/60">
            {apiKeys.map((k, i) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3 text-[12.5px] hover:bg-white/[0.025]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    {k.status === "revoked" && (
                      <Badge variant="destructive" size="sm">revoked</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <code className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {reveal[k.id] ? `${k.prefix}_••••aa12cc88dd09` : `${k.prefix}_•••••••••••`}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setReveal((r) => ({ ...r, [k.id]: !r[k.id] }))
                      }
                      className="h-6 w-6"
                    >
                      {reveal[k.id] ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-1 text-[10.5px] text-muted-foreground">
                    Created by {k.createdBy} · <TimeAgo date={k.createdAt} />
                  </div>
                </div>

                <div className="hidden md:block">
                  <Badge
                    variant={
                      k.environment === "production"
                        ? "primary"
                        : k.environment === "staging"
                        ? "warning"
                        : "muted"
                    }
                    size="sm"
                  >
                    {k.environment}
                  </Badge>
                </div>

                <div className="hidden md:flex flex-wrap gap-1 max-w-[260px]">
                  {k.scopes.map((s) => (
                    <Badge key={s} variant="outline" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>

                <div className="hidden lg:block text-[11px] text-muted-foreground tabular">
                  {k.lastUsed ? <TimeAgo date={k.lastUsed} /> : "—"}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>Edit scopes</DropdownMenuItem>
                    <DropdownMenuItem>Rotate</DropdownMenuItem>
                    <DropdownMenuItem>View usage</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-[color:oklch(0.85_0.18_22)] focus:text-[color:oklch(0.85_0.18_22)]">
                      Revoke
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
          <CardTitle>SDKs & quickstart</CardTitle>
          <CardDescription>Drop into any backend with 4 lines of code</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-lg border border-border bg-background/40 p-4 text-[11.5px] leading-relaxed">
            <code className="font-mono text-foreground/90">
{`import { Aegis } from "@aegis/sdk";

const aegis = new Aegis({ apiKey: process.env.AEGIS_KEY });

const result = await aegis.files.ingest({
  source: "./contracts/",
  policies: ["SSN-Auto-Encrypt", "PHI-Tokenization"],
  storage: "vault",
});

console.log(result.summary);
// { processed: 412, encrypted: 308, blocked: 1, archived: 103 }`}
            </code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
