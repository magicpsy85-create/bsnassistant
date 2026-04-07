import db from './db';
import { XMLParser } from 'fast-xml-parser';

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

// ─── 국토교통부 API 호출 ───

async function fetchFromMolitAPI(sggCd: string, dealYm: string): Promise<any[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error('MOLIT_API_KEY가 설정되지 않았습니다');

  const baseUrl = 'http://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade';
  let allItems: any[] = [];
  let pageNo = 1;
  let totalCount = 0;

  do {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      LAWD_CD: sggCd,
      DEAL_YMD: dealYm,
      pageNo: String(pageNo),
      numOfRows: '1000',
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log('[MOLIT API] 호출:', sggCd, dealYm, 'page', pageNo);

    const response = await fetch(url);
    const xmlText = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const result = parser.parse(xmlText);

    // 에러 체크
    const header = result?.response?.header;
    const rCode = String(header?.resultCode || '');
    if (rCode !== '00' && rCode !== '000') {
      console.error('[MOLIT API] 에러:', header?.resultMsg);
      break;
    }

    const body = result?.response?.body;
    totalCount = body?.totalCount || 0;

    const items = body?.items?.item;
    if (!items) break;

    const itemArray = Array.isArray(items) ? items : [items];
    allItems = allItems.concat(itemArray);

    pageNo++;
  } while (allItems.length < totalCount);

  console.log('[MOLIT API] 수집:', sggCd, dealYm, allItems.length + '건');
  return allItems;
}

// ─── DB 저장 ───

function saveToDB(sggCd: string, dealYm: string, apiItems: any[]) {
  // 집합건물 + 지분거래 제외
  const filtered = apiItems.filter((t: any) => {
    const type = String(t.buildingType || '').trim();
    if (type === '집합') return false;
    const share = String(t.shareDealingType || '').trim();
    if (share !== '') return false;
    return true;
  });

  // 기존 데이터 삭제 후 새로 삽입
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

  // fetch_log 갱신
  const isFinal = isFinalData(dealYm) ? 1 : 0;
  db.prepare(`
    INSERT OR REPLACE INTO fetch_log (sgg_cd, deal_ym, fetched_at, count, is_final)
    VALUES (?, ?, ?, ?, ?)
  `).run(sggCd, dealYm, new Date().toISOString(), filtered.length, isFinal);

  console.log('[실거래가] 저장:', sggCd, dealYm, filtered.length + '건 (집합 제외)');
}

// ─── DB 조회 ───

function getFromDB(sggCd: string, dealYm: string) {
  return db.prepare(
    'SELECT * FROM transactions WHERE sgg_cd = ? AND deal_ym = ?'
  ).all(sggCd, dealYm);
}

// ─── 통합 조회 (DB 우선, 없으면 API) ───

export async function getTransactions(sggCd: string, dealYm: string) {
  const log: any = db.prepare(
    'SELECT * FROM fetch_log WHERE sgg_cd = ? AND deal_ym = ?'
  ).get(sggCd, dealYm);

  // 확정 데이터 → DB 즉시 반환
  if (log && log.is_final === 1) {
    return getFromDB(sggCd, dealYm);
  }

  // 미확정이지만 최근 수집 → DB 반환 (단, 0건은 재호출)
  if (log && log.count > 0) {
    const isCurrentMonth = dealYm === formatYm(new Date());
    const cacheHours = isCurrentMonth ? 6 : 24;
    const fetchedAt = new Date(log.fetched_at);
    const hoursDiff = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < cacheHours) {
      return getFromDB(sggCd, dealYm);
    }
  }

  // API 호출 후 저장
  try {
    const apiData = await fetchFromMolitAPI(sggCd, dealYm);
    saveToDB(sggCd, dealYm, apiData);
    return getFromDB(sggCd, dealYm);
  } catch (e: any) {
    console.error('[실거래가] API 호출 실패:', e.message);
    if (log) return getFromDB(sggCd, dealYm);
    return [];
  }
}

// ─── 기간별 조회 (여러 월 통합) ───

export async function getTransactionsByPeriod(sggCd: string, months: number) {
  const now = new Date();
  const results: any[] = [];

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYm = formatYm(d);
    const data = await getTransactions(sggCd, dealYm);
    results.push(...data);
  }

  return results;
}

export { formatYm };
