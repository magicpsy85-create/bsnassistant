import * as fs from 'fs';
import * as path from 'path';

interface SggInfo {
  code: string;
  dongs: string[];
  bjdongCodes?: Record<string, string>;
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

console.log('읽기:', REGION_PATH);
console.log('읽기:', MAP_PATH);

const region: RegionCodes = JSON.parse(fs.readFileSync(REGION_PATH, 'utf-8'));
const map: BjdongMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
const sggMap = map.sggMap;

interface Stats {
  totalSido: number;
  totalSgg: number;
  mergedSgg: number;
  missingSgg: Array<{ sido: string; sgg: string; code: string }>;
  missingDongs: Array<{ sido: string; sgg: string; code: string; dong: string }>;
}

const stats: Stats = {
  totalSido: 0,
  totalSgg: 0,
  mergedSgg: 0,
  missingSgg: [],
  missingDongs: [],
};

for (const sidoName of Object.keys(region)) {
  stats.totalSido++;
  const sidoObj = region[sidoName];
  for (const sggName of Object.keys(sidoObj)) {
    stats.totalSgg++;
    const sgg = sidoObj[sggName];
    const code = sgg.code;
    const hb = sggMap[code];
    if (!hb) {
      stats.missingSgg.push({ sido: sidoName, sgg: sggName, code });
      continue;
    }
    // bjdongCodes 머지 (전국 풀 그대로)
    sgg.bjdongCodes = hb.bjdongCodes;
    stats.mergedSgg++;
    // BSN dongs vs 행안부 bjdongCodes 매칭 검증
    if (Array.isArray(sgg.dongs)) {
      for (const dong of sgg.dongs) {
        if (!(dong in hb.bjdongCodes)) {
          stats.missingDongs.push({ sido: sidoName, sgg: sggName, code, dong });
        }
      }
    }
  }
}

// region_codes.json 다시 쓰기 (indent 2 + 끝 newline)
fs.writeFileSync(REGION_PATH, JSON.stringify(region, null, 2) + '\n', 'utf-8');

console.log('\n=== 머지 결과 ===');
console.log(`시도 ${stats.totalSido}개`);
console.log(`sgg ${stats.totalSgg}개 (머지 ${stats.mergedSgg} / 미매칭 ${stats.missingSgg.length})`);
console.log(`BSN dongs 미매칭 ${stats.missingDongs.length}건`);

if (stats.missingSgg.length > 0) {
  console.log('\n--- sgg 미매칭 (BSN code가 행안부에 없음) ---');
  console.log(JSON.stringify(stats.missingSgg, null, 2));
}
if (stats.missingDongs.length > 0) {
  console.log('\n--- 동 미매칭 (BSN dongs 중 행안부에 없는 동) ---');
  console.log(JSON.stringify(stats.missingDongs, null, 2));
}

// 강남구(11680) 머지 sample 검증
console.log('\n=== 강남구(11680) bjdongCodes 머지 sample ===');
const gn = region['서울특별시']?.['강남구'];
if (gn) {
  console.log(JSON.stringify({
    code: gn.code,
    dongs: gn.dongs,
    bjdongCodes: gn.bjdongCodes,
  }, null, 2));
} else {
  console.log('  ❌ 강남구 lookup 실패');
}
