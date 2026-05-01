# BSN Assistant — API 문서

Base URL: `http://localhost:3000` (로컬) / `https://deploy-test1-24dc2.web.app` (배포)

---

## 인증

### POST /api/auth/verify
Google 로그인 토큰 검증 + 명단 이메일 매칭.
- **Body**: `{ idToken: string }`
- **성공 200**: `{ user: { uid, email, name, picture, role, memberNo, sessionId } }`
- **거부 403**: `{ error: "등록되지 않은 계정입니다", email }`
- **실패 401**: `{ error: "인증 실패" }`

### POST /api/auth/check-session
단일 세션 유효성 확인. 클라이언트에서 60초 폴링.
- **Body**: `{ email: string, sessionId: string }`
- **유효 200**: `{ valid: true }`
- **킥 401**: `{ kicked: true, error: "다른 기기에서 로그인되었습니다" }`

### GET /api/auth/config
Firebase 클라이언트 설정 반환.
- **응답**: `{ apiKey, authDomain, projectId, storageBucket }`

---

## 페이지

### GET /
실거래가 페이지로 redirect.
- **응답**: 302 → `/insta#transaction`
- **메모**: 챗봇 페이지는 `/chatbot` 라우트

### GET /chatbot
챗봇 페이지 HTML.
- **인증**: 없음 (페이지 진입은 클라이언트 사이드 Firebase Auth)
- **응답**: HTML (`generateChatbotPageHTML()`)

### GET /admin
관리자 페이지 HTML.

### GET /insta
콘텐츠 생성 + 실거래가 페이지 HTML.

---

## 사용자 설정

### GET /api/user/preset
로그인 사용자의 카드뉴스 채널 프리셋 조회.
- **인증**: `Authorization: Bearer <Firebase ID token>`
- **응답**: `{ success: true, preset: ChannelPreset }`
- **에러**:
  - 401: 토큰 없음 / `auth/*` 검증 실패
  - 403: 이메일 정보 없음 / 등록되지 않은 사용자
  - 500: Firestore 조회 실패
- **기본값**: `member.channelPreset` 부재 시 `DEFAULT_PRESET` (`{ selectedPreset: 'fast', customChannels: ['instagram'] }`)

### POST /api/user/preset
사용자 채널 프리셋 저장.
- **인증**: `Authorization: Bearer <Firebase ID token>`
- **Body**: `{ selectedPreset: PresetMode, customChannels: ChannelKey[] }`
- **응답**: `{ success: true, preset: ChannelPreset }`
- **에러**:
  - 400: `selectedPreset`이 VALID_PRESETS 외 / `customChannels` 비배열 또는 ALL_CHANNELS 외 값 포함
  - 401: 토큰 없음 / `auth/*` 검증 실패
  - 403: 이메일 정보 없음 / 등록되지 않은 사용자
  - 500: Firestore 저장 실패
- **부수효과**: `members.{doc}.channelPreset` 갱신 + `updatedAt` ISO 시각 기록

---

## 구성원 관리

### GET /api/members
전체 구성원 목록 조회.
- **응답**: `Member[]` (no순 정렬)

### POST /api/admin/members
구성원 추가.
- **Body**: `{ name, position, department, team?, phone, joinDate?, birthDate?, email?, role? }`
- **자동**: 직책이 대표/상무/이사/팀장이면 team = "{name}팀" 자동 생성
- **응답**: `{ success: true, member }`

### PUT /api/admin/members/:no
구성원 수정.
- **Body**: 수정할 필드 (Partial<Member>)
- **제한**: No.94 직책=사장, No.95 직책=부사장 고정
- **자동**: 직책이 대표/상무/이사/팀장으로 변경되면 team 자동 업데이트

### DELETE /api/admin/members/:no
구성원 삭제.
- **인증**: requireAdmin

---

## 가입 신청 관리

### GET /api/admin/access-requests
가입 신청 목록 조회 (`requestedAt desc`).
- **인증**: requireAdmin
- **응답**: `Array<{ id: string, email: string, googleName: string, picture: string, status: 'pending' | 'approved' | 'rejected', requestedAt: string, processedAt: string | null, processedBy: string | null }>`
- **에러**:
  - 401/403: 인증·관리자 권한 실패
  - 500: Firestore 조회 실패

