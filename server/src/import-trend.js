/**
 * Safely (re)import the Yarn Market Price Trend from data/market_trend.json
 * into the live database WITHOUT wiping any other data.
 *
 * Run:  npm --prefix server run import:trend
 */
import { db, pool, migrate } from './db.js';
import { loadMarketTrend } from './util/loadTrend.js';

migrate()
  .then(() => loadMarketTrend(db))
  .then((r) => {
    console.log(`Market trend imported: ${r.materials} materials, ${r.points} price points.`);
    return pool.end();
  })
  .catch(async (e) => { console.error('Import failed:', e.message); await pool.end(); process.exit(1); });
