# Setup & operations guide

## 1. Prerequisites
- **Node.js 18+** (tested on Node 24)
- **PostgreSQL 16** (installed at `C:\Program Files\PostgreSQL\16`)

## 2. Create the database
```powershell
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres yarn_procurement
```
Enter the `postgres` password when prompted. (Or use pgAdmin → right-click *Databases* → *Create*.)

## 3. Configure `.env`
Copy `.env.example` → `.env` (project root) and set at least:
```
PGPASSWORD=your-postgres-password
JWT_SECRET=some-long-random-string
PUBLIC_BASE_URL=http://localhost:4043
```

## 4. Install, seed, build, run
```powershell
npm run setup    # installs all deps, seeds demo data, builds the UI
npm start        # serves the app at http://localhost:4043
```

During development use two live-reload servers instead:
```powershell
npm run dev      # API on :4043, Vite UI on :5173 (open :5173)
```

## 5. Resetting data
```powershell
npm --prefix server run reset
```
This `TRUNCATE`s every table and reseeds the demo requirement, vendors, yarns and price history.

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| `password authentication failed` | Wrong `PGPASSWORD` in `.env`. |
| `database "yarn_procurement" does not exist` | Run the `createdb` step (section 2). |
| `ECONNREFUSED 5432` | PostgreSQL service not running — start it from Services. |
| Vendor links open "Link not valid" | Token mismatch or RFQ deleted; re-send the RFQ. |
| Vendor links unreachable for outside vendors | Set `PUBLIC_BASE_URL` to a URL the vendor can reach (VM stage). |

## Architecture notes
- All DB access goes through `server/src/db.js`, which exposes `all/get/run/tx` and translates
  `?` placeholders to Postgres `$n`. Swapping DB hosts is just an `.env` change.
- Comparison scoring lives in `server/src/services/comparison.js` (weighted price / lead time /
  payment / rating, plus savings vs last PO). Weights are adjustable live in the UI.
- The mailer (`server/src/services/mailer.js`) is pluggable: `draft` (default) or `smtp`.
- Money/calendar dates are stored so the UI formats them in Indian locale (₹, en-IN).
