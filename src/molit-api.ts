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
