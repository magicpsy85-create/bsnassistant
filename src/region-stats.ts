import db from './db';
import fs from 'fs';
import path from 'path';

// ─── 지역 메타 타입 ───
export interface Region {
  sido: string;
  sgg?: string;
  dong?: string;
}

export interface RegionStatsOptions {
  region?: Region;
  region1?: Region;
  region2?: Region;
  rankBy?: 'totalCount' | 'avgPrice' | 'avgPricePerPyeong' | 'avgPricePerArea' | 'corpBuyerRatio';
}

// ─── region_codes.json 로드 (sgg_cd 매핑용) ───
let regionCodes: any = null;
function loadRegionCodes() {
  if (regionCodes) return regionCodes;
  try {
    const p = path.join(__dirname, '..', 'data', 'region_codes.json');
    regionCodes = JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    regionCodes = {};
  }
  return regionCodes;
}

export function getSggCode(sido: string, sgg: string): string | null {
  const codes = loadRegionCodes();
  return codes?.[sido]?.[sgg]?.code || null;
}

export function getAllSgg(sido: string): { name: string; code: string }[] {
  const codes = loadRegionCodes();
  const sidoData = codes?.[sido];
  if (!sidoData) return [];
  return Object.entries(sidoData).map(([name, data]: any) => ({
    name,
    code: data.code
  }));
}

// ─── 기간 유틸 ───
function toYm(date: Date): string {
  return date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0');
}

// ─── DB 조회 헬퍼 (db null 안전) ───
function queryTransactions(sggCode: string, startYm: string, endYm: string, dong?: string): any[] {
  if (!db) return [];
  let sql = `SELECT * FROM transactions WHERE sgg_cd = ? AND deal_ym >= ? AND deal_ym <= ?`;
  const params: any[] = [sggCode, startYm, endYm];
  if (dong) {
    sql += ` AND umd_nm LIKE ?`;
    params.push(dong + '%');
  }
  try {
    return (db as any).prepare(sql).all(...params);
  } catch (e: any) {
    console.log('[region-stats] 쿼리 실패:', e.message);
    return [];
  }
}

// ─── 기본 집계 함수 ───
function aggregatePeriod(transactions: any[]) {
  const valid = transactions.filter((t: any) => !t.cdeal_day || t.cdeal_day.trim() === '');
  const totalCount = valid.length;

  if (totalCount === 0) {
    return {
      totalCount: 0,
      avgPrice: 0,
      avgPricePerPyeong: 0,
      avgPricePerArea: 0,
      buyerCorpRatio: 0,
      sellerCorpRatio: 0,
      byDong: [],
      byBuildYear: {},
      byLandUse: {},
      highest: null,
      lowest: null
    };
  }

  const avgPrice = Math.round(valid.reduce((s, t) => s + t.deal_amount, 0) / totalCount);

  const validPy = valid.filter((t: any) => t.plottage_ar > 0);
  const avgPricePerPyeong = validPy.length > 0
    ? Math.round(validPy.reduce((s, t) => s + (t.deal_amount / t.plottage_ar * 3.3058), 0) / validPy.length)
    : 0;

  const validAr = valid.filter((t: any) => t.building_ar > 0);
  const avgPricePerArea = validAr.length > 0
    ? Math.round(validAr.reduce((s, t) => s + (t.deal_amount / t.building_ar * 3.3058), 0) / validAr.length)
    : 0;

  const buyerCorp = valid.filter((t: any) => t.buyer_gbn === '법인').length;
  const sellerCorp = valid.filter((t: any) => t.sler_gbn === '법인').length;
  const buyerCorpRatio = Math.round(buyerCorp / totalCount * 100);
  const sellerCorpRatio = Math.round(sellerCorp / totalCount * 100);

  const byDongMap: any = {};
  valid.forEach((t: any) => {
    const d = t.umd_nm || '기타';
    if (!byDongMap[d]) byDongMap[d] = { count: 0, totalPrice: 0, totalPP: 0, ppCount: 0 };
    byDongMap[d].count++;
    byDongMap[d].totalPrice += t.deal_amount;
    if (t.plottage_ar > 0) {
      byDongMap[d].totalPP += t.deal_amount / t.plottage_ar * 3.3058;
      byDongMap[d].ppCount++;
    }
  });
  const byDong = Object.entries(byDongMap).map(([name, d]: any) => ({
    name,
    count: d.count,
    avgPrice: d.count > 0 ? Math.round(d.totalPrice / d.count) : 0,
    avgPricePerPyeong: d.ppCount > 0 ? Math.round(d.totalPP / d.ppCount) : 0
  }));

  const byBuildYear: any = { '~1990': 0, '1990~2000': 0, '2000~2010': 0, '2010~2020': 0, '2020~': 0 };
  valid.forEach((t: any) => {
    const y = parseInt(t.build_year);
    if (!y) return;
    if (y < 1990) byBuildYear['~1990']++;
    else if (y < 2000) byBuildYear['1990~2000']++;
    else if (y < 2010) byBuildYear['2000~2010']++;
    else if (y < 2020) byBuildYear['2010~2020']++;
    else byBuildYear['2020~']++;
  });

  const byLandUse: any = {};
  valid.forEach((t: any) => {
    const lu = t.land_use || '기타';
    byLandUse[lu] = (byLandUse[lu] || 0) + 1;
  });

  let highest: any = null, lowest: any = null;
  validPy.forEach((t: any) => {
    const pp = Math.round(t.deal_amount / t.plottage_ar * 3.3058);
    if (!highest || pp > highest.pricePerPyeong) highest = {
      pricePerPyeong: pp, dealAmount: t.deal_amount, umdNm: t.umd_nm, jibun: t.jibun, buildYear: t.build_year
    };
    if (!lowest || pp < lowest.pricePerPyeong) lowest = {
      pricePerPyeong: pp, dealAmount: t.deal_amount, umdNm: t.umd_nm, jibun: t.jibun, buildYear: t.build_year
    };
  });

  return {
    totalCount,
    avgPrice,
    avgPricePerPyeong,
    avgPricePerArea,
    buyerCorpRatio,
    sellerCorpRatio,
    byDong,
    byBuildYear,
    byLandUse,
    highest,
    lowest
  };
}

