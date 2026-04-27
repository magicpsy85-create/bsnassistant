import crypto from 'crypto';
import { firestore } from './firebase-admin';
import type { ContentContext } from './content-generator';

const COLLECTION = 'context_cache';
const TTL_MS = 30 * 60 * 1000; // 30분 (Firestore 읽기 지연 보정 — 인메모리 10분에서 늘림)

export function computeContentHash(parts: {
  input: string;
  template: 'A' | 'B' | 'C';
  region?: string;
  region1?: string;
  region2?: string;
  rankBy?: string;
}): string {
  const key = JSON.stringify({
    input: parts.input || '',
    template: parts.template,
    region: parts.region || '',
    region1: parts.region1 || '',
    region2: parts.region2 || '',
    rankBy: parts.rankBy || ''
  });
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
}

class FirestoreContextCache {
  async set(hash: string, ctx: ContentContext): Promise<void> {
    const tStart = Date.now();
    try {
      // Firestore는 undefined 값을 거부함 — JSON 직렬화로 undefined·function 제거
      const sanitized = JSON.parse(JSON.stringify(ctx));
      await firestore.collection(COLLECTION).doc(hash).set({
        ctx: sanitized,
        expiresAt: Date.now() + TTL_MS,
        createdAt: Date.now()
      });
      console.log(`[contextCache] set ${hash} (${Date.now() - tStart}ms)`);
    } catch (e: any) {
      console.error(`[contextCache] set 실패 ${hash}:`, e.message);
      // 캐시 실패는 치명적 아님 — 호출 측은 즉시 GPT 호출로 진행
    }
  }

  async get(hash: string): Promise<ContentContext | null> {
    const tStart = Date.now();
    try {
      const doc = await firestore.collection(COLLECTION).doc(hash).get();
      if (!doc.exists) {
        console.log(`[contextCache] miss ${hash} (${Date.now() - tStart}ms)`);
        return null;
      }
      const data = doc.data();
      if (!data || typeof data.expiresAt !== 'number' || data.expiresAt < Date.now()) {
        console.log(`[contextCache] miss ${hash} (expired, ${Date.now() - tStart}ms)`);
        doc.ref.delete().catch(() => {});
        return null;
      }
      console.log(`[contextCache] hit ${hash} (${Date.now() - tStart}ms)`);
      return data.ctx as ContentContext;
    } catch (e: any) {
      console.error(`[contextCache] get 실패 ${hash}:`, e.message);
      return null;
    }
  }
}

export const contextCache = new FirestoreContextCache();
