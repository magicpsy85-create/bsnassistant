import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://apis.data.go.kr/1613000/ArchPmsHubService/getApBasisOulnInfo';
const DOCS_DIR = path.join(process.cwd(), 'docs');
const BUCHEON_PATH = path.join(DOCS_DIR, 'a3b2-step-a-bucheon-mapping.json');
const SEMANTICS_PATH = path.join(DOCS_DIR, 'a3b2-step-a-semantics.json');

function getKey(): string {
  const k = process.env.MOLIT_API_KEY;
  if (!k) { console.error('[FATAL] MOLIT_API_KEY 없음'); process.exit(1); }
  return k;
}
const KEY = getKey();

interface ProbeRes {
  url: string; httpStatus: number;
  resultCode?: string; resultMsg?: string;
  totalCount?: number; itemsCount: number;
  firstItem?: any;
  archPmsDayRange?: { min: string; max: string };
  crtnDayRange?: { min: string; max: string };
  echoSigunguCd?: string; echoBjdongCd?: string;
}

async function probe(sigunguCd: string, bjdongCd: string, startDate: string, endDate: string): Promise<ProbeRes> {
  const params = new URLSearchParams({
    serviceKey: KEY, sigunguCd, bjdongCd, startDate, endDate,
    numOfRows: '100', pageNo: '1',
  });
  const url = `${BASE}?${params.toString()}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const raw = await r.text();
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const parsed = parser.parse(raw);
    const header = parsed?.response?.header;
    const body = parsed?.response?.body;
    const items = body?.items?.item;
    const arr = Array.isArray(items) ? items : items ? [items] : [];
    const res: ProbeRes = {
      url: url.replace(KEY, '***'),
      httpStatus: r.status,
      resultCode: header?.resultCode,
      resultMsg: header?.resultMsg,
      totalCount: parseInt(body?.totalCount || '0', 10),
      itemsCount: arr.length,
      firstItem: arr[0],
      echoSigunguCd: arr[0]?.sigunguCd,
      echoBjdongCd: arr[0]?.bjdongCd,
    };
    if (arr.length > 0) {
      const archDays = arr.map((i: any) => i.archPmsDay).filter(Boolean).sort();
      const crtnDays = arr.map((i: any) => i.crtnDay).filter(Boolean).sort();
      if (archDays.length) res.archPmsDayRange = { min: archDays[0], max: archDays[archDays.length-1] };
      if (crtnDays.length) res.crtnDayRange  = { min: crtnDays[0],  max: crtnDays[crtnDays.length-1] };
    }
    return res;
  } catch (e: any) {
    return { url: url.replace(KEY, '***'), httpStatus: 0, itemsCount: 0, resultMsg: 'error: ' + e.message };
  }
}

// ===== PROBE 1: 부천 24 dong × 3 sub 매핑 =====
async function probeBucheonMapping() {
  console.log('\n========== PROBE 1: 부천 매핑 ==========');
  const regionPath = path.join(process.cwd(), 'data', 'region_codes.json');
  const region = JSON.parse(fs.readFileSync(regionPath, 'utf-8'));
  let bucheonSgg: any = null;
  for (const sdName of Object.keys(region)) {
    const sd = region[sdName];
    if (typeof sd !== 'object' || sd === null) continue;
    for (const sggName of Object.keys(sd)) {
      if (sd[sggName]?.code === '41190') { bucheonSgg = sd[sggName]; break; }
    }
    if (bucheonSgg) break;
  }
  if (!bucheonSgg) { console.error('[FATAL] 부천 41190 not found'); process.exit(1); }

  const bjdongCodes = bucheonSgg.bjdongCodes as Record<string, string>;
  const subSggs: string[] = bucheonSgg.subSggCodes;
  const dongEntries = Object.entries(bjdongCodes);
  console.log(`${dongEntries.length} dong × ${subSggs.length} sub = ${dongEntries.length * subSggs.length} probes`);

  const subSggBjdong: Record<string, Record<string, string>> = {};
  for (const s of subSggs) subSggBjdong[s] = {};
  const allProbes: any[] = [];

  for (const [dongName, bjdongCd] of dongEntries) {
    for (const sub of subSggs) {
      const r = await probe(sub, bjdongCd, '20240101', '20241231');
      const umdNm = r.firstItem?.umdNm;
      const norm = (s?: string) => (s || '').replace(/\s/g, '');
      const matched = norm(umdNm) === norm(dongName);
      allProbes.push({ dong: dongName, bjdongCd, sub, matched, umdNm, itemsCount: r.itemsCount, totalCount: r.totalCount });
      if (matched) {
        subSggBjdong[sub][dongName] = bjdongCd;
        console.log(`  ✓ ${dongName}/${bjdongCd} → ${sub} [umdNm=${umdNm}, ${r.itemsCount}/${r.totalCount}건]`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const dongMatchCount: Record<string, number> = {};
  for (const p of allProbes) if (p.matched) dongMatchCount[p.dong] = (dongMatchCount[p.dong] || 0) + 1;
  const ambiguous = Object.keys(bjdongCodes)
    .map(d => ({ dong: d, matches: dongMatchCount[d] || 0 }))
    .filter(x => x.matches !== 1);

  const summary = {
    runAt: new Date().toISOString(),
    totalProbes: allProbes.length,
    uniqueMatches: Object.values(dongMatchCount).filter(c => c === 1).length,
    totalDongs: dongEntries.length,
    ambiguous,
    subSggBjdong,
    allProbes,
  };
  fs.writeFileSync(BUCHEON_PATH, JSON.stringify(summary, null, 2));
  console.log(`\n저장: ${BUCHEON_PATH}`);
  console.log(`결과: unique 매칭 ${summary.uniqueMatches}/${dongEntries.length}, ambiguous ${ambiguous.length}`);
  if (ambiguous.length > 0) console.log('⚠ ambiguous:', JSON.stringify(ambiguous));
}

// ===== PROBE 2: archPmsDay semantics =====
async function probeSemantics() {
  console.log('\n========== PROBE 2: archPmsDay semantics ==========');
  const tests = [
    { name: '2024 1년치 (baseline)', startDate: '20240101', endDate: '20241231' },
    { name: '2024-01 단일월',         startDate: '20240101', endDate: '20240131' },
    { name: '2020-01 과거 단일월',    startDate: '20200101', endDate: '20200131' },
    { name: '2025-01 미래 단일월',    startDate: '20250101', endDate: '20250131' },
  ];
  const results: any[] = [];
  for (const t of tests) {
    const r = await probe('11680', '10300', t.startDate, t.endDate);
    const inArch = !!(r.archPmsDayRange && r.archPmsDayRange.min >= t.startDate && r.archPmsDayRange.max <= t.endDate);
    const inCrtn = !!(r.crtnDayRange  && r.crtnDayRange.min  >= t.startDate && r.crtnDayRange.max  <= t.endDate);
    const entry = { ...t, ...r, archPmsInRange: inArch, crtnInRange: inCrtn };
    results.push(entry);
    console.log(`\n[${t.name}] ${t.startDate}~${t.endDate}`);
    console.log(`  total=${r.totalCount} items=${r.itemsCount}`);
    console.log(`  archPmsDay: ${r.archPmsDayRange?.min}~${r.archPmsDayRange?.max} (inRange: ${inArch})`);
    console.log(`  crtnDay   : ${r.crtnDayRange?.min}~${r.crtnDayRange?.max} (inRange: ${inCrtn})`);
    await new Promise(r => setTimeout(r, 1500));
  }
  // 자동 결론
  const allArchIn = results.every(r => r.itemsCount === 0 || r.archPmsInRange);
  const allCrtnIn = results.every(r => r.itemsCount === 0 || r.crtnInRange);
  console.log('\n========== semantics 결론 ==========');
  console.log(`startDate/endDate 기준: ${allArchIn ? 'archPmsDay' : allCrtnIn ? 'crtnDay' : '둘 다 아님 (기타 기준)'}`);

  fs.writeFileSync(SEMANTICS_PATH, JSON.stringify({ runAt: new Date().toISOString(), conclusion: { allArchIn, allCrtnIn }, tests: results }, null, 2));
  console.log(`\n저장: ${SEMANTICS_PATH}`);
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  await probeBucheonMapping();
  await probeSemantics();
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
