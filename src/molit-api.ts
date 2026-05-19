import db from './db';
import { XMLParser } from 'fast-xml-parser';
import type {
  PropertyType,
  TransactionByType,
  CommercialTransaction,
  LandTransaction,
  SHTransaction,
  AptTransaction,
} from './molit-types';

// ─── 유틸 ───

function formatYm(date: Date): string {
  return date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0');
}

function isFinalData(dealYm: string): boolean {
  const now = new Date();
  const year = parseInt(dealYm.substring(0, 4));
  const month = parseInt(dealYm.substring(4, 6)) - 1;
  const dataMonth = new Date(year, month);
  const diffMonths =
    (now.getFullYear() - dataMonth.getFullYear()) * 12 +
    now.getMonth() - dataMonth.getMonth();
  return diffMonths >= 3;
}

// ─── 종목별 상수 (A-3b) ───

const MOLIT_ENDPOINTS: Record<PropertyType, string> = {
  commercial: 'http://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade',
  land:       'http://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade',
  sh:         'http://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade',
  apt:        'http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
};

const PROPERTY_TABLES: Record<PropertyType, string> = {
  commercial: 'transactions',
  land:       'transactions_land',
  sh:         'transactions_sh',
  apt:        'transactions_apt',
};

const MOLIT_PARAM_KEYS: Record<PropertyType, { sggKey: string; ymKey: string }> = {
  commercial: { sggKey: 'LAWD_CD', ymKey: 'DEAL_YMD' },
  land:       { sggKey: 'LAWD_CD', ymKey: 'DEAL_YMD' },
  sh:         { sggKey: 'LAWD_CD', ymKey: 'DEAL_YMD' },
  apt:        { sggKey: 'LAWD_CD', ymKey: 'DEAL_YMD' },
};

// ─── 국토교통부 API 호출 ───

async function fetchFromMolitAPI(type: PropertyType, sggCd: string, dealYm: string): Promise<any[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error('MOLIT_API_KEY가 설정되지 않았습니다');

  const baseUrl = MOLIT_ENDPOINTS[type];
  const paramKeys = MOLIT_PARAM_KEYS[type];

  let allItems: any[] = [];
  let pageNo = 1;
  let totalCount = 0;

  do {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      [paramKeys.sggKey]: sggCd,
      [paramKeys.ymKey]: dealYm,
      pageNo: String(pageNo),
      numOfRows: '1000',
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log(`[MOLIT API:${type}] 호출:`, sggCd, dealYm, 'page', pageNo);

    const response = await fetch(url);
    const xmlText = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const result = parser.parse(xmlText);

    const header = result?.response?.header;
    const rCode = String(header?.resultCode || '');
    if (rCode !== '00' && rCode !== '000') {
      console.error(`[MOLIT API:${type}] 에러:`, header?.resultMsg);
      break;
    }

    const body = result?.response?.body;
    totalCount = Number(body?.totalCount || 0);

    const items = body?.items?.item;
    if (!items) break;

    const itemArray = Array.isArray(items) ? items : [items];
    allItems = allItems.concat(itemArray);

    pageNo++;
  } while (allItems.length < totalCount);

  console.log(`[MOLIT API:${type}] 수집:`, sggCd, dealYm, allItems.length + '건');
  return allItems;
}

// ─── 종목별 DB 저장 helper ───

