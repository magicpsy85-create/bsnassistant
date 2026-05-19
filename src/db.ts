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

  // ============================================================
  // Stage B-1 — building_permits + permit_fetch_log (A-3b-2)
  // ============================================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS building_permits (
      mgm_pmsrgst_pk      TEXT PRIMARY KEY,        -- 22자리 BIGINT, TEXT 강제

      arch_pms_day        TEXT NOT NULL,            -- YYYYMMDD
      sigungu_cd          TEXT NOT NULL,
      bjdong_cd           TEXT NOT NULL,
      plat_plc            TEXT NOT NULL,
      plat_gb_cd          TEXT,
      bun                 TEXT,
      ji                  TEXT,

      jimok_cd_nm         TEXT,
      jimok_cd            TEXT,
      jiyuk_cd_nm         TEXT,
      jiyuk_cd            TEXT,
      jigu_cd_nm          TEXT,
      jigu_cd             TEXT,
      guyuk_cd_nm         TEXT,
      guyuk_cd            TEXT,

      bld_nm              TEXT,
      arch_gb_cd_nm       TEXT,
      arch_gb_cd          TEXT,
      main_purps_cd_nm    TEXT NOT NULL,            -- 화이트리스트 필터 키
      main_purps_cd       TEXT,

      plat_area           REAL,
      arch_area           REAL,
      tot_area            REAL,
      vl_rat_estm_tot_area REAL,
      bc_rat              REAL,
      vl_rat              REAL,

      main_bld_cnt        INTEGER,
      atch_bld_dong_cnt   INTEGER,

      hhld_cnt            INTEGER,
      ho_cnt              INTEGER,
      fmly_cnt            INTEGER,
      tot_pkng_cnt        INTEGER,

      stcns_sched_day     TEXT,
      stcns_delay_day     TEXT,
      real_stcns_day      TEXT,
      use_apr_day         TEXT,
      crtn_day            TEXT
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_permits_sgg_archday
    ON building_permits (sigungu_cd, arch_pms_day)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_permits_bjdong
    ON building_permits (bjdong_cd)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_permits_purps
    ON building_permits (main_purps_cd_nm)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_permits_sgg_crtnday
    ON building_permits (sigungu_cd, crtn_day)`);

  // permit_fetch_log — 결정 #4 (나) 별도 테이블 (fetch_log_v2 4단계 migration 회피)
  db.exec(`
    CREATE TABLE IF NOT EXISTS permit_fetch_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      sigungu_cd      TEXT NOT NULL,
      bjdong_cd       TEXT NOT NULL,
      crtn_ym         TEXT NOT NULL,                  -- crtnDay YYYYMM 단위 (semantics 확정 결과)
      fetched_at      TEXT NOT NULL DEFAULT (datetime('now')),
      row_count       INTEGER NOT NULL DEFAULT 0,
      UNIQUE (sigungu_cd, bjdong_cd, crtn_ym)
    )
  `);

  // 멱등 migration: 기존 환경(arch_pms_ym) → crtn_ym RENAME
  {
    const cols = db.prepare("PRAGMA table_info(permit_fetch_log)").all() as Array<{name: string}>;
    const hasArchPmsYm = cols.some(c => c.name === 'arch_pms_ym');
    const hasCrtnYm = cols.some(c => c.name === 'crtn_ym');
    if (hasArchPmsYm && !hasCrtnYm) {
      db.exec(`ALTER TABLE permit_fetch_log RENAME COLUMN arch_pms_ym TO crtn_ym`);
    }
  }

  db.exec(`DROP INDEX IF EXISTS idx_permit_fetch_log_lookup`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_permit_fetch_log_lookup
    ON permit_fetch_log (sigungu_cd, bjdong_cd, crtn_ym)`);

  console.log('[DB] transactions.db 초기화 완료');
} catch (e: any) {
  console.warn('[DB] SQLite 사용 불가 (Cloud Functions 환경):', e.message);
}

export default db;
