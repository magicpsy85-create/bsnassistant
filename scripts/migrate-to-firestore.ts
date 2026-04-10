/**
 * 기존 JSON 파일 데이터를 Firestore로 마이그레이션
 * 실행: npx ts-node scripts/migrate-to-firestore.ts
 */
import '../src/firebase-admin';
import { firestore } from '../src/firebase-admin';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '..', 'data');

async function migrateRecords() {
  const filePath = path.join(dataDir, 'records.json');
  if (!fs.existsSync(filePath)) { console.log('[records] 파일 없음, 스킵'); return; }
  const records = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`[records] ${records.length}건 마이그레이션 시작...`);

  const batch = firestore.batch();
  for (const r of records) {
    const id = r.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    batch.set(firestore.collection('records').doc(id), r);
  }
  await batch.commit();
  console.log(`[records] ${records.length}건 완료`);
}

async function migrateMembers() {
  const filePath = path.join(dataDir, 'members.json');
  if (!fs.existsSync(filePath)) { console.log('[members] 파일 없음, 스킵'); return; }
  const members = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`[members] ${members.length}건 마이그레이션 시작...`);

  // Firestore batch는 500개 제한
  for (let i = 0; i < members.length; i += 400) {
    const chunk = members.slice(i, i + 400);
    const batch = firestore.batch();
    for (const m of chunk) {
      const id = m.no ? `member_${m.no}` : `mem_${i}_${Math.random().toString(36).substr(2, 6)}`;
      batch.set(firestore.collection('members').doc(id), m);
    }
    await batch.commit();
    console.log(`  [members] ${Math.min(i + 400, members.length)}/${members.length} 완료`);
  }
  console.log(`[members] ${members.length}건 완료`);
}

async function migrateArticles() {
  const filePath = path.join(dataDir, 'learned_articles.json');
  if (!fs.existsSync(filePath)) { console.log('[articles] 파일 없음, 스킵'); return; }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const articles = data.articles || [];
  console.log(`[articles] ${articles.length}건 마이그레이션 시작...`);

  for (let i = 0; i < articles.length; i += 400) {
    const chunk = articles.slice(i, i + 400);
    const batch = firestore.batch();
    for (const a of chunk) {
      const id = a.id || `art_${i}_${Math.random().toString(36).substr(2, 6)}`;
      batch.set(firestore.collection('learned_articles').doc(id), a);
    }
    await batch.commit();
    console.log(`  [articles] ${Math.min(i + 400, articles.length)}/${articles.length} 완료`);
  }
  // lastUpdated 메타 저장
  await firestore.collection('meta').doc('learned_articles').set({
    lastUpdated: data.lastUpdated || new Date().toISOString(),
    count: articles.length
  });
  console.log(`[articles] ${articles.length}건 완료`);
}

async function migrateDrafts() {
  const filePath = path.join(dataDir, 'rule-drafts.json');
  if (!fs.existsSync(filePath)) { console.log('[drafts] 파일 없음, 스킵'); return; }
  const drafts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`[drafts] ${drafts.length}건 마이그레이션 시작...`);

  const batch = firestore.batch();
  for (const d of drafts) {
    const id = d.id || `draft_${Math.random().toString(36).substr(2, 6)}`;
    batch.set(firestore.collection('rule_drafts').doc(id), d);
  }
  await batch.commit();
  console.log(`[drafts] ${drafts.length}건 완료`);
}

async function migrateRules() {
  // 내부규정 파일도 Firestore에 저장
  const filePath = path.join(__dirname, '..', 'docs', 'rule', '내부규정.md');
  if (!fs.existsSync(filePath)) { console.log('[rules] 파일 없음, 스킵'); return; }
  const content = fs.readFileSync(filePath, 'utf-8');
  await firestore.collection('meta').doc('rules').set({
    content,
    updatedAt: new Date().toISOString()
  });
  console.log('[rules] 내부규정.md 마이그레이션 완료');
}

async function main() {
  console.log('=== Firestore 마이그레이션 시작 ===\n');
  await migrateRecords();
  await migrateMembers();
  await migrateArticles();
  await migrateDrafts();
  await migrateRules();
  console.log('\n=== 마이그레이션 완료 ===');
  process.exit(0);
}

main().catch(e => { console.error('마이그레이션 오류:', e); process.exit(1); });
