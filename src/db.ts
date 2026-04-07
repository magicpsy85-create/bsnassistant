import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'transactions.db'));
db.pragma('journal_mode = WAL');

// 실거래가 테이블
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

// 수집 로그 테이블
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

export default db;
