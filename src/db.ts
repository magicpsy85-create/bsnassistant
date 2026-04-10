import path from 'path';
import fs from 'fs';

let db: any = null;

try {
  const Database = require('better-sqlite3');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, 'transactions.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sgg_cd TEXT NOT NULL,
      deal_ym TEXT NOT NULL,
      build_year TEXT,
      building_ar REAL,
      building_use TEXT,
      plottage_ar REAL,
      land_use TEXT,
      deal_amount INTEGER,
      deal_year TEXT,
      deal_month TEXT,
      deal_day TEXT,
      buyer_gbn TEXT,
      sler_gbn TEXT,
      sgg_nm TEXT,
      umd_nm TEXT,
      jibun TEXT,
      cdeal_day TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sgg_ym ON transactions(sgg_cd, deal_ym);
    CREATE INDEX IF NOT EXISTS idx_umd ON transactions(umd_nm);
    CREATE INDEX IF NOT EXISTS idx_deal_date ON transactions(deal_year, deal_month);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS fetch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sgg_cd TEXT NOT NULL,
      deal_ym TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      is_final INTEGER DEFAULT 0,
      UNIQUE(sgg_cd, deal_ym)
    );
  `);

  console.log('[DB] transactions.db 초기화 완료');
} catch (e: any) {
  console.warn('[DB] SQLite 사용 불가 (Cloud Functions 환경):', e.message);
}

export default db;
