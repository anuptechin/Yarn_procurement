import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import { config } from './config.js';
import { migrate } from './db.js';
import { authOptional, ensureSuperAdmin } from './auth.js';

import authRoutes from './routes/auth.js';
import requirementRoutes from './routes/requirements.js';
import vendorRoutes from './routes/vendors.js';
import materialRoutes from './routes/materials.js';
import rfqRoutes from './routes/rfqs.js';
import quoteRoutes from './routes/quotes.js';
import comparisonRoutes from './routes/comparison.js';
import reportRoutes from './routes/reports.js';
import portalRoutes from './routes/portal.js';
import userRoutes from './routes/users.js';
import auditRoutes from './routes/audit.js';
import certificateRoutes from './routes/certificates.js';
import rawMaterialRoutes from './routes/rawmaterials.js';
import { startCertAlertScheduler } from './services/certAlerts.js';
import { ensureRawMaterials, loadRawTrend } from './util/loadRawTrend.js';
import { db } from './db.js';

const app = express();
// Behind exactly one reverse proxy (nginx_proxy). Lets Express honour
// X-Forwarded-Proto (req.secure) and X-Forwarded-For (req.ip).
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(authOptional);

// API
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/comparison', comparisonRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
// Public, token-based vendor portal (no login)
app.use('/api/portal', portalRoutes);

// Serve built client (production). In dev, Vite serves the client separately.
if (fs.existsSync(config.paths.clientDist)) {
  app.use(express.static(config.paths.clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(config.paths.clientDist + '/index.html');
  });
}

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

migrate()
  .then(() => ensureSuperAdmin())
  .then(() => ensureRawMaterials(db))
  .then(async () => {
    // First-time only: seed raw-material history from the committed JSON.
    const row = await db.get('SELECT COUNT(*) n FROM raw_material_prices');
    if (!row || Number(row.n) === 0) {
      const res = await loadRawTrend(db);
      if (res.points) console.log(`  → Raw material history loaded (${res.rows} rows, ${res.points} points).`);
    }
  })
  .then(() => {
    startCertAlertScheduler();
    app.listen(config.port, () => {
      console.log(`\n  Yarn Procurement Portal API running`);
      console.log(`  → http://localhost:${config.port}`);
      console.log(`  → Public base URL (vendor links): ${config.publicBaseUrl}`);
      console.log(`  → Mail mode: ${config.mail.mode}\n`);
    });
  })
  .catch((err) => {
    console.error('\n  Failed to connect / migrate database:\n  ', err.message);
    console.error('  Check your .env DB settings (PGHOST/PGUSER/PGPASSWORD/PGDATABASE).\n');
    process.exit(1);
  });
