# RoboVault — Frontend

Next.js UI for the RoboVault document pipeline. Pairs with the Flask API in `../raw_data/AMAZON/web_app.py`.

See the [root README](../README.md) for full setup, encryption, and macOS opener instructions.

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts
- Live/demo mode via `BackendStatusProvider` (`lib/backend-status.tsx`)

## Run

### Demo mode (frontend only)

```bash
npm install
npm run dev
# http://localhost:3000 — topbar shows DEMO
```

### Live mode

```bash
# Terminal 1
cd ../raw_data/AMAZON && python web_app.py

# Terminal 2
npm run dev
# http://localhost:3000 — topbar shows LIVE when /api/config responds
```

`frontend/.env.local` (optional):

```env
NEXT_PUBLIC_AEGIS_API=http://127.0.0.1:5001
```

## Primary routes

| Route | Live backend |
| ----- | ------------ |
| `/` | Home + live status rail |
| `/dashboard` | `/api/dashboard` |
| `/upload` | Job runner (`/api/run-async`, polling) |
| `/review` | Manifest + `/api/reviews` |
| `/export` | Manifest download, archives, rollback |
| `/encryption` | Verify passphrase, decrypt to PDF ZIP |
| `/files`, `/analysis` | Manifest-driven file/archive views |

Compliance, policies, billing, team, storage, etc. use demo data for UI prototyping.

## Vercel

Deploying only this folder shows **DEMO** unless you host Flask elsewhere and set `NEXT_PUBLIC_AEGIS_API` plus `AEGIS_CORS_ORIGINS` on the Python server.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```

## License

Proprietary — internal RoboVault prototype.
