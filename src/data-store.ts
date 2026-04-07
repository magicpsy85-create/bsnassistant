import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const RULE_DRAFTS_FILE = path.join(DATA_DIR, 'rule-drafts.json');

// ─── 타입 ───
export interface ChatRecord {
  id: string;
  userId: string;
  userName: string;
  question: string;
  answer: string;
  status: 'AI해결' | '직접 문의';
  timestamp: string; // ISO string
}

export interface RuleDraft {
  id: string;
  section: string;      // 규정 섹션명
  itemNumber: string;   // 항목 번호 (신규면 'new')
  action: '수정' | '추가' | '삭제' | '오류신고';
  content: string;      // 변경 내용
  reason: string;       // 변경 사유
  updatedBy?: string;   // 수정자
  timestamp: string;
  applied: boolean;
}

// ─── 헬퍼 ───
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON<T>(filePath: string, fallback: T): T {
  ensureDir();
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`파일 로드 오류 (${filePath}):`, e);
  }
  return fallback;
}

function saveJSON(filePath: string, data: any) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── 상담 기록 ───
export function getRecords(): ChatRecord[] {
  return loadJSON<ChatRecord[]>(RECORDS_FILE, []);
}

export function addRecord(record: ChatRecord) {
  const records = getRecords();
  records.push(record);
  saveJSON(RECORDS_FILE, records);
}

export function updateRecordStatus(id: string, status: 'AI해결' | '직접 문의') {
  const records = getRecords();
  const record = records.find(r => r.id === id);
  if (record) {
    record.status = status;
    saveJSON(RECORDS_FILE, records);
  }
}

// ─── 빈도 분석 ───
export function getTopQuestions(limit: number = 5): string[] {
  const records = getRecords();
  const freq: Record<string, number> = {};

  for (const r of records) {
    // 질문을 정규화 (공백 정리, 소문자)
    const normalized = r.question.trim().replace(/\s+/g, ' ');
    // 유사 질문 그룹핑: 앞 20자 기준
    const key = normalized.slice(0, 20);
    freq[key] = (freq[key] || 0) + 1;
  }

  // 빈도순 정렬 후 원본 질문 반환
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const topQuestions: string[] = [];

  for (const [key] of sorted) {
    if (topQuestions.length >= limit) break;
    // 해당 키에 매칭되는 가장 최근 질문 원문 사용
    const matching = records.filter(r => r.question.trim().replace(/\s+/g, ' ').slice(0, 20) === key);
    if (matching.length > 0) {
      topQuestions.push(matching[matching.length - 1].question.trim());
    }
  }

  return topQuestions;
}

// ─── 룰 초안 ───
export function getRuleDrafts(): RuleDraft[] {
  return loadJSON<RuleDraft[]>(RULE_DRAFTS_FILE, []);
}

export function addRuleDraft(draft: RuleDraft) {
  const drafts = getRuleDrafts();
  drafts.push(draft);
  saveJSON(RULE_DRAFTS_FILE, drafts);
}

export function deleteRuleDraft(id: string) {
  let drafts = getRuleDrafts();
  drafts = drafts.filter(d => d.id !== id);
  saveJSON(RULE_DRAFTS_FILE, drafts);
}

export function updateRuleDraft(id: string, updates: Partial<RuleDraft>) {
  const drafts = getRuleDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx !== -1) {
    Object.assign(drafts[idx], updates);
    saveJSON(RULE_DRAFTS_FILE, drafts);
    return true;
  }
  return false;
}

export function markDraftsApplied(ids: string[]) {
  const drafts = getRuleDrafts();
  for (const d of drafts) {
    if (ids.includes(d.id)) d.applied = true;
  }
  saveJSON(RULE_DRAFTS_FILE, drafts);
}

// ─── 멤버 관리 ───
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');

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
  note: string;
  role: '관리자' | '사용자';
}

export function getMembers(): Member[] {
  return loadJSON<Member[]>(MEMBERS_FILE, []);
}

export function saveMembers(members: Member[]) {
  saveJSON(MEMBERS_FILE, members);
}

export function addMember(member: Member) {
  const members = getMembers();
  members.push(member);
  saveJSON(MEMBERS_FILE, members);
}

export function updateMember(no: number, updates: Partial<Member>) {
  const members = getMembers();
  const idx = members.findIndex(m => m.no === no);
  if (idx !== -1) {
    Object.assign(members[idx], updates);
    if (updates.phone) {
      members[idx].phoneLast4 = updates.phone.replace(/[^0-9]/g, '').slice(-4);
    }
    saveJSON(MEMBERS_FILE, members);
  }
}

export function deleteMember(no: number) {
  let members = getMembers();
  members = members.filter(m => m.no !== no);
  saveJSON(MEMBERS_FILE, members);
}

// ─── 규정 파일 읽기/쓰기 ───
const RULES_PATH = path.join(__dirname, '..', 'docs', 'rule', '내부규정.md');

export function loadRulesFile(): string {
  try {
    return fs.readFileSync(RULES_PATH, 'utf-8');
  } catch {
    return '';
  }
}

export function saveRulesFile(content: string) {
  fs.writeFileSync(RULES_PATH, content, 'utf-8');
}
