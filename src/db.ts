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

  // === A-3b: MOLIT 3종 신규 테이블 + fetch_log_v2 (permit은 A-3b-2) ===

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions_land (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sgg_cd TEXT NOT NULL,
      deal_ym TEXT NOT NULL,
      deal_amount INTEGER,
      deal_year TEXT,
      deal_month TEXT,
      deal_day TEXT,
      deal_area REAL,
      land_use TEXT,
      jimok TEXT,
      share_dealing_type TEXT,
      cdeal_type TEXT,
      dealing_gbn TEXT,
      estate_agent_sgg_nm TEXT,
      sgg_nm TEXT,
      umd_nm TEXT,
      jibun TEXT,
      cdeal_day TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_land_sgg_ym ON transactions_land(sgg_cd, deal_ym);
    CREATE INDEX IF NOT EXISTS idx_land_umd ON transactions_land(umd_nm);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions_sh (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sgg_cd TEXT NOT NULL,
      deal_ym TEXT NOT NULL,
      deal_amount INTEGER,
      deal_year TEXT,
      deal_month TEXT,
      deal_day TEXT,
      plottage_ar REAL,
      total_floor_ar REAL,
      build_year TEXT,
      house_type TEXT,
      buyer_gbn TEXT,
      sler_gbn TEXT,
      cdeal_type TEXT,
      dealing_gbn TEXT,
      estate_agent_sgg_nm TEXT,
      sgg_nm TEXT,
      umd_nm TEXT,
      jibun TEXT,
      cdeal_day TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sh_sgg_ym ON transactions_sh(sgg_cd, deal_ym);
    CREATE INDEX IF NOT EXISTS idx_sh_umd ON transactions_sh(umd_nm);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions_apt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sgg_cd TEXT NOT NULL,
      deal_ym TEXT NOT NULL,
      deal_amount INTEGER,
      deal_year TEXT,
      deal_month TEXT,
      deal_day TEXT,
      apt_nm TEXT,
      apt_seq TEXT,
      exclu_use_ar REAL,
      build_year TEXT,
      floor INTEGER,
      apt_dong TEXT,
      land_leasehold_gbn TEXT,
      road_nm TEXT,
      buyer_gbn TEXT,
      sler_gbn TEXT,
      cdeal_type TEXT,
      dealing_gbn TEXT,
      estate_agent_sgg_nm TEXT,
      sgg_nm TEXT,
      umd_nm TEXT,
      jibun TEXT,
      cdeal_day TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_apt_sgg_ym ON transactions_apt(sgg_cd, deal_ym);
    CREATE INDEX IF NOT EXISTS idx_apt_umd ON transactions_apt(umd_nm);
    CREATE INDEX IF NOT EXISTS idx_apt_nm ON transactions_apt(apt_nm);
    CREATE INDEX IF NOT EXISTS idx_apt_seq ON transactions_apt(apt_seq);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS fetch_log_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sgg_cd TEXT NOT NULL,
      deal_ym TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'commercial',
      fetched_at TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      is_final INTEGER DEFAULT 0,
      UNIQUE(sgg_cd, deal_ym, type)
    );
    CREATE INDEX IF NOT EXISTS idx_fetch_log_v2_lookup ON fetch_log_v2(sgg_cd, deal_ym, type);
  `);

  console.log('[DB] transactions.db 초기화 완료');
} catch (e: any) {
  console.warn('[DB] SQLite 사용 불가 (Cloud Functions 환경):', e.message);
}

export default db;
