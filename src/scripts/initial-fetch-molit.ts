import {
  getTransactions,
  getLandTransactions,
  getSHTransactions,
  getAptTransactions,
} from '../molit-api';

const SLEEP_MS = 100;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// 서울 25개 자치구 LAWD_CD (5자리)
const SGG_CODES = [
  '11110', '11140', '11170', '11200', '11215',
  '11230', '11260', '11290', '11305', '11320',
  '11350', '11380', '11410', '11440', '11470',
  '11500', '11530', '11545', '11560', '11590',
  '11620', '11650', '11680', '11710', '11740',
];

function generateYms(months: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${yyyy}${mm}`);
  }
  return result;
}

const TARGET_YMS = generateYms(12);

async function fetchAllForType(
  typeName: string,
  fetcher: (sgg: string, ym: string) => Promise<any[]>
) {
  console.log(`\n[initial-fetch] === ${typeName} 시작 ===`);
  let totalCount = 0;
  let failCount = 0;

  for (const sgg of SGG_CODES) {
    for (const ym of TARGET_YMS) {
      try {
        const data = await fetcher(sgg, ym);
        totalCount += data.length;
        console.log(`  [${typeName}] ${sgg} ${ym}: ${data.length}건 (누적 ${totalCount})`);
      } catch (e: any) {
        failCount++;
        console.error(`  [${typeName}] ${sgg} ${ym} 실패: ${e.message}`);
      }
      await sleep(SLEEP_MS);
    }
  }

  console.log(`[initial-fetch] === ${typeName} 완료 (성공 ${totalCount}건, 실패 ${failCount}건) ===`);
}

async function main() {
  console.log('[initial-fetch] MOLIT 4종 사전 채움 시작 (sgg 25 × ym 12 × type 4 = 1,200 calls)');
  const startTime = Date.now();

  // 종목별 직렬 (호출 한도 회피)
  await fetchAllForType('commercial', getTransactions);
  await fetchAllForType('land', getLandTransactions);
  await fetchAllForType('sh', getSHTransactions);
  await fetchAllForType('apt', getAptTransactions);

  // permit은 A-3b-2 sub-track 진입 시점에 별도 실행

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n[initial-fetch] 전체 완료 (소요 ${elapsed}분)`);
  process.exit(0);
}

main().catch(err => {
  console.error('[initial-fetch] 치명적 오류:', err);
  process.exit(1);
});
