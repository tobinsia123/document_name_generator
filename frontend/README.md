# RoboVault — AI File Governance Platform

> AI-powered file governance, sensitivity analysis, encryption, and compliance automation.
> Built for banks, healthcare, legal, government, and Fortune 500 compliance teams.

This is the production-grade **frontend** for RoboVault. It pairs with the Python rename
pipeline at `../raw_data/AMAZON/` to deliver a full enterprise governance experience.

## Stack

- **Next.js 15** (App Router, React 19, Turbopack)
- **TypeScript** strict mode
- **TailwindCSS v4** (CSS-based theme tokens, OKLCH color space)
- **shadcn/ui** primitives (Radix UI under the hood)
- **Framer Motion** (page transitions, KPI motion, list staggers)
- **Recharts** (area, donut, bar, custom heatmap)
- **lucide-react**, **cmdk** (⌘K command palette), **sonner**

## What's inside

```
frontend/
├── app/
│   ├── globals.css                # Design system (dark-first OKLCH palette, glassmorphism)
│   ├── layout.tsx                 # Root layout, fonts (Inter + JetBrains Mono)
│   ├── page.tsx                   # Redirects → /dashboard
│   └── (app)/
│       ├── layout.tsx             # App shell wrapper
│       ├── dashboard/             # KPIs, ingestion chart, risk heatmap, threat feed
│       ├── upload/                # Drag-and-drop, live processing pipeline visualization
│       ├── analysis/              # AI sensitivity, entity extraction, naming inference
│       ├── files/                 # Searchable file explorer with bulk actions
│       ├── compliance/            # SOC2, HIPAA, GDPR, ISO27001, PCI-DSS, FINRA
│       ├── encryption/            # KMS, key rotation, BYOK, posture
│       ├── policies/              # Declarative rule builder
│       ├── audit/                 # Hash-chained immutable event log
│       ├── team/                  # Roles, MFA, invitations
│       ├── storage/               # Vault + Filecoin + Arweave + S3 + GCS
│       ├── api-keys/              # Scoped tokens with reveal/rotate
│       ├── billing/               # Usage, plans, invoices
│       └── settings/              # Profile, org, security, notifications, residency
├── components/
│   ├── ui/                        # shadcn primitives (button, card, dialog, …)
│   ├── layout/                    # Sidebar, topbar, command palette, app shell
│   ├── charts/                    # Area, donut, bar, heatmap (SSR-safe)
│   └── shared/                    # KpiCard, FileRow, SensitivityPill, EncryptionBadge…
└── lib/
    ├── data.ts                    # Realistic enterprise mock data (deterministic)
    ├── nav.ts                     # Navigation manifest + page metadata
    ├── types.ts                   # Domain types (RoboVaultFile, AuditEvent, Policy, …)
    └── utils.ts                   # cn(), formatBytes, formatRelative
```

## Run

```bash
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

Useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # production build
npm run start       # production server
```

## Design system

Dark by default. The product is designed to feel like cybersecurity software a Fortune
500 CISO would deploy in production — sophisticated, calm, low-noise.

- **Color** — defined in OKLCH for perceptual uniformity. Brand primary lives at
  `oklch(0.72 0.16 264)` (cool indigo). Semantic accents (success, warning, info,
  critical) are defined globally and consumed via `var(--*)`.
- **Typography** — Inter for UI, JetBrains Mono for hashes, IDs, code. Tabular nums
  (`.tabular`) for financial-looking metrics.
- **Surfaces** — glassmorphism (`.glass`, `.glass-strong`), subtle gradients, ambient
  grid (`.bg-grid`, `.bg-grid-fine`), radial spotlight (`.bg-radial-spot`).
- **Motion** — Framer Motion for KPI entrance, list staggers, sidebar active-state
  morph (`layoutId="sidebar-active"`), and threat-feed pulses.

## Pages — what to look at

| Route          | Highlights                                                               |
| -------------- | ------------------------------------------------------------------------ |
| `/dashboard`   | 4 animated KPI cards · 30-day ingest series · risk heatmap (24h × 7d)    |
|                | · framework coverage bars · live threat feed · audit chain · posture     |
| `/upload`      | Drag-and-drop · 6-stage pipeline strip · auto-encrypt + archive toggles  |
| `/analysis`    | Sensitivity rings · detected entities · LLM reasoning · evidence tabs    |
| `/files`       | Filterable table · sensitivity tabs · multi-select bulk actions          |
| `/compliance`  | Posture composite · per-framework cards · control inventory             |
| `/encryption`  | Key rings (AES-256-GCM, ChaCha20, BYOK) · rotation calendar · cipher mix |
| `/policies`    | Rule list · DSL preview · severity / framework tags · enable toggle      |
| `/audit`       | Hash-chained event timeline · prev-hash references · export CSV          |
| `/team`        | Roles · MFA badges · suspend / invite · role definitions                 |
| `/storage`     | Vault + Filecoin + Arweave + S3 + GCS · capacity bars · monthly cost     |
| `/api-keys`    | Scoped tokens · reveal/copy · rotate/revoke · SDK quickstart             |
| `/billing`     | Plan tiers · usage bars · invoice history                                |
| `/settings`    | Profile / Org / Security / Notifications / Data residency tabs           |

Use `⌘ + K` for the global command palette.

## Notes for next steps

- All data lives in `lib/data.ts` and uses a fixed `NOW` plus deterministic PRNG so
  SSR and CSR HTML always match. Replace with real API calls when wiring the backend.
- Recharts components are mounted client-only behind a `useMounted` guard to avoid
  ResponsiveContainer hydration drift.
- Auth, multi-tenant scoping, and websocket live updates are stubbed but the layout
  is ready for them — `Topbar` already shows a "Live" pulse, threat feed already
  uses motion deltas, command palette is keyboard-driven.

## License

Proprietary — internal demo for the RoboVault prototype.