function saveCommercialRows(sggCd: string, dealYm: string, apiItems: any[]): void {
  // 집합건물 + 지분거래 제외 (기존 패턴 유지)
  const filtered = apiItems.filter((t: any) => {
    const type = String(t.buildingType || '').trim();
    if (type === '집합') return false;
    const share = String(t.shareDealingType || '').trim();
    if (share !== '') return false;
    return true;
  });

  db.prepare('DELETE FROM transactions WHERE sgg_cd = ? AND deal_ym = ?')
    .run(sggCd, dealYm);

  const insert = db.prepare(`
    INSERT INTO transactions
    (sgg_cd, deal_ym, build_year, building_ar, building_use, plottage_ar,
     land_use, deal_amount, deal_year, deal_month, deal_day,
     buyer_gbn, sler_gbn, sgg_nm, umd_nm, jibun, cdeal_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: any[]) => {
    for (const t of items) {
      const amount = parseInt(String(t.dealAmount || '0').trim().replace(/,/g, ''));
      insert.run(
        sggCd, dealYm,
        t.buildYear || null,
        parseFloat(t.buildingAr) || null,
        t.buildingUse || null,
        parseFloat(t.plottageAr) || null,
        t.landUse || null,
        amount,
        String(t.dealYear || ''),
        String(t.dealMonth || ''),
        String(t.dealDay || '').trim(),
        t.buyerGbn || null,
        t.slerGbn || null,
        t.sggNm || null,
        t.umdNm || null,
        t.jibun || null,
        t.cdealDay ? String(t.cdealDay).trim() : null,
      );
    }
  });
  insertMany(filtered);

  console.log('[실거래가:commercial] 저장:', sggCd, dealYm, filtered.length + '건 (집합 제외)');
}

function saveLandRows(sggCd: string, dealYm: string, items: any[]): void {
  // 토지: 지분거래 raw 보존 (write-time 필터 없음), 집합건물 무관
  db.prepare('DELETE FROM transactions_land WHERE sgg_cd = ? AND deal_ym = ?').run(sggCd, dealYm);

  const insertLand = db.prepare(`
    INSERT INTO transactions_land (
      sgg_cd, deal_ym, deal_amount, deal_year, deal_month, deal_day,
      deal_area, land_use, jimok, share_dealing_type,
      cdeal_type, dealing_gbn, estate_agent_sgg_nm,
      sgg_nm, umd_nm, jibun, cdeal_day
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const txn = db.transaction((rows: any[]) => {
    for (const r of rows) {
      insertLand.run(
        sggCd, dealYm,
        parseInt(String(r.dealAmount || '0').replace(/,/g, '')) || null,
        r.dealYear || null,
        r.dealMonth || null,
        r.dealDay || null,
        parseFloat(r.dealArea) || null,
        r.landUse || null,
        r.jimok || null,
        r.shareDealingType || null,
        r.cdealType || null,
        r.dealingGbn || null,
        r.estateAgentSggNm || null,
        r.sggNm || null,
        r.umdNm || null,
        r.jibun || null,
        r.cdealDay ? String(r.cdealDay).trim() || null : null,
      );
    }
  });
  txn(items);

  console.log('[실거래가:land] 저장:', sggCd, dealYm, items.length + '건');
}

function saveSHRows(sggCd: string, dealYm: string, items: any[]): void {
  // 단독다가구: shareDealingType 응답에 없음 → 필터 불필요
  db.prepare('DELETE FROM transactions_sh WHERE sgg_cd = ? AND deal_ym = ?').run(sggCd, dealYm);

  const insertSH = db.prepare(`
    INSERT INTO transactions_sh (
      sgg_cd, deal_ym, deal_amount, deal_year, deal_month, deal_day,
      plottage_ar, total_floor_ar, build_year, house_type,
      buyer_gbn, sler_gbn, cdeal_type, dealing_gbn, estate_agent_sgg_nm,
      sgg_nm, umd_nm, jibun, cdeal_day
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const txn = db.transaction((rows: any[]) => {
    for (const r of rows) {
      insertSH.run(
        sggCd, dealYm,
        parseInt(String(r.dealAmount || '0').replace(/,/g, '')) || null,
        r.dealYear || null,
        r.dealMonth || null,
        r.dealDay || null,
        parseFloat(r.plottageAr) || null,
        parseFloat(r.totalFloorAr) || null,
        r.buildYear || null,
        r.houseType || null,
        r.buyerGbn || null,
        r.slerGbn || null,
        r.cdealType || null,
        r.dealingGbn || null,
        r.estateAgentSggNm || null,
        r.sggNm || null,
        r.umdNm || null,
        r.jibun || null,
        r.cdealDay ? String(r.cdealDay).trim() || null : null,
      );
    }
  });
  txn(items);

  console.log('[실거래가:sh] 저장:', sggCd, dealYm, items.length + '건');
}

function saveAptRows(sggCd: string, dealYm: string, items: any[]): void {
  // 아파트: shareDealingType 응답에 없음 → 필터 불필요
  db.prepare('DELETE FROM transactions_apt WHERE sgg_cd = ? AND deal_ym = ?').run(sggCd, dealYm);

  const insertApt = db.prepare(`
    INSERT INTO transactions_apt (
      sgg_cd, deal_ym, deal_amount, deal_year, deal_month, deal_day,
      apt_nm, apt_seq, exclu_use_ar, build_year, floor, apt_dong,
      land_leasehold_gbn, road_nm,
      buyer_gbn, sler_gbn, cdeal_type, dealing_gbn, estate_agent_sgg_nm,
      sgg_nm, umd_nm, jibun, cdeal_day
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const txn = db.transaction((rows: any[]) => {
    for (const r of rows) {
      insertApt.run(
        sggCd, dealYm,
        parseInt(String(r.dealAmount || '0').replace(/,/g, '')) || null,
        r.dealYear || null,
        r.dealMonth || null,
        r.dealDay || null,
        r.aptNm || null,
        r.aptSeq || null,
        parseFloat(r.excluUseAr) || null,
        r.buildYear || null,
        parseInt(r.floor) || null,
        r.aptDong || null,
        r.landLeaseholdGbn || null,
        r.roadNm || null,
        r.buyerGbn || null,
        r.slerGbn || null,
        r.cdealType || null,
        r.dealingGbn || null,
        r.estateAgentSggNm || null,
        r.sggNm || null,
        r.umdNm || null,
        r.jibun || null,
        r.cdealDay ? String(r.cdealDay).trim() || null : null,
      );
    }
  });
  txn(items);

  console.log('[실거래가:apt] 저장:', sggCd, dealYm, items.length + '건');
}

// ─── DB 저장 (dispatcher) ───

function saveToDB(type: PropertyType, sggCd: string, dealYm: string, items: any[]): void {
  switch (type) {
    case 'commercial': saveCommercialRows(sggCd, dealYm, items); break;
    case 'land':       saveLandRows(sggCd, dealYm, items); break;
    case 'sh':         saveSHRows(sggCd, dealYm, items); break;
    case 'apt':        saveAptRows(sggCd, dealYm, items); break;
  }

  // fetch_log_v2 기록 (commercial은 fetch_log v1도 함께 갱신 — 호환성)
  saveFetchLog(type, sggCd, dealYm, items.length, isFinalData(dealYm) ? 1 : 0);
  if (type === 'commercial') {
    db.prepare(`
      INSERT OR REPLACE INTO fetch_log (sgg_cd, deal_ym, fetched_at, count, is_final)
      VALUES (?, ?, ?, ?, ?)
    `).run(sggCd, dealYm, new Date().toISOString(), items.length, isFinalData(dealYm) ? 1 : 0);
  }
}

// ─── DB 조회 ───

function getFromDB<T extends PropertyType>(type: T, sggCd: string, dealYm: string): TransactionByType[T][] {
  const table = PROPERTY_TABLES[type];
  return db.prepare(`SELECT * FROM ${table} WHERE sgg_cd = ? AND deal_ym = ?`).all(sggCd, dealYm) as TransactionByType[T][];
}

// ─── fetch_log v2 (종목별 격리) ───

function getFetchLog(type: PropertyType, sggCd: string, dealYm: string): any {
  const v2 = db.prepare('SELECT * FROM fetch_log_v2 WHERE sgg_cd = ? AND deal_ym = ? AND type = ?').get(sggCd, dealYm, type);
  if (v2) return v2;

  // commercial은 v1 fallback (운영 1주 후 cleanup 트랙에서 drop)
  if (type === 'commercial') {
    return db.prepare('SELECT * FROM fetch_log WHERE sgg_cd = ? AND deal_ym = ?').get(sggCd, dealYm);
  }

  return null;
}

function saveFetchLog(type: PropertyType, sggCd: string, dealYm: string, count: number, isFinal: 0 | 1): void {
  db.prepare(`
    INSERT OR REPLACE INTO fetch_log_v2 (sgg_cd, deal_ym, type, fetched_at, count, is_final)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sggCd, dealYm, type, new Date().toISOString(), count, isFinal);
}

// ─── 통합 조회 (캐시 우선, 미스 시 API) ───

async function getTransactionsGeneric<T extends PropertyType>(
  type: T, sggCd: string, dealYm: string
): Promise<TransactionByType[T][]> {
  const log: any = getFetchLog(type, sggCd, dealYm);

  // 확정 데이터 → DB 즉시 반환 (단, 0건은 의심스러우니 재조회)
  if (log && log.is_final === 1 && log.count > 0) {
    return getFromDB(type, sggCd, dealYm);
  }

  // 미확정이지만 최근 수집 → DB 반환 (단, 0건은 재호출)
  if (log && log.count > 0) {
    const isCurrentMonth = dealYm === formatYm(new Date());
    const cacheHours = isCurrentMonth ? 6 : 24;
    const fetchedAt = new Date(log.fetched_at);
    const hoursDiff = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < cacheHours) {
      return getFromDB(type, sggCd, dealYm);
    }
  }

  // API 호출 후 저장
  try {
    const apiData = await fetchFromMolitAPI(type, sggCd, dealYm);
    saveToDB(type, sggCd, dealYm, apiData);
    return getFromDB(type, sggCd, dealYm);
  } catch (e: any) {
    console.error(`[실거래가:${type}] API 호출 실패:`, e.message);
    if (log) return getFromDB(type, sggCd, dealYm);
    return [];
  }
}

// ─── 외부 wrapper 4종 (호환성 보장 — 기존 getTransactions 시그니처 유지) ───

export async function getTransactions(sggCd: string, dealYm: string): Promise<CommercialTransaction[]> {
  return getTransactionsGeneric('commercial', sggCd, dealYm);
}

export async function getLandTransactions(sggCd: string, dealYm: string): Promise<LandTransaction[]> {
  return getTransactionsGeneric('land', sggCd, dealYm);
}

export async function getSHTransactions(sggCd: string, dealYm: string): Promise<SHTransaction[]> {
  return getTransactionsGeneric('sh', sggCd, dealYm);
}

export async function getAptTransactions(sggCd: string, dealYm: string): Promise<AptTransaction[]> {
  return getTransactionsGeneric('apt', sggCd, dealYm);
}

// getBuildingPermits는 A-3b-2 sub-track에서 추가 예정 (permit endpoint 확정 후)

// ─── 기간별 조회 (여러 월 통합) — 현재 호출 0건 (dead code, cleanup 백로그) ───

export async function getTransactionsByPeriod(sggCd: string, months: number): Promise<CommercialTransaction[]> {
  const now = new Date();
  const results: CommercialTransaction[] = [];

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYm = formatYm(d);
    const data = await getTransactions(sggCd, dealYm);
    results.push(...data);
  }

  return results;
}

export { formatYm };

// ============================================================
// Stage B-2c (A-3b-2) — ArchPmsHubService wrapper
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import type { BuildingPermit } from './molit-types';

const ARCH_PMS_BASE = 'http://apis.data.go.kr/1613000/ArchPmsHubService/getApBasisOulnInfo';
const REGION_PATH = path.join(process.cwd(), 'data', 'region_codes.json');

export interface PermitYmRange {
  from: string;  // 'YYYYMM'
  to: string;    // 'YYYYMM'
}

// region_codes.json module-level cache (PM2 restart 시 reload)
let regionCache: any = null;
function loadRegion(): any {
  if (!regionCache) regionCache = JSON.parse(fs.readFileSync(REGION_PATH, 'utf-8'));
  return regionCache;
}

// dongName + sigunguCd → (sub, bjdongCd) resolve. 부천 41190은 subSggBjdong 정적 매핑.
function resolveSubSggBjdong(sigunguCd: string, dongName: string): { sub: string; bjdongCd: string } | null {
  const region = loadRegion();
  // 부천 41190 fan-out 케이스
  if (sigunguCd === '41190') {
    for (const sdName of Object.keys(region)) {
      const sd = region[sdName];
      if (typeof sd !== 'object' || sd === null) continue;
      for (const sggName of Object.keys(sd)) {
        if (sd[sggName]?.code === '41190') {
          const sb = sd[sggName].subSggBjdong;
          if (!sb) return null;
          for (const sub of Object.keys(sb)) {
            const bjdongCd = sb[sub]?.[dongName];
            if (bjdongCd) return { sub, bjdongCd };
          }
        }
      }
    }
    return null;
  }
  // 일반 sgg
  for (const sdName of Object.keys(region)) {
    const sd = region[sdName];
    if (typeof sd !== 'object' || sd === null) continue;
    for (const sggName of Object.keys(sd)) {
      if (sd[sggName]?.code === sigunguCd) {
        const bjdongCd = sd[sggName].bjdongCodes?.[dongName];
        if (bjdongCd) return { sub: sigunguCd, bjdongCd };
      }
    }
  }
  return null;
}

// ymRange 검증 (YYYYMM 형식 + from<=to + 12개월 이내)
function validateYmRange(r: PermitYmRange): void {
  if (!/^\d{6}$/.test(r.from) || !/^\d{6}$/.test(r.to)) {
    throw new Error(`Invalid ymRange format (expected YYYYMM): ${JSON.stringify(r)}`);
  }
  if (r.from > r.to) throw new Error(`ymRange.from > to: ${JSON.stringify(r)}`);
  const fy = parseInt(r.from.slice(0, 4), 10), fm = parseInt(r.from.slice(4, 6), 10);
  const ty = parseInt(r.to.slice(0, 4), 10),   tm = parseInt(r.to.slice(4, 6), 10);
  if ((ty - fy) * 12 + (tm - fm) > 11) {
    throw new Error(`ymRange > 12 months (yearly fetch limit): ${JSON.stringify(r)}`);
  }
}

function enumerateYms(from: string, to: string): string[] {
  const yms: string[] = [];
  let cur = from;
  while (cur <= to) {
    yms.push(cur);
    const y = parseInt(cur.slice(0, 4), 10);
    const m = parseInt(cur.slice(4, 6), 10);
    const next = new Date(y, m, 1);  // m은 0-indexed라 +1 효과
    cur = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  return yms;
}

// raw XML item → BuildingPermit (38 필드)
function parseRawToPermit(raw: any): BuildingPermit {
  const toStr = (v: any) => String(v ?? '').trim();
  const toNum = (v: any) => { const n = parseFloat(String(v ?? '').trim()); return Number.isNaN(n) ? 0 : n; };
  const toInt = (v: any) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isNaN(n) ? 0 : n; };
  return {
    mgmPmsrgstPk: toStr(raw.mgmPmsrgstPk),
    archPmsDay: toStr(raw.archPmsDay),
    sigunguCd: toStr(raw.sigunguCd),
    bjdongCd: toStr(raw.bjdongCd),
    platPlc: toStr(raw.platPlc),
    platGbCd: toStr(raw.platGbCd),
    bun: toStr(raw.bun),
    ji: toStr(raw.ji),
    jimokCdNm: toStr(raw.jimokCdNm),
    jimokCd: toStr(raw.jimokCd),
    jiyukCdNm: toStr(raw.jiyukCdNm),
    jiyukCd: toStr(raw.jiyukCd),
    jiguCdNm: toStr(raw.jiguCdNm),
    jiguCd: toStr(raw.jiguCd),
    guyukCdNm: toStr(raw.guyukCdNm),
    guyukCd: toStr(raw.guyukCd),
    bldNm: toStr(raw.bldNm),
    archGbCdNm: toStr(raw.archGbCdNm),
    archGbCd: toStr(raw.archGbCd),
    mainPurpsCdNm: toStr(raw.mainPurpsCdNm),
    mainPurpsCd: toStr(raw.mainPurpsCd),
    platArea: toNum(raw.platArea),
    archArea: toNum(raw.archArea),
    totArea: toNum(raw.totArea),
    vlRatEstmTotArea: toNum(raw.vlRatEstmTotArea),
    bcRat: toNum(raw.bcRat),
    vlRat: toNum(raw.vlRat),
    mainBldCnt: toInt(raw.mainBldCnt),
    atchBldDongCnt: toInt(raw.atchBldDongCnt),
    hhldCnt: toInt(raw.hhldCnt),
    hoCnt: toInt(raw.hoCnt),
    fmlyCnt: toInt(raw.fmlyCnt),
    totPkngCnt: toInt(raw.totPkngCnt),
    stcnsSchedDay: toStr(raw.stcnsSchedDay),
    stcnsDelayDay: toStr(raw.stcnsDelayDay),
    realStcnsDay: toStr(raw.realStcnsDay),
    useAprDay: toStr(raw.useAprDay),
    crtnDay: toStr(raw.crtnDay),
  };
}

// ArchPmsHub fetch (페이지네이션)
async function fetchArchPmsHub(sub: string, bjdongCd: string, startDate: string, endDate: string): Promise<BuildingPermit[]> {
  const KEY = process.env.MOLIT_API_KEY;
  if (!KEY) throw new Error('MOLIT_API_KEY 없음');
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
  const all: BuildingPermit[] = [];
  let pageNo = 1;
  let totalCount = 0;
  do {
    const params = new URLSearchParams({
      serviceKey: KEY, sigunguCd: sub, bjdongCd, startDate, endDate,
      numOfRows: '100', pageNo: String(pageNo),
    });
    const url = `${ARCH_PMS_BASE}?${params.toString()}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) { console.warn(`[permit] HTTP ${r.status} page ${pageNo}`); break; }
    const parsed = parser.parse(await r.text());
    const header = parsed?.response?.header;
    const rCode = header?.resultCode;
    if (rCode !== '00' && rCode !== '000') {
      console.warn(`[permit] resultCode=${rCode} msg=${header?.resultMsg}`);
      break;
    }
    totalCount = parseInt(parsed?.response?.body?.totalCount || '0', 10);
    const items = parsed?.response?.body?.items?.item;
    const arr = Array.isArray(items) ? items : items ? [items] : [];
    all.push(...arr.map(parseRawToPermit));
    if (arr.length < 100) break;
    pageNo++;
    if (pageNo > 100) break;
    await new Promise(r => setTimeout(r, 100));
  } while (all.length < totalCount);
  return all;
}

function savePermits(rows: BuildingPermit[]): void {
  if (rows.length === 0) return;
  const insert = db.prepare(`INSERT OR REPLACE INTO building_permits (
    mgm_pmsrgst_pk, arch_pms_day, sigungu_cd, bjdong_cd, plat_plc, plat_gb_cd, bun, ji,
    jimok_cd_nm, jimok_cd, jiyuk_cd_nm, jiyuk_cd, jigu_cd_nm, jigu_cd, guyuk_cd_nm, guyuk_cd,
    bld_nm, arch_gb_cd_nm, arch_gb_cd, main_purps_cd_nm, main_purps_cd,
    plat_area, arch_area, tot_area, vl_rat_estm_tot_area, bc_rat, vl_rat,
    main_bld_cnt, atch_bld_dong_cnt, hhld_cnt, ho_cnt, fmly_cnt, tot_pkng_cnt,
    stcns_sched_day, stcns_delay_day, real_stcns_day, use_apr_day, crtn_day
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const txn = db.transaction((items: BuildingPermit[]) => {
    for (const r of items) {
      insert.run(
        r.mgmPmsrgstPk, r.archPmsDay, r.sigunguCd, r.bjdongCd, r.platPlc, r.platGbCd, r.bun, r.ji,
        r.jimokCdNm, r.jimokCd, r.jiyukCdNm, r.jiyukCd, r.jiguCdNm, r.jiguCd, r.guyukCdNm, r.guyukCd,
        r.bldNm, r.archGbCdNm, r.archGbCd, r.mainPurpsCdNm, r.mainPurpsCd,
        r.platArea, r.archArea, r.totArea, r.vlRatEstmTotArea, r.bcRat, r.vlRat,
        r.mainBldCnt, r.atchBldDongCnt, r.hhldCnt, r.hoCnt, r.fmlyCnt, r.totPkngCnt,
        r.stcnsSchedDay, r.stcnsDelayDay, r.realStcnsDay, r.useAprDay, r.crtnDay
      );
    }
  });
  txn(rows);
}

function rowToPermit(r: any): BuildingPermit {
  return {
    mgmPmsrgstPk: r.mgm_pmsrgst_pk, archPmsDay: r.arch_pms_day, sigunguCd: r.sigungu_cd, bjdongCd: r.bjdong_cd,
    platPlc: r.plat_plc, platGbCd: r.plat_gb_cd, bun: r.bun, ji: r.ji,
    jimokCdNm: r.jimok_cd_nm, jimokCd: r.jimok_cd, jiyukCdNm: r.jiyuk_cd_nm, jiyukCd: r.jiyuk_cd,
    jiguCdNm: r.jigu_cd_nm, jiguCd: r.jigu_cd, guyukCdNm: r.guyuk_cd_nm, guyukCd: r.guyuk_cd,
    bldNm: r.bld_nm, archGbCdNm: r.arch_gb_cd_nm, archGbCd: r.arch_gb_cd,
    mainPurpsCdNm: r.main_purps_cd_nm, mainPurpsCd: r.main_purps_cd,
    platArea: r.plat_area, archArea: r.arch_area, totArea: r.tot_area, vlRatEstmTotArea: r.vl_rat_estm_tot_area,
    bcRat: r.bc_rat, vlRat: r.vl_rat,
    mainBldCnt: r.main_bld_cnt, atchBldDongCnt: r.atch_bld_dong_cnt,
    hhldCnt: r.hhld_cnt, hoCnt: r.ho_cnt, fmlyCnt: r.fmly_cnt, totPkngCnt: r.tot_pkng_cnt,
    stcnsSchedDay: r.stcns_sched_day, stcnsDelayDay: r.stcns_delay_day, realStcnsDay: r.real_stcns_day,
    useAprDay: r.use_apr_day, crtnDay: r.crtn_day,
  };
}

function getPermits(sub: string, bjdongCd: string, ymFrom: string, ymTo: string): BuildingPermit[] {
  const rows = db.prepare(`SELECT * FROM building_permits
    WHERE sigungu_cd = ? AND bjdong_cd = ?
      AND crtn_day BETWEEN ? AND ?
    ORDER BY crtn_day DESC`)
    .all(sub, bjdongCd, ymFrom + '01', ymTo + '31') as any[];
  return rows.map(rowToPermit);
}

function getPermitFetchLog(sub: string, bjdongCd: string, ym: string): any {
  return db.prepare(`SELECT * FROM permit_fetch_log
    WHERE sigungu_cd = ? AND bjdong_cd = ? AND crtn_ym = ?`)
    .get(sub, bjdongCd, ym);
}

function savePermitFetchLog(sub: string, bjdongCd: string, ym: string, rowCount: number): void {
  db.prepare(`INSERT OR REPLACE INTO permit_fetch_log
    (sigungu_cd, bjdong_cd, crtn_ym, fetched_at, row_count) VALUES (?, ?, ?, ?, ?)`)
    .run(sub, bjdongCd, ym, new Date().toISOString(), rowCount);
}

function isPermitCacheValid(sub: string, bjdongCd: string, ym: string): boolean {
  const log = getPermitFetchLog(sub, bjdongCd, ym);
  if (!log) return false;
  if (log.row_count === 0) return false;  // 0건 cache 무시 (transactions 패턴)
  if (isFinalData(ym)) return true;
  const currentYm = formatYm(new Date());
  const cacheHours = (ym === currentYm) ? 6 : 24;
  const elapsedMs = Date.now() - new Date(log.fetched_at).getTime();
  return elapsedMs < cacheHours * 3600_000;
}

/**
 * BSN 빌딩 매수자 설득 콘텐츠 — ArchPmsHubService 인허가 wrapper
 *
 * signature: (sigunguCd, dongName, ymRange)
 *   - 41190(부천) 자동 fan-out via subSggBjdong
 *   - 일반 sgg는 sigunguCd 직접 사용
 * cache: permit_fetch_log crtn_ym 단위 (semantics = crtnDay)
 * fetch: yearly (ArchPmsHub startDate~endDate는 crtnDay 기준)
 * 정책 α: 저장 무필터, UI는 BUILDING_PURPS_WHITELIST 필터링
 */
export async function getBuildingPermits(
  sigunguCd: string,
  dongName: string,
  ymRange: PermitYmRange
): Promise<BuildingPermit[]> {
  validateYmRange(ymRange);

  const resolved = resolveSubSggBjdong(sigunguCd, dongName);
  if (!resolved) {
    console.warn(`[permit] resolve miss: sgg=${sigunguCd}, dong=${dongName}`);
    return [];
  }
  const { sub, bjdongCd } = resolved;

  const yms = enumerateYms(ymRange.from, ymRange.to);
  const allValid = yms.every(ym => isPermitCacheValid(sub, bjdongCd, ym));

  if (!allValid) {
    const startDate = ymRange.from + '01';
    const endDate = ymRange.to + '31';
    try {
      const rows = await fetchArchPmsHub(sub, bjdongCd, startDate, endDate);
      savePermits(rows);
      // yearly fetch → 월별 split: 각 ym에 fetch_log row INSERT
      for (const ym of yms) {
        const ymCount = rows.filter(r => r.crtnDay.slice(0, 6) === ym).length;
        savePermitFetchLog(sub, bjdongCd, ym, ymCount);
      }
    } catch (e: any) {
      console.warn(`[permit] fetch fallback (stale cache): ${e?.message || e}`);
    }
  }

  return getPermits(sub, bjdongCd, ymRange.from, ymRange.to);
}