### POST /api/admin/access-requests/:id/approve
가입 신청 승인 + members 콜렉션 신규 멤버 자동 추가.
- **인증**: requireAdmin
- **Path**: `:id` (가입 신청 문서 ID)
- **Body**: `{ name: string, position: string, department: string, phone: string, team?: string, joinDate?: string, role?: string, processedBy?: string }`
- **응답**: `{ success: true, member: Member }`
- **에러**:
  - 400: `name` / `position` / `department` / `phone` 누락
  - 401/403: 인증·관리자 권한 실패
  - 404: 가입 신청 문서 미존재
  - 500: Firestore 실패
- **부수효과**:
  - `members` 콜렉션에 신규 추가 (`no = max+1`, 자동 팀 생성 규칙: 직책이 대표/상무/이사/팀장이면 `{name}팀`)
  - `access_requests.{id}.status: 'approved'` + `processedAt`, `processedBy` 기록

### POST /api/admin/access-requests/:id/reject
가입 신청 거부.
- **인증**: requireAdmin
- **Path**: `:id`
- **Body**: `{ processedBy?: string }`
- **응답**: `{ success: true }`
- **에러**:
  - 401/403: 인증·관리자 권한 실패
  - 500: Firestore 실패
- **부수효과**: `access_requests.{id}.status: 'rejected'` + `processedAt`, `processedBy` 기록

### DELETE /api/admin/access-requests/:id
가입 신청 데이터 영구 삭제.
- **인증**: requireAdmin
- **Path**: `:id`
- **응답**: `{ success: true }`
- **에러**:
  - 401/403: 인증·관리자 권한 실패
  - 500: Firestore 실패

---

## 챗봇

### POST /api/chatbot
챗봇 질의.
- **Body**: `{ message: string, userId?: string, userName?: string }`
- **응답**: `{ reply: string, recordId: string, status: "AI해결" | "직접 문의" }`
- **자동**: 상담 기록 Firestore에 저장, 답변 키워드 기반 상태 판단

### GET /api/chatbot/top-questions
빈도 기반 추천 질문 5개.
- **응답**: `{ questions: string[] }`

---

## 상담 기록

### GET /api/admin/records
상담 기록 조회.
- **Query**: `userId?` (특정 사용자 필터)
- **응답**: `ChatRecord[]` (시간 역순)

### PUT /api/admin/records/:id/status
상담 상태 변경.
- **Body**: `{ status: "AI해결" | "직접 문의" | "오류" }`

### PUT /api/admin/records/:id/report-error
오류 신고. 기존 레코드 상태를 "오류"로 업데이트.
- **Body**: `{ errorNote: string }`
- **동작**: status → "오류", answer에 "[오류 신고] {errorNote}" 추가

---

## 규정 관리

### GET /api/admin/rules
규정 원문 조회.
- **응답**: `{ content: string }`

### POST /api/admin/rules/update
규정 원문 저장.
- **Body**: `{ content: string }`

### POST /api/admin/rules/section
섹션 추가.
- **Body**: `{ sectionName: string }`

### DELETE /api/admin/rules/section/:sectionName
섹션 삭제.

### GET /api/admin/drafts
변경 이력 조회.
- **응답**: `RuleDraft[]`

### POST /api/admin/drafts
변경 이력 추가.
- **Body**: `{ section, itemNumber?, action, content, reason, updatedBy? }`

### PUT /api/admin/drafts/:id
변경 이력 수정.
- **Body**: Partial<RuleDraft>

### DELETE /api/admin/drafts/:id
변경 이력 삭제.

### POST /api/admin/drafts/apply
변경 이력 일괄 적용.

---

## 콘텐츠 생성

