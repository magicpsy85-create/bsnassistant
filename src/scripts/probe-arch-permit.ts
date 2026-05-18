import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://apis.data.go.kr/1613000/ArchPmsHubService/getApBasisOulnInfo';
const DOCS_DIR = path.join(process.cwd(), 'docs');
const LOG_PATH = path.join(DOCS_DIR, 'a3b2-step-a-probe.log');
const JSON_PATH = path.join(DOCS_DIR, 'a3b2-step-a-probe.json');

const ESTIMATED_MAPPINGS: Record<string, string[]> = {
  permitDate: ['archPmsDay'],
  mainUse: ['mainPurpsCdNm', 'mainPurpsCd'],
  permitType: ['archGbCdNm', 'archGbCd'],
  plotAr: ['platArea'],
  buildingAr: ['archArea'],
  totalFloorAr: ['totArea'],
  bldCoverRatio: ['bcRat'],
  flrAreaRatio: ['vlRat'],
  useAprDay: ['useAprDay'],
  cnstrtSchedDay: ['stcnsSchedDay'],
  bldNm: ['bldNm'],
  mgmPmsrgstPk: ['mgmPmsrgstPk'],
  hhldHoFmlyCnt: ['hhldCnt', 'hoCnt', 'fmlyCnt'],
  totPkngCnt: ['totPkngCnt'],
};

function getKey(): string {
  const k = process.env.MOLIT_API_KEY;
  if (!k) { console.error('[FATAL] MOLIT_API_KEY 없음'); process.exit(1); }
  return k;
}

function getBucheonSampleBjdongCd(): string {
  const p = path.join(process.cwd(), 'data', 'region_codes.json');
  if (!fs.existsSync(p)) { console.error('[FATAL] data/region_codes.json 없음'); process.exit(1); }
  const region = JSON.parse(fs.readFileSync(p, 'utf-8'));
  for (const sdName of Object.keys(region)) {
    const sd = region[sdName];
    if (typeof sd !== 'object' || sd === null) continue;
    for (const sggName of Object.keys(sd)) {
      const sgg = sd[sggName];
      if (sgg?.code === '41190' || sggName.includes('부천')) {
        const bj = sgg.bjdongCodes;
        if (Array.isArray(bj)) return bj[0];
        if (bj && typeof bj === 'object') return Object.keys(bj).map(k => bj[k])[0];
      }
    }
  }
  console.error('[FATAL] 부천 41190 bjdongCodes 추출 실패'); process.exit(1);
}

interface CallResult {
  name: string; url: string; httpStatus?: number;
  resultCode?: string; resultMsg?: string;
  totalCount?: number; itemsCount: number;
  firstItem?: any; allFieldNames?: string[]; rawSlice?: string; error?: string;
}

const KEY = getKey();
console.log('KEY length:', KEY.length, '/ prefix:', KEY.slice(0, 8) + '...');
const bucheonBjdong = getBucheonSampleBjdongCd();
console.log('부천 sample bjdongCd:', bucheonBjdong);

const startDate = '20240101', endDate = '20241231';

async function probe(name: string, sigunguCd: string, bjdongCd: string): Promise<CallResult> {
  const params = new URLSearchParams({
    serviceKey: KEY, sigunguCd, bjdongCd, startDate, endDate,
    numOfRows: '100', pageNo: '1',
  });
  const url = `${BASE}?${params.toString()}`;
  console.log('\n========== ' + name + ' ==========');
  console.log('URL (key masked):', url.replace(KEY, '***'));
  const r: CallResult = { name, url, itemsCount: 0 };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    r.httpStatus = res.status;
    const raw = await res.text();
    r.rawSlice = raw.slice(0, 2000);
    console.log('HTTP', res.status);
    console.log('RAW (first 2000 chars):\n' + r.rawSlice);
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const parsed = parser.parse(raw);
    r.resultCode = parsed?.response?.header?.resultCode;
    r.resultMsg = parsed?.response?.header?.resultMsg;
    r.totalCount = parseInt(parsed?.response?.body?.totalCount || '0', 10);
    console.log('\nresultCode:', r.resultCode, '/ msg:', r.resultMsg);
    console.log('totalCount:', r.totalCount);
    const items = parsed?.response?.body?.items?.item;
    const arr = Array.isArray(items) ? items : items ? [items] : [];
    r.itemsCount = arr.length;
    console.log('items count:', arr.length);
    if (arr[0]) {
      r.firstItem = arr[0];
      r.allFieldNames = Object.keys(arr[0]);
      console.log('field names (' + r.allFieldNames.length + '):', r.allFieldNames.join(', '));
      console.log('first item full:\n' + JSON.stringify(arr[0], null, 2));
    }
  } catch (e: any) {
    r.error = e.message;
    console.error('error:', e.message);
  }
  return r;
}

