"use client";

import { CheckCircle2, CreditCard, Download, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaSeriesChart } from "@/components/charts/area-chart";
import { ingestSeries } from "@/lib/data";
import { motion } from "framer-motion";

const invoices = [
  { id: "INV-2025-04", date: "Apr 1, 2025", amount: 18_412, status: "paid" },
  { id: "INV-2025-03", date: "Mar 1, 2025", amount: 17_980, status: "paid" },
  { id: "INV-2025-02", date: "Feb 1, 2025", amount: 17_220, status: "paid" },
  { id: "INV-2025-01", date: "Jan 1, 2025", amount: 16_488, status: "paid" },
];

const tiers = [
  {
    name: "Team",
    price: "$2,400",
    cadence: "/mo",
    bullets: [
      "Up to 25 seats",
      "100K files governed",
      "AES-256 + KMS",
      "SOC 2 + GDPR",
      "S3 / GCS storage",
    ],
    cta: "Downgrade",
    current: false,
  },
  {
    name: "Enterprise",
    price: "$18,412",
    cadence: "/mo",
    bullets: [
      "Unlimited seats",
      "Unlimited files",
      "BYOK + HSM",
      "All frameworks + custom",
      "Decentralized archival",
      "24/7 incident response",
      "Dedicated CSM",
    ],
    cta: "Current plan",
    current: true,
  },
  {
    name: "Sovereign",
    price: "Custom",
    cadence: "",
    bullets: [
      "Air-gapped deployment",
      "Customer-managed cluster",
      "FedRAMP High",
      "Hardware-rooted keys",
    ],
    cta: "Talk to sales",
    current: false,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Current usage</CardTitle>
              <CardDescription>Cycle resets in 12 days</CardDescription>
            </div>
            <Badge variant="primary">Enterprise</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <Usage label="Files governed" used={412_881} cap={1_000_000} />
            <Usage label="AI scans" used={48_220} cap={100_000} />
            <Usage label="Storage (vault)" used={18.4} cap={50} unit="TB" />
            <Usage label="Egress" used={2.1} cap={10} unit="TB" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimated month</CardTitle>
            <CardDescription>Pro-rated, before tax</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular tracking-tight text-gradient-brand">
              $18,412
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              vs. $17,980 last cycle (+2.4%)
            </div>
            <div className="mt-4 space-y-2 text-[12px]">
              <Line k="Platform" v="$12,000" />
              <Line k="AI processing (overage)" v="$2,820" />
              <Line k="Vault storage" v="$1,240" />
              <Line k="Decentralized archival" v="$496" />
              <Line k="Decommission credits" v="-$144" muted />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consumption</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaSeriesChart
            data={ingestSeries}
            xKey="day"
            series={[
              { key: "uploads", label: "Files", color: "oklch(0.34 0.115 262)" },
              { key: "encrypted", label: "Encrypted", color: "oklch(0.78 0.17 158)" },
            ]}
            height={220}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={
                t.current
                  ? "h-full border-primary/40 bg-primary/[0.04]"
                  : "h-full"
              }
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {t.name}
                    {t.current && (
                      <Badge variant="primary" size="sm">
                        <Sparkles className="h-2.5 w-2.5" /> Current
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{t.price}</span>
                  <span className="text-[12px] text-muted-foreground">{t.cadence}</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-[12.5px]">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:oklch(0.78_0.17_158)]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={t.current ? "outline" : t.name === "Sovereign" ? "default" : "secondary"}
                  disabled={t.current}
                >
                  {t.cta}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Invoice history
            </CardTitle>
            <CardDescription>Sent to billing@atlascapital.io</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Update payment
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border/60">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-[12.5px] hover:bg-accent/40"
              >
                <div className="font-mono">{inv.id}</div>
                <div className="text-muted-foreground">{inv.date}</div>
                <div className="tabular">${inv.amount.toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" size="sm">
                    paid
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Usage({
  label,
  used,
  cap,
  unit,
}: {
  label: string;
  used: number;
  cap: number;
  unit?: string;
}) {
  const pct = (used / cap) * 100;
  const u = (n: number) => (unit ? `${n} ${unit}` : n.toLocaleString());
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular">
          <span className="text-foreground">{u(used)}</span>{" "}
          <span className="text-muted-foreground">/ {u(cap)}</span>
        </span>
      </div>
      <Progress value={pct} className="mt-1.5" />
    </div>
  );
}

function Line({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={muted ? "tabular text-[color:oklch(0.84_0.15_158)]" : "tabular"}>
        {v}
      </span>
    </div>
  );
}
