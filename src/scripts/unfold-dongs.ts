import * as fs from 'fs';
import * as path from 'path';

interface SggInfo {
  code: string;
  dongs: string[];
  bjdongCodes?: Record<string, string>;
}
interface RegionCodes { [sido: string]: { [sgg: string]: SggInfo } }

const REGION_PATH = path.join(process.cwd(), 'data', 'region_codes.json');

const region: RegionCodes = JSON.parse(fs.readFileSync(REGION_PATH, 'utf-8'));

interface UnfoldStats {
  totalSido: number;
  totalSgg: number;
  sggSkipped: Array<{ sido: string; sgg: string; reason: string }>;
  unfoldedSgg: Array<{
    sido: string;
    sgg: string;
    code: string;
    replacements: Array<{ from: string; to: string[] }>;
  }>;
  missingDongs: Array<{ sido: string; sgg: string; code: string; dong: string }>;
  totalDongsBefore: number;
  totalDongsAfter: number;
}

const stats: UnfoldStats = {
  totalSido: 0,
  totalSgg: 0,
  sggSkipped: [],
  unfoldedSgg: [],
  missingDongs: [],
  totalDongsBefore: 0,
  totalDongsAfter: 0,
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function koSort(a: string, b: string): number {
  return a.localeCompare(b, 'ko-KR');
}

for (const sidoName of Object.keys(region)) {
  stats.totalSido++;
  const sidoObj = region[sidoName];
  for (const sggName of Object.keys(sidoObj)) {
    stats.totalSgg++;
    const sgg = sidoObj[sggName];

    if (!Array.isArray(sgg.dongs)) continue;
    stats.totalDongsBefore += sgg.dongs.length;

    if (!sgg.bjdongCodes || Object.keys(sgg.bjdongCodes).length === 0) {
      stats.sggSkipped.push({
        sido: sidoName, sgg: sggName,
        reason: 'no bjdongCodes (Stage A 미매칭 sgg)',
      });
      stats.totalDongsAfter += sgg.dongs.length;
      continue;
    }

    const bjKeys = Object.keys(sgg.bjdongCodes);
    const newDongs: string[] = [];
    const replacements: Array<{ from: string; to: string[] }> = [];

    for (const dong of sgg.dongs) {
      const escaped = escapeRegex(dong);
      const re = new RegExp(`^${escaped}[1-9]가$`);
      const matches = bjKeys.filter(k => re.test(k));

      if (matches.length >= 2) {
        replacements.push({ from: dong, to: matches });
        newDongs.push(...matches);
      } else {
        newDongs.push(dong);
        if (!(dong in sgg.bjdongCodes)) {
          stats.missingDongs.push({
            sido: sidoName, sgg: sggName, code: sgg.code, dong,
          });
        }
      }
    }

    const finalDongs = Array.from(new Set(newDongs)).sort(koSort);

    if (replacements.length > 0) {
      sgg.dongs = finalDongs;
      stats.unfoldedSgg.push({
        sido: sidoName,
        sgg: sggName,
        code: sgg.code,
        replacements,
      });
    } else if (finalDongs.length !== sgg.dongs.length) {
      sgg.dongs = finalDongs;
    }
    stats.totalDongsAfter += sgg.dongs.length;
  }
}

fs.writeFileSync(REGION_PATH, JSON.stringify(region, null, 2) + '\n', 'utf-8');

console.log('\n=== Stage A-2 자동 치환 결과 ===');
console.log(`시도 ${stats.totalSido}개 / sgg ${stats.totalSgg}개`);
console.log(`치환 발생 sgg: ${stats.unfoldedSgg.length}`);
console.log(`총 치환 케이스: ${stats.unfoldedSgg.reduce((s, x) => s + x.replacements.length, 0)}`);
console.log(`skip된 sgg (bjdongCodes 없음): ${stats.sggSkipped.length}`);
console.log(`잔여 미매칭 dongs: ${stats.missingDongs.length}`);
console.log(`dongs 총 갯수 변화: ${stats.totalDongsBefore} -> ${stats.totalDongsAfter}`);

if (stats.sggSkipped.length > 0) {
  console.log('\n--- skip sgg ---');
  console.log(JSON.stringify(stats.sggSkipped, null, 2));
}

if (stats.unfoldedSgg.length > 0) {
  console.log('\n--- 치환 발생 sgg 요약 (sgg / 통합명->세분화 갯수) ---');
  stats.unfoldedSgg.forEach(u => {
    const summary = u.replacements.map(r => `${r.from}->${r.to.length}`).join(', ');
    console.log(`  ${u.sido} ${u.sgg}(${u.code}): ${summary}`);
  });
}

if (stats.missingDongs.length > 0 && stats.missingDongs.length <= 20) {
  console.log('\n--- 잔여 미매칭 dongs (신축/오타 의심, SJ 수동 검토) ---');
  console.log(JSON.stringify(stats.missingDongs, null, 2));
} else if (stats.missingDongs.length > 20) {
  console.log(`\n--- 잔여 미매칭 dongs (처음 20건) ---`);
  console.log(JSON.stringify(stats.missingDongs.slice(0, 20), null, 2));
  console.log(`...외 ${stats.missingDongs.length - 20}건`);
}

// sample 5개 sgg 출력 — 변화 패턴 검증
const samples: Array<[string, string, string]> = [
  ['서울특별시', '성동구', '11200'],   // 금호동/성수동 분리
  ['서울특별시', '중구',   '11140'],   // 충정로/회현동/장충동/필동 등 다수
  ['서울특별시', '종로구', '11110'],   // 종로1~6가
  ['서울특별시', '용산구', '11170'],   // 한강로1~3가, 용산동2/3/5가
  ['서울특별시', '강남구', '11680'],   // 변화 0 기대 (안전 sanity check)
];

for (const [sido, sgg, code] of samples) {
  const s = region[sido]?.[sgg];
  if (s) {
    console.log(`\n=== ${sido} ${sgg}(${code}) 치환 후 dongs (${s.dongs.length}개) ===`);
    console.log(JSON.stringify(s.dongs, null, 2));
  }
}