function verifyMappings(fields: string[]) {
  console.log('\n========== 14필드 매핑 자동 검증 ==========');
  for (const [logical, candidates] of Object.entries(ESTIMATED_MAPPINGS)) {
    const found = candidates.every(c => fields.includes(c));
    const mark = found ? '✓' : '❌';
    console.log(`${mark} ${logical} → ${candidates.join(', ')}`);
    if (!found) {
      const sim = fields.filter(f =>
        candidates.some(c => f.toLowerCase().includes(c.toLowerCase().slice(0, 4)))
      );
      if (sim.length) console.log('    유사 후보:', sim.join(', '));
    }
  }
}

function extractNewFields(fields: string[]) {
  console.log('\n========== 신규 필드 (14 매핑 외) ==========');
  const known = new Set<string>();
  Object.values(ESTIMATED_MAPPINGS).forEach(arr => arr.forEach(c => known.add(c)));
  const newOnes = fields.filter(f => !known.has(f));
  console.log(`신규 ${newOnes.length}건 (known set ${known.size}):`);
  newOnes.forEach(f => console.log('  - ' + f));
}

function variance(f1: string[], f2: string[] | undefined) {
  console.log('\n========== sub-sgg schema variance ==========');
  if (!f2 || f2.length === 0) { console.log('Call 2 응답 0건 — variance 검증 불가'); return; }
  const s1 = new Set(f1), s2 = new Set(f2);
  const only1 = f1.filter(f => !s2.has(f));
  const only2 = f2.filter(f => !s1.has(f));
  if (only1.length === 0 && only2.length === 0) console.log('✓ schema 완전 일치');
  else {
    console.log('⚠ variance 발견');
    if (only1.length) console.log('  Call 1에만:', only1.join(', '));
    if (only2.length) console.log('  Call 2에만:', only2.join(', '));
  }
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const results: CallResult[] = [];
  results.push(await probe('Call 1 — 강남구 개포동 (baseline + 매핑 검증)', '11680', '10300'));
  await new Promise(r => setTimeout(r, 1500));

  // 부천 sub-sgg fallback probe
  const SUB_SGGS = ['41192', '41194', '41196'];
  let matchedSub: string | null = null;
  for (const sub of SUB_SGGS) {
    const r = await probe(`Call 2 — 부천 ${sub} + bjdong ${bucheonBjdong}`, sub, bucheonBjdong);
    results.push(r);
    if (r.itemsCount > 0) { matchedSub = sub; break; }
    await new Promise(rs => setTimeout(rs, 1500));
  }
  console.log('\n부천 매칭 sub-sgg:', matchedSub || '없음 (3 sub 모두 0건)');

  if (results[0]?.allFieldNames) {
    verifyMappings(results[0].allFieldNames);
    extractNewFields(results[0].allFieldNames);
    const matched = results.slice(1).find(r => r.itemsCount > 0);
    variance(results[0].allFieldNames, matched?.allFieldNames);
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify({
    runAt: new Date().toISOString(),
    estimatedMappings: ESTIMATED_MAPPINGS,
    matchedSubSgg: matchedSub,
    results,
  }, null, 2));
  console.log('\n저장: ' + JSON_PATH);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
