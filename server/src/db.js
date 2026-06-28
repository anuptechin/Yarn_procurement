import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { runtime } from './util/state.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// pg returns BIGINT/NUMERIC as strings by default; parse them as JS numbers
// so the API emits real numbers (safe for our value ranges).
pg.types.setTypeParser(20, (v) => (v == null ? null : parseInt(v, 10)));   // int8
pg.types.setTypeParser(1700, (v) => (v == null ? null : parseFloat(v)));   // numeric

const poolConfig = config.database.url
  ? { connectionString: config.database.url, ssl: config.database.ssl ? { rejectUnauthorized: false } : false }
  : {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    };

export const pool = new Pool(poolConfig);

// Convert "?" placeholders to Postgres "$1, $2, ..." so query strings stay tidy.
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + ++i);
}

function bind(runner) {
  return {
    async all(sql, params = []) {
      const res = await runner.query(toPg(sql), params);
      return res.rows;
    },
    async get(sql, params = []) {
      const res = await runner.query(toPg(sql), params);
      return res.rows[0];
    },
    async run(sql, params = []) {
      const res = await runner.query(toPg(sql), params);
      return { rowCount: res.rowCount, rows: res.rows };
    },
  };
}

const base = bind(pool);

export const db = {
  ...base,
  pool,
  // Run fn inside a transaction. fn receives a client-bound { all, get, run }.
  async tx(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cx = bind(client);
      const result = await fn(cx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    } finally {
      client.release();
    }
  },
};

export async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

export async function audit(userId, action, entity, entityId, detail) {
  // The Super Admin is the overseer — keep their own actions out of the log.
  if (userId != null && userId === runtime.superAdminId) return;
  try {
    await db.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [userId ?? null, action, entity ?? null, entityId ?? null,
        detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : null]
    );
  } catch (e) {
    console.error('audit error', e.message);
  }
}

export default db;