// ─── 반기별 집계 ───
function computeHalves(sggCode: string, dong: string | undefined): any[] {
  const halves = [
    { label: '2024 상반기', start: '202401', end: '202406' },
    { label: '2024 하반기', start: '202407', end: '202412' },
    { label: '2025 상반기', start: '202501', end: '202506' },
    { label: '2025 하반기', start: '202507', end: '202512' },
    { label: '2026 상반기', start: '202601', end: '202606' }
  ];
  return halves.map(h => {
    const txs = queryTransactions(sggCode, h.start, h.end, dong);
    const agg = aggregatePeriod(txs);
    return {
      label: h.label,
      period: `${h.start.substring(0,4)}.${h.start.substring(4)}~${h.end.substring(0,4)}.${h.end.substring(4)}`,
      totalCount: agg.totalCount,
      avgPrice: agg.avgPrice,
      avgPricePerPyeong: agg.avgPricePerPyeong,
      buyerCorpRatio: agg.buyerCorpRatio
    };
  });
}

// ─── 서울 내 모든 구의 당기 통계 (캐시) ───
let sggStatsCache: { key: string; data: any[] } | null = null;

function getSggStatsForCurrentPeriod(sido: string, currStart: string, currEnd: string): any[] {
  const cacheKey = `${sido}_${currStart}_${currEnd}`;
  if (sggStatsCache && sggStatsCache.key === cacheKey) {
    return sggStatsCache.data;
  }
  const allSgg = getAllSgg(sido);
  const stats = allSgg.map(s => {
    const txs = queryTransactions(s.code, currStart, currEnd);
    const agg = aggregatePeriod(txs);
    return { name: s.name, code: s.code, ...agg };
  });
  sggStatsCache = { key: cacheKey, data: stats };
  return stats;
}