### POST /api/content/generate
5채널 SNS 콘텐츠 자동 생성.
- **인증**: 없음
- **Body**: `{ input: string, mode?: "text" | "url", channels?: ChannelKey[] }`
- **응답**: `{ result: ContentResult, contentHash: string }` (insta, short, youtube, threads, blog 중 요청 channels만)
- **파이프라인**: A단계(분석) → B단계(리서치: 네이버+국토부+Brave) → C단계(GPT-5 생성)
- **부수효과**: `contextCache.set(contentHash, ctx)` (TTL 10분, B-1b 후속 단일 채널 호출용)

### POST /api/content/generate-channel
단일 채널 카드뉴스 생성 (B-1b contextCache 기반 lazy 호출).
- **인증**: 없음
- **Body**: `{ channel: ChannelKey, contentHash: string }`
- **응답**: `{ success: true, result: ChannelContent }`
- **타임아웃**: 180초 (`req/res.setTimeout`)
- **에러**:
  - 400: `channel`이 ALL_CHANNELS 외 / `contentHash` 누락
  - 410: `CONTEXT_CACHE_MISS` (10분 TTL 초과 — 프론트는 `/api/content/generate` 재호출로 fallback)
  - 500: GPT 호출 실패

### POST /api/content/regenerate-card
카드뉴스 단일 카드 재생성.
- **인증**: 없음
- **Body**:
  ```
  {
    cardIndex: 0 | 1 | 2 | 3 | 4 | 5,    // 7장 제외
    template: 'A' | 'B' | 'C',
    topic: string,
    previousCards: Card[],
    previousContent?: string,
    region?: string, region1?: string, region2?: string, rankBy?: string
  }
  ```
- **응답**: `{ success: true, card: Card }`
- **타임아웃**: 180초
- **에러**:
  - 400: `cardIndex` 범위 외 / `template` 값 외 / `previousCards` 비배열
  - 500: GPT 호출 또는 region stats 실패

### GET /api/content/recommend-news
AI 뉴스 추천 (네이버 뉴스 + 학습 키워드 기반).
- **응답**: `{ articles: { title, description, link }[] }`

---

## 학습 데이터

### GET /api/learn/articles
학습된 기사 목록.

### POST /api/learn/add
기사 URL로 학습 추가.
- **Body**: `{ url: string }`

### POST /api/learn/upload-pdf
PDF 파일 업로드 학습.
- **Form**: multipart/form-data, field "pdf"

### DELETE /api/learn/articles/:id
학습 기사 삭제.

### GET /api/learn/corrupted
잘못 분류된 학습 데이터 조회 (PDF URL 분류오류 + summary 키워드 필터).
- **인증**: 없음
- **응답**: `{ corrupted: Article[], total: number, corruptedCount: number }`
- **에러**: 500 — `data/learned_articles.json` 읽기 실패
- **로직**: `data/learned_articles.json` read → `(isPdfUrl && sourceType === 'url') || summary 키워드 매칭` 필터

### DELETE /api/learn/corrupted
corrupted 항목 일괄 제거 후 `learned_articles.json` 재기록.
- **인증**: 없음
- **응답**: `{ removed: number, remaining: number }`
- **에러**: 500 — 파일 read/write 실패
- **부수효과**: `data/learned_articles.json` 갱신

---

## 실거래가

### GET /api/regions
시/도/구/동 코드 매핑 데이터.
- **응답**: `{ "서울특별시": { "강남구": { code: "11680", dongs: [...] }, ... }, ... }`

### GET /api/transaction/ranking
실거래가 랭킹.
- **Query**:
  - `sido`: "전국" | "서울특별시" | ... (기본값: "전국")
  - `sgg?`: 특정 구 선택 시 동별 랭킹
  - `months`: 3 | 6 | 12 (기본값: 6)
  - `startMonth?`, `endMonth?`: 직접 설정 (예: "202601", "202604")
  - `sortBy`: "totalCount" | "avgPrice" | "avgPricePerPyeong" | "avgPricePerArea"
