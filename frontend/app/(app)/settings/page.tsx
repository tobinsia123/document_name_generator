"use client";

import { Bell, Building2, Globe, Lock, ShieldCheck, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-1 h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="org">
            <Building2 className="mr-1 h-3.5 w-3.5" /> Organization
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1 h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="region">
            <Globe className="mr-1 h-3.5 w-3.5" /> Data residency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Personal info and credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg">MP</AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <div className="text-[13px] font-medium">Maya Patel</div>
                  <div className="text-[11px] text-muted-foreground">
                    maya@robovault.io · Owner · RoboVault Demo
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="xs">
                      Upload photo
                    </Button>
                    <Button variant="ghost" size="xs">
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Display name" defaultValue="Maya Patel" />
                <FormField label="Email" defaultValue="maya@acme.io" />
                <FormField label="Title" defaultValue="VP, Information Security" />
                <FormField label="Timezone" defaultValue="America/New_York" />
              </div>
              <div className="flex justify-end">
                <Button>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="org">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Workspace identity used in audits and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Legal name" defaultValue="RoboVault Demo, Inc." />
                <FormField label="Display name" defaultValue="RoboVault Demo" />
                <FormField label="Domain" defaultValue="atlascapital.io" />
                <FormField label="Industry" defaultValue="Financial Services" />
              </div>
              <Separator />
              <ToggleRow
                label="Require SSO for all members"
                hint="SAML / OIDC enforced at sign-in. Recommended for enterprise."
                defaultChecked
              />
              <ToggleRow
                label="Block invites from outside corporate domain"
                hint="Restricts invitations to atlascapital.io email addresses."
                defaultChecked
              />
              <ToggleRow
                label="Require MFA"
                hint="WebAuthn or TOTP. Hardware keys (YubiKey) supported."
                defaultChecked
              />
              <div className="flex justify-end">
                <Button>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Session, MFA, and break-glass.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow
                label="Two-factor authentication"
                hint="WebAuthn registered: 2 keys"
                defaultChecked
              />
              <ToggleRow
                label="Step-up auth for restricted exports"
                hint="Re-prompt for hardware key at every restricted egress."
                defaultChecked
              />
              <ToggleRow
                label="IP allow-list"
                hint="Restrict access to corporate VPN ranges."
              />
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-medium">Active sessions</div>
                  <div className="text-[11px] text-muted-foreground">
                    Sign out everywhere or revoke a single device.
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between rounded-lg border border-[color:oklch(0.7_0.22_22/0.4)] bg-[color:oklch(0.7_0.22_22/0.05)] p-3">
                <div>
                  <div className="flex items-center gap-2 text-[12.5px] font-medium">
                    <Lock className="h-3.5 w-3.5 text-[color:oklch(0.85_0.18_22)]" />
                    Break-glass account
                  </div>
                  <div className="mt-0.5 max-w-md text-[11px] text-muted-foreground">
                    Last-resort recovery key. Use only with the CISO and a witness.
                  </div>
                </div>
                <Badge variant="destructive">Sealed</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Channels and frequency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: "Critical policy violations", channels: "Email, Slack, PagerDuty" },
                { name: "New compliance gaps", channels: "Slack" },
                { name: "Weekly governance digest", channels: "Email" },
                { name: "Key rotation due", channels: "Email" },
                { name: "Suspicious geographic sign-ins", channels: "Email, SMS" },
                { name: "API key usage anomaly", channels: "Slack" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background/30 p-3"
                >
                  <div>
                    <div className="text-[12.5px] font-medium">{row.name}</div>
                    <div className="text-[11px] text-muted-foreground">{row.channels}</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="region">
          <Card>
            <CardHeader>
              <CardTitle>Data residency</CardTitle>
              <CardDescription>
                Pin data to specific regions for compliance and sovereignty.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { name: "us-east-1", role: "Primary", state: "Active" },
                  { name: "eu-west-1", role: "Replica (GDPR)", state: "Active" },
                  { name: "ap-southeast-2", role: "DR", state: "Cold standby" },
                ].map((r) => (
                  <div
                    key={r.name}
                    className="rounded-lg border border-border/70 bg-background/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-mono text-muted-foreground">
                        {r.name}
                      </span>
                      <Badge
                        variant={r.state === "Active" ? "success" : "muted"}
                        size="sm"
                      >
                        {r.state}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[12.5px] font-medium">{r.role}</div>
                  </div>
                ))}
              </div>
              <Separator />
              <ToggleRow
                label="Block cross-region replication for restricted files"
                hint="Restricted files never leave primary region."
                defaultChecked
              />
              <ToggleRow
                label="Apply data localization for EU data subjects"
                hint="Files tagged as EU-DSAR remain in eu-west-1 only."
                defaultChecked
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormField({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  defaultChecked,
}: {
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div>
        <div className="text-[12.5px] font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
