# Yarn Procurement Portal (YPP) — D'Decor

A service portal for the Yarn sourcing desk: raise a requirement → dept-head approval →
send RFQ to multiple vendors at once → collect quotes (vendor self-service link **or** manual
entry) → automatic side-by-side comparison (price, delivery, payment terms, vendor rating,
last PO price) → dept-head awards the order. Includes a vendor master with certificate
tracking and yarn price-trend intelligence.

## Tech
- **Backend:** Node + Express + **PostgreSQL** (async `pg` pool)
- **Frontend:** React + Vite + Tailwind (built to static files, served by Express)
- **Docs/exports:** RFQ PDF (`pdfkit`), comparison Excel (`exceljs`), pluggable mailer (draft → SMTP)

## Roles
| Role | Can do |
|------|--------|
| Requisitioner | Raise & edit requirements |
| Dept Head | Approve / reject requirements, award the comparison |
| Procurement | Send RFQs, enter quotes, manage vendors & yarns |
| Admin | Everything |

## First-time setup (Windows / laptop)

1. **Create the database** (PostgreSQL 16 already installed):
   ```
   "C:\Program Files\PostgreSQL\16\bin\createdb" -U postgres yarn_procurement
   ```
2. **Configure** — copy `.env.example` to `.env` in the project root and set your Postgres
   password (`PGPASSWORD=...`). Adjust `PUBLIC_BASE_URL` when you move to the VM.
3. **Install + seed + build** (one command):
   ```
   npm run setup
   ```
   (equivalent to: `npm run install:all && npm run seed && npm run build`)
4. **Start:**
   ```
   npm start
   ```
   Open http://localhost:4043

### Demo accounts (created by the seed)
| Email | Password | Role |
|-------|----------|------|
| requisitioner@ddecor.com | pass123 | Requisitioner |
| procurement@ddecor.com | pass123 | Procurement |
| depthead@ddecor.com | pass123 | Dept Head |
| admin@ddecor.com | admin123 | Admin |

## Day-to-day commands
| Command | What it does |
|---------|--------------|
| `npm run dev` | Run backend (:4043) + Vite dev server (:5173) with hot reload |
| `npm start` | Run the built app on :4043 (production-style) |
| `npm run seed` | Seed starter data (idempotent) |
| `npm --prefix server run reset` | **Wipe** and reseed the database |
| `npm --prefix server run import:trend` | (Re)load the Yarn Market Price Trend from `server/src/data/market_trend.json` without wiping other data |
| `npm run build` | Rebuild the frontend |

## How the workflow runs in the app
1. **Requisitioner** → *New Requirement* → add yarns + quantities (last PO auto-fills) → submit.
2. **Dept Head** → opens the requirement → **Approve**.
3. **Procurement** → **Send / add RFQ** → pick vendors → each gets a unique quote link;
   grab the **email draft** / **PDF** / **link** to send from Outlook.
4. **Vendors** open their link and submit prices (or Procurement enters them via **Enter quote**).
5. **Comparison** builds automatically — tune the decision weights, see the recommended vendor.
6. **Dept Head** → selects vendors per item → **Award**. Awarded prices become the new "last PO".

## Email
Default `MAIL_MODE=draft`: the app generates the RFQ email text + a `mailto:` link + a PDF;
send it from your own Outlook. To auto-send later, set `MAIL_MODE=smtp` and fill the `SMTP_*`
values in `.env` (Office 365 example included).

## Moving to the server (VM) later
- Point `.env` `PGHOST/PGUSER/PGPASSWORD/PGDATABASE` (or `DATABASE_URL`) at the VM's Postgres.
- Set `PUBLIC_BASE_URL` to the server's real URL so vendor quote links resolve from outside.
- `npm run setup` then run `npm start` behind a process manager / reverse proxy.

See [docs/SETUP.md](docs/SETUP.md) for a detailed walkthrough and troubleshooting.
