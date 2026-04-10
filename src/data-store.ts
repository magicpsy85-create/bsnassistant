import { firestore } from './firebase-admin';

// ─── 타입 ───
export interface ChatRecord {
  id: string;
  userId: string;
  userName: string;
  question: string;
  answer: string;
  status: 'AI해결' | '직접 문의' | '오류';
  timestamp: string;
}

export interface RuleDraft {
  id: string;
  section: string;
  itemNumber: string;
  action: '수정' | '추가' | '삭제' | '오류신고';
  content: string;
  reason: string;
  updatedBy?: string;
  timestamp: string;
  applied: boolean;
}

export interface Member {
  no: number;
  name: string;
  position: string;
  department: string;
  team: string;
  phone: string;
  phoneLast4: string;
  joinDate: string;
  birthDate: string;
  email: string;
  note?: string;
  role: '관리자' | '사용자';
  lastLoginAt?: string;
  sessionId?: string;
}

// ─── 상담 기록 ───
export async function getRecords(): Promise<ChatRecord[]> {
  const snap = await firestore.collection('records').get();
  const records = snap.docs.map(d => d.data() as ChatRecord);
  return records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function addRecord(record: ChatRecord) {
  await firestore.collection('records').doc(record.id).set(record);
}

export async function updateRecordStatus(id: string, status: 'AI해결' | '직접 문의' | '오류') {
  await firestore.collection('records').doc(id).update({ status });
}

// ─── 빈도 분석 ───
export async function getTopQuestions(limit: number = 5): Promise<string[]> {
  const records = await getRecords();
  const freq: Record<string, number> = {};
  for (const r of records) {
    const normalized = r.question.trim().replace(/\s+/g, ' ');
    const key = normalized.slice(0, 20);
    freq[key] = (freq[key] || 0) + 1;
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const topQuestions: string[] = [];
  for (const [key] of sorted) {
    if (topQuestions.length >= limit) break;
    const matching = records.filter(r => r.question.trim().replace(/\s+/g, ' ').slice(0, 20) === key);
    if (matching.length > 0) topQuestions.push(matching[matching.length - 1].question.trim());
  }
  return topQuestions;
}

// ─── 룰 초안 ───
export async function getRuleDrafts(): Promise<RuleDraft[]> {
  const snap = await firestore.collection('rule_drafts').get();
  const drafts = snap.docs.map(d => d.data() as RuleDraft);
  return drafts.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function addRuleDraft(draft: RuleDraft) {
  await firestore.collection('rule_drafts').doc(draft.id).set(draft);
}

export async function deleteRuleDraft(id: string) {
  await firestore.collection('rule_drafts').doc(id).delete();
}

export async function updateRuleDraft(id: string, updates: Partial<RuleDraft>) {
  await firestore.collection('rule_drafts').doc(id).update(updates);
  return true;
}

export async function markDraftsApplied(ids: string[]) {
  const batch = firestore.batch();
  for (const id of ids) {
    batch.update(firestore.collection('rule_drafts').doc(id), { applied: true });
  }
  await batch.commit();
}

// ─── 멤버 관리 ───
export async function getMembers(): Promise<Member[]> {
  const snap = await firestore.collection('members').get();
  const members = snap.docs.map(d => d.data() as Member);
  return members.sort((a, b) => (a.no || 0) - (b.no || 0));
}

export async function saveMembers(members: Member[]) {
  // 기존 전체 삭제 후 재저장
  const existing = await firestore.collection('members').get();
  const delBatch = firestore.batch();
  existing.docs.forEach(d => delBatch.delete(d.ref));
  await delBatch.commit();

  for (let i = 0; i < members.length; i += 400) {
    const chunk = members.slice(i, i + 400);
    const batch = firestore.batch();
    for (const m of chunk) {
      batch.set(firestore.collection('members').doc(`member_${m.no}`), m);
    }
    await batch.commit();
  }
}

export async function addMember(member: Member) {
  await firestore.collection('members').doc(`member_${member.no}`).set(member);
}

export async function updateMember(no: number, updates: Partial<Member>) {
  const ref = firestore.collection('members').doc(`member_${no}`);
  const doc = await ref.get();
  if (doc.exists) {
    if (updates.phone) {
      (updates as any).phoneLast4 = updates.phone.replace(/[^0-9]/g, '').slice(-4);
    }
    await ref.update(updates);
  }
}

export async function deleteMember(no: number) {
  await firestore.collection('members').doc(`member_${no}`).delete();
}

// ─── 규정 파일 읽기/쓰기 ───
export async function loadRulesFile(): Promise<string> {
  const doc = await firestore.collection('meta').doc('rules').get();
  return doc.exists ? (doc.data()!.content || '') : '';
}

export async function saveRulesFile(content: string) {
  await firestore.collection('meta').doc('rules').set({
    content,
    updatedAt: new Date().toISOString()
  });
}
