import { firestore } from './firebase-admin';

export interface BrandVoice {
  principles: string;
  companyInfo: string;
  cardRules: string;
  version: number;
  updatedAt: string;
  updatedBy?: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: BrandVoice | null = null;
let lastFetchedAt = 0;

export async function getBrandVoice(): Promise<BrandVoice> {
  const now = Date.now();

  if (cached && (now - lastFetchedAt) < CACHE_TTL_MS) {
    return cached;
  }

  const doc = await firestore.collection('brand_voice').doc('main').get();

  if (!doc.exists) {
    // init 스크립트 미실행 케이스 — 빈 값 fallback (콘텐츠 생성 차단 회피)
    console.warn('[brand-voice] doc not exists. Run init-brand-voice script first.');
    const empty: BrandVoice = {
      principles: '',
      companyInfo: '',
      cardRules: '',
      version: 0,
      updatedAt: new Date().toISOString(),
    };
    cached = empty;
    lastFetchedAt = now;
    return empty;
  }

  const data = doc.data() as BrandVoice;
  cached = data;
  lastFetchedAt = now;

  console.log(`[brand-voice] fetched v${data.version}`);

  return data;
}

export async function preloadBrandVoice(): Promise<void> {
  try {
    const data = await getBrandVoice();
    console.log(`[brand-voice] preload OK (version=${data.version})`);
  } catch (err) {
    console.error('[brand-voice] preload failed:', err);
  }
}
