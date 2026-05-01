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
챗봇 페이지 HTML.

### GET /admin
관리자 페이지 HTML.

### GET /insta
콘텐츠 생성 + 실거래가 페이지 HTML.

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
- **Body**: `{ input: string, mode?: "text" | "url" }`
- **응답**: `{ result: ContentResult }` (insta, short, youtube, threads, blog)
- **파이프라인**: A단계(분석) → B단계(리서치: 네이버+국토부+Brave) → C단계(GPT-5 생성)

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