- **응답 (전국)**: `{ type: "sido", ranking: [{ name, stats }] }`
- **응답 (시/도)**: `{ type: "sgg", ranking: [{ name, sggCd, stats, transactions }] }`
- **응답 (구)**: `{ type: "dong", sgg, fullStats, ranking: [{ name, stats, transactions }] }`
- **stats 구조**:
  ```
  {
    totalCount, cancelCount, avgPrice, avgPricePerPyeong, avgPricePerArea,
    prevPeriodChange: { volume, price, avgPrice, area, hasPrev },
    buyer: { corp: { count, ratio }, personal: { count, ratio } },
    seller: { corp: { count, ratio }, personal: { count, ratio } },
    byDong, byUse, byMonth, byBuildYear, byLandUse,
    highest, lowest, isCurrentMonthIncluded
  }
  ```

### GET /api/transaction/query
실거래가 상세 조회 (기존 방식).
- **Query**: `regions` (쉼표 구분 코드), `months`, `startMonth?`, `endMonth?`, `dong?`
- **응답**: `{ results: [{ sggCd, sggNm, dongFilter, transactions, stats }] }`

### POST /api/transaction/insight
AI 분석 (Brave Search 보강).
- **Body**: `{ regions: [{ sggNm, stats }] }`
- **응답**: `{ insight: string }`
- **서식**: ①~⑤ 포인트 + → 원인 분석, 마지막은 향후 전망

### POST /api/transaction/report
리포트 생성 (Brave Search 보강).
- **Body**: `{ regions: [{ sggNm, stats, recentTx? }] }`
- **응답**: `{ report: string }`
- **구성**: 시장개요 → 변동원인 → 핵심트렌드 → 주목할거래 → 향후전망

### GET /api/transaction/test
실거래가 캐시 조회 테스트 도구 (단일 sgg + 월 → SQLite cache 확인).
- **인증**: 없음
- **Query**: `{ sggCd: string, dealYm: string }`
- **응답**: `{ sggCd, dealYm, count, sample: Transaction[3], fromDB: true }`
- **에러**:
  - 400: `sggCd` 또는 `dealYm` 누락
  - 500: SQLite 조회 실패

### GET /api/transaction/debug
국토부 API 원본 응답과 SQLite 저장 데이터 비교 디버그.
- **인증**: 없음
- **Query**: `{ sggCd: string, dealYm: string }`
- **응답**:
  ```
  {
    api: { totalCount, itemCount, buildingTypeBreakdown, umdBreakdown, cancelCount, items: Transaction[] },
    db: { itemCount, umdBreakdown, cancelCount, items: Transaction[] },
    log: FetchLog | null
  }
  ```
- **에러**:
  - 400: `sggCd` 또는 `dealYm` 누락
  - 500: API 호출 또는 DB 조회 실패

---

## 데이터 타입

### Member
```typescript
{
  no: number;
  name: string;
  position: string;
  department: string;   // 빌딩 | PENT | CARE | 경영
  team: string;
  phone: string;
  phoneLast4: string;
  joinDate: string;
  birthDate: string;
  email: string;
  role: '관리자' | '사용자';
  lastLoginAt?: string;
  sessionId?: string;
}
```

### ChatRecord
```typescript
{
  id: string;
  userId: string;
  userName: string;
  question: string;
  answer: string;
  status: 'AI해결' | '직접 문의' | '오류';
  timestamp: string;
}
```

### RuleDraft
```typescript
{
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
```

### ChannelKey / PresetMode / ChannelPreset
```typescript
type ChannelKey = 'instagram' | 'shortform' | 'youtube' | 'thread' | 'blog';
type PresetMode = 'fast' | 'sns' | 'all' | 'custom';

interface ChannelPreset {
  selectedPreset: PresetMode;
  customChannels: ChannelKey[];
  updatedAt: string;   // ISO 8601
}
```
- **PresetMode 매핑** (`PRESET_TO_CHANNELS`):
  - `fast` → `['instagram']`
  - `sns` → `['instagram', 'shortform', 'thread']`
  - `all` → `['instagram', 'shortform', 'youtube', 'thread', 'blog']`
  - `custom` → `customChannels` 사용 (`instagram` 강제 포함)
- **DEFAULT_PRESET**: `{ selectedPreset: 'fast', customChannels: ['instagram'], updatedAt: '1970-01-01T00:00:00.000Z' }`
