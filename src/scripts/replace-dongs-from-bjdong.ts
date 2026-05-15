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

interface ReplaceStats {
  totalSido: number;
  totalSgg: number;
  emptySgg: Array<{ sido: string; sgg: string; code: string; previousDongCount: number }>;
  changedSgg: Array<{
    sido: string;
    sgg: string;
    code: string;
    before: number;
    after: number;
    added: string[];
    removed: string[];
  }>;
  unchangedSgg: number;
  totalDongsBefore: number;
  totalDongsAfter: number;
}

const stats: ReplaceStats = {
  totalSido: 0, totalSgg: 0,
  emptySgg: [], changedSgg: [],
  unchangedSgg: 0,
  totalDongsBefore: 0, totalDongsAfter: 0,
};

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
    const oldDongs = [...sgg.dongs];
    stats.totalDongsBefore += oldDongs.length;

    if (!sgg.bjdongCodes || Object.keys(sgg.bjdongCodes).length === 0) {
      // bjdongCodes 비어있는 sgg (부천시 등): dongs 빈 배열 + 별도 보고
      sgg.dongs = [];
      stats.emptySgg.push({
        sido: sidoName,
        sgg: sggName,
        code: sgg.code,
        previousDongCount: oldDongs.length,
      });
      continue;
    }

    // 행안부 키 전체 가나다 정렬
    const newDongs = Object.keys(sgg.bjdongCodes).sort(koSort);
    sgg.dongs = newDongs;
    stats.totalDongsAfter += newDongs.length;

    // 변화 추적
    const oldSet = new Set(oldDongs);
    const newSet = new Set(newDongs);
    const added = newDongs.filter(d => !oldSet.has(d));
    const removed = oldDongs.filter(d => !newSet.has(d));

    if (added.length > 0 || removed.length > 0) {
      stats.changedSgg.push({
        sido: sidoName, sgg: sggName, code: sgg.code,
        before: oldDongs.length, after: newDongs.length,
        added, removed,
      });
    } else {
      stats.unchangedSgg++;
    }
  }
}

fs.writeFileSync(REGION_PATH, JSON.stringify(region, null, 2) + '\n', 'utf-8');

console.log('\n=== Stage A-4 dongs 행안부 전수 교체 결과 ===');
console.log(`시도 ${stats.totalSido}개 / sgg ${stats.totalSgg}개`);
console.log(`변화 없는 sgg: ${stats.unchangedSgg}`);
console.log(`변화 발생 sgg: ${stats.changedSgg.length}`);
console.log(`빈 dongs sgg (bjdongCodes 없음, 후속 트랙): ${stats.emptySgg.length}`);
console.log(`dongs 총 갯수: ${stats.totalDongsBefore} -> ${stats.totalDongsAfter}`);

if (stats.emptySgg.length > 0) {
  console.log('\n--- ⚠ 빈 dongs sgg (사용자 dropdown 빈 상태) ---');
  console.log(JSON.stringify(stats.emptySgg, null, 2));
}

if (stats.changedSgg.length > 0) {
  // 변화 큰 sgg 상위 20개만 요약
  const topChanged = [...stats.changedSgg]
    .sort((a, b) => (b.added.length + b.removed.length) - (a.added.length + a.removed.length))
    .slice(0, 20);
  console.log('\n--- 변화 큰 sgg 상위 20개 (sgg: before -> after, +added/-removed) ---');
  topChanged.forEach(c => {
    console.log(`  ${c.sido} ${c.sgg}(${c.code}): ${c.before} -> ${c.after}, +${c.added.length} / -${c.removed.length}`);
  });
  console.log(`\n(전체 변화 sgg: ${stats.changedSgg.length}개)`);
}

// sample sgg 출력
const samples: Array<[string, string]> = [
  ['서울특별시', '강남구'],
  ['서울특별시', '성동구'],
  ['서울특별시', '중구'],
  ['서울특별시', '종로구'],
];
for (const [sido, sgg] of samples) {
  const s = region[sido]?.[sgg];
  if (s) {
    console.log(`\n=== ${sido} ${sgg} 교체 후 dongs (${s.dongs.length}개) ===`);
    console.log(JSON.stringify(s.dongs, null, 2));
  }
}