// ─── 단일 지역 통계 ───
export function computeSingleRegionStats(region: Region) {
  const sggCode = region.sgg ? getSggCode(region.sido, region.sgg) : null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentYm = toYm(now);

  const currStart = `${currentYear}01`;
  const currEnd = currentYm;
  const prevStart = `${currentYear - 1}01`;
  const prevEnd = `${currentYear - 1}${String(currentMonth).padStart(2, '0')}`;

  const currentPeriodLabel = `${currentYear}.01~${currentYear}.${String(currentMonth).padStart(2, '0')}`;
  const prevPeriodLabel = `${currentYear - 1}.01~${currentYear - 1}.${String(currentMonth).padStart(2, '0')}`;

  if (!sggCode) {
    return {
      region: { ...region },
      currentPeriodLabel,
      prevPeriodLabel,
      error: `시군구 코드를 찾을 수 없음: ${region.sido}/${region.sgg}`
    };
  }

  const currentTxs = queryTransactions(sggCode, currStart, currEnd, region.dong);
  const prevTxs = queryTransactions(sggCode, prevStart, prevEnd, region.dong);
  const current = aggregatePeriod(currentTxs);
  const prev = aggregatePeriod(prevTxs);

  const changes = {
    totalCount: prev.totalCount > 0 ? Math.round((current.totalCount - prev.totalCount) / prev.totalCount * 100) : null,
    avgPrice: prev.avgPrice > 0 ? Math.round((current.avgPrice - prev.avgPrice) / prev.avgPrice * 100) : null,
    avgPricePerPyeong: prev.avgPricePerPyeong > 0 ? Math.round((current.avgPricePerPyeong - prev.avgPricePerPyeong) / prev.avgPricePerPyeong * 100) : null,
    avgPricePerArea: prev.avgPricePerArea > 0 ? Math.round((current.avgPricePerArea - prev.avgPricePerArea) / prev.avgPricePerArea * 100) : null
  };

  let rankings: any = null;
  let dongRankings: any = null;

  if (region.sgg) {
    const sggStats = getSggStatsForCurrentPeriod(region.sido, currStart, currEnd);
    const rankByMetric = (metric: string) => {
      const sorted = sggStats.slice().sort((a: any, b: any) => b[metric] - a[metric]);
      const idx = sorted.findIndex(s => s.name === region.sgg);
      return idx >= 0 ? idx + 1 : null;
    };

    if (!region.dong) {
      rankings = {
        totalCount: rankByMetric('totalCount'),
        avgPrice: rankByMetric('avgPrice'),
        avgPricePerPyeong: rankByMetric('avgPricePerPyeong'),
        avgPricePerArea: rankByMetric('avgPricePerArea'),
        buyerCorpRatio: rankByMetric('buyerCorpRatio'),
        totalSggCount: sggStats.length
      };
    } else {
      const sggAllTxs = queryTransactions(sggCode, currStart, currEnd);
      const sggAggAll = aggregatePeriod(sggAllTxs);
      const dongStats = sggAggAll.byDong;

      const rankInSgg = (metric: string) => {
        const sorted = dongStats.slice().sort((a: any, b: any) => (b as any)[metric] - (a as any)[metric]);
        const idx = sorted.findIndex((d: any) => d.name.startsWith(region.dong!));
        return idx >= 0 ? idx + 1 : null;
      };

      dongRankings = {
        sggInSeoul: {
          totalCount: rankByMetric('totalCount'),
          avgPricePerPyeong: rankByMetric('avgPricePerPyeong'),
          totalSggCount: sggStats.length
        },
        dongInSgg: {
          totalCount: rankInSgg('count'),
          avgPricePerPyeong: rankInSgg('avgPricePerPyeong'),
          totalDongCount: dongStats.length
        }
      };
    }
  }

  const halves = computeHalves(sggCode, region.dong);

  return {
    region: { ...region },
    currentPeriodLabel,
    prevPeriodLabel,
    current,
    prev,
    changes,
    rankings,
    dongRankings,
    halves
  };
}

// ─── 두 지역 비교 ───
export function computeCompareStats(region1: Region, region2: Region) {
  return {
    region1: computeSingleRegionStats(region1),
    region2: computeSingleRegionStats(region2)
  };
}

// ─── 랭킹 ───
export function computeRankingStats(region: Region, rankBy: string = 'totalCount') {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentYm = toYm(now);
  const currStart = `${currentYear}01`;
  const currEnd = currentYm;
  const currentPeriodLabel = `${currentYear}.01~${currentYear}.${String(currentMonth).padStart(2, '0')}`;

  if (!region.sgg) {
    const items = getSggStatsForCurrentPeriod(region.sido, currStart, currEnd);
    const fieldMap: any = {
      'corpBuyerRatio': 'buyerCorpRatio',
      'totalCount': 'totalCount',
      'avgPrice': 'avgPrice',
      'avgPricePerPyeong': 'avgPricePerPyeong',
      'avgPricePerArea': 'avgPricePerArea'
    };
    const sortField = fieldMap[rankBy] || rankBy;
    const sorted = items.slice().sort((a: any, b: any) => b[sortField] - a[sortField]);
    return {
      region: { ...region },
      currentPeriodLabel,
      rankBy,
      sortField,
      scope: 'sgg',
      items: sorted
    };
  } else {
    const sggCode = getSggCode(region.sido, region.sgg);
    if (!sggCode) {
      return { region: { ...region }, error: `시군구 코드 없음: ${region.sgg}` };
    }
    const txs = queryTransactions(sggCode, currStart, currEnd);
    const agg = aggregatePeriod(txs);
    const metric = rankBy === 'totalCount' ? 'count' : rankBy;
    const sorted = agg.byDong.slice().sort((a: any, b: any) => (b as any)[metric] - (a as any)[metric]);
    return {
      region: { ...region },
      currentPeriodLabel,
      rankBy,
      scope: 'dong',
      items: sorted
    };
  }
}

// ─── 메인 진입점 ───
export function computeRegionStats(options: RegionStatsOptions): any {
  sggStatsCache = null;

  if (options.region1 && options.region2) {
    return { type: 'compare', ...computeCompareStats(options.region1, options.region2) };
  }
  if (options.region && options.rankBy) {
    return { type: 'ranking', ...computeRankingStats(options.region, options.rankBy) };
  }
  if (options.region) {
    return { type: 'single', ...computeSingleRegionStats(options.region) };
  }
  return null;
}
