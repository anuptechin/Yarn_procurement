import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the project root (one level above /server) regardless of the
// process cwd, then fall back to a local .env if one exists.
const rootEnv = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
else dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://localhost:4000').replace(/\/$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'INR',
  // Super Admin: bootstrapped on every server start from these env vars, so a
  // secure top-level account always exists (no reliance on the demo seed).
  superAdmin: {
    email: (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim(),
    password: process.env.SUPER_ADMIN_PASSWORD || '',
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    // When 'true', reset the account's password to SUPER_ADMIN_PASSWORD on the
    // next boot (one-off recovery). Otherwise an existing account is left as-is.
    resetPassword: process.env.SUPER_ADMIN_RESET_PASSWORD === 'true',
  },
  database: {
    // Either a full connection string ...
    url: process.env.DATABASE_URL || '',
    // ... or individual parts (used when DATABASE_URL is empty)
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    name: process.env.PGDATABASE || 'yarn_procurement',
    ssl: process.env.PGSSL === 'true',
  },
  mail: {
    mode: process.env.MAIL_MODE || 'draft', // 'draft' | 'smtp'
    from: process.env.MAIL_FROM || 'Yarn Procurement <procurement@ddecor.com>',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  paths: {
    serverRoot: path.resolve(__dirname, '..'),
    data: path.resolve(__dirname, '..', 'data'),
    generated: path.resolve(__dirname, '..', 'generated'),
    clientDist: path.resolve(__dirname, '..', '..', 'client', 'dist'),
  },
};

export default config;
