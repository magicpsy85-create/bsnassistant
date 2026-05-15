import * as fs from 'fs';
import * as path from 'path';

interface SggInfo {
  code: string;
  dongs: string[];
  bjdongCodes?: Record<string, string>;
  subSggCodes?: string[];
}
interface RegionCodes { [sido: string]: { [sgg: string]: SggInfo } }
interface BjdongMap {
  meta: any;
  sggMap: {
    [sigunguCd: string]: {
      sido: string;
      sigungu: string;
      bjdongCodes: Record<string, string>;
    };
  };
}

const REGION_PATH = path.join(process.cwd(), 'data', 'region_codes.json');
const MAP_PATH = path.join(process.cwd(), 'data', 'bjdong_map.min.json');
const BUCHEON_SUB_CODES = ['41192', '41194', '41196'];

const region: RegionCodes = JSON.parse(fs.readFileSync(REGION_PATH, 'utf-8'));
const map: BjdongMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));

const buchon = region['경기도']?.['부천시'];
if (!buchon) {
  console.error('FATAL: 경기도 부천시 BSN region에 없음');
  process.exit(1);
}

console.log('=== 부천시 현재 상태 ===');
console.log('  code:', buchon.code);
console.log('  dongs:', buchon.dongs?.length ?? 0, '개');
console.log('  bjdongCodes:', buchon.bjdongCodes ? Object.keys(buchon.bjdongCodes).length : 0, '개');
console.log('');

const merged: Record<string, string> = {};
const duplicates: Record<string, Array<{ subCode: string; bjdongCd: string }>> = {};

for (const subCode of BUCHEON_SUB_CODES) {
  const sub = map.sggMap[subCode];
  if (!sub) {
    console.error(`FATAL: 행안부 데이터에 ${subCode} 없음`);
    process.exit(1);
  }
  console.log(`  ${subCode} ${sub.sigungu}: ${Object.keys(sub.bjdongCodes).length}개 동`);
  for (const [name, bjcd] of Object.entries(sub.bjdongCodes)) {
    if (name in merged) {
      if (!(name in duplicates)) {
        duplicates[name] = [{ subCode: 'previous', bjdongCd: merged[name] }];
      }
      duplicates[name].push({ subCode, bjdongCd: bjcd });
    }
    merged[name] = bjcd;
  }
}

if (Object.keys(duplicates).length > 0) {
  console.log('\n⚠ 중복 동명 발견 (마지막 값 유지, SJ 검토 필요):');
  console.log(JSON.stringify(duplicates, null, 2));
} else {
  console.log('\n중복 동명: 0건 (안전)');
}

console.log(`\n합집합 unique 동명: ${Object.keys(merged).length}개`);

function koSort(a: string, b: string): number {
  return a.localeCompare(b, 'ko-KR');
}

const sortedDongs = Object.keys(merged).sort(koSort);

buchon.dongs = sortedDongs;
buchon.bjdongCodes = merged;
buchon.subSggCodes = BUCHEON_SUB_CODES;

fs.writeFileSync(REGION_PATH, JSON.stringify(region, null, 2) + '\n', 'utf-8');

console.log('\n=== 부천시 갱신 후 ===');
console.log('  code:', buchon.code);
console.log('  subSggCodes:', JSON.stringify(buchon.subSggCodes));
console.log(`  dongs (${buchon.dongs.length}개):`);
console.log(JSON.stringify(buchon.dongs, null, 2));
console.log('\n  bjdongCodes sample 5건:');
const sampleEntries: Record<string, string> = {};
for (const k of sortedDongs.slice(0, 5)) sampleEntries[k] = merged[k];
console.log(JSON.stringify(sampleEntries, null, 2));
