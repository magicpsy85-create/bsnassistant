# CLAUDE.md — BSN Assistant 프로젝트 가이드

## 프로젝트 개요
BSN빌사남부동산중개법인의 내부 업무 도구. 상업용 빌딩 매매 중개 업무를 지원하는 웹 애플리케이션.

## 기술 스택
- **런타임**: Node.js 22, TypeScript
- **서버**: Express.js, PM2 (로컬), Firebase Cloud Functions (배포)
- **데이터**: Firebase Firestore (구성원, 상담기록, 규정), SQLite (실거래 캐시)
- **인증**: Firebase Auth (Google 로그인), 명단 이메일 매칭
- **AI**: OpenAI GPT-5 (콘텐츠 생성), GPT-4o (챗봇, AI분석)
- **검색**: Brave Search API, 네이버 뉴스 API
- **호스팅**: Firebase Hosting + Cloud Functions

## 프로젝트 구조
```
C:\Users\magic\Documents\bsnassistant\
├── src/
│   ├── index.ts          # Express 앱, 모든 API 엔드포인트
│   ├── pages/
│   │   ├── chatbot-page.ts    # 챗봇 (HTML+CSS+JS 인라인)
│   │   ├── insta-page.ts      # 콘텐츠 생성 + 실거래가 (HTML+CSS+JS 인라인)
│   │   └── admin-page.ts      # 관리자 (HTML+CSS+JS 인라인)
│   ├── chatbot.ts         # 챗봇 GPT 로직
│   ├── content-generator.ts   # 콘텐츠 생성 파이프라인 (A→B→C 단계)
│   ├── molit-api.ts       # 국토교통부 실거래가 API + SQLite 캐시
│   ├── data-store.ts      # Firestore CRUD (회원, 기록, 규정)
│   ├── firebase-admin.ts  # Firebase Admin SDK 초기화
│   ├── db.ts              # SQLite 초기화
│   ├── learn-store.ts     # 학습 데이터 관리
│   └── functions.ts       # Cloud Functions 엔트리포인트
├── data/
│   ├── members.json       # 구성원 명단 (로컬 백업)
│   ├── region_codes.json  # 시/도/구/동 코드 매핑
│   └── transactions.db    # 실거래 캐시 SQLite
├── docs/rule/             # 내부규정 마크다운
├── firebase.json          # Firebase 설정
├── firestore.rules        # Firestore 보안 규칙
├── DESIGN.md              # 디자인 시스템
└── package.json
```

## 페이지 구조
모든 페이지는 TypeScript 파일에서 HTML 문자열을 생성하는 방식 (SPA 아님, SSR).
각 파일은 `export function generate*PageHTML()` 형태.

### 4개 페이지
1. **챗봇** (`/`) — 내부규정 질의응답
2. **콘텐츠 생성** (`/insta`) — 5채널 SNS 콘텐츠 자동 생성
3. **실거래가** (`/insta#transaction`) — 실거래 랭킹 + 상세 분석
4. **관리자** (`/admin`) — 상담기록, 규정설정, 구성원관리

## 주요 API 엔드포인트
- `POST /api/auth/verify` — Google 로그인 검증 (명단 이메일 매칭)
- `POST /api/auth/check-session` — 단일 세션 검증 (60초 폴링)
- `GET /api/transaction/ranking` — 실거래가 랭킹 (전국/시도/구/동)
- `GET /api/transaction/query` — 실거래가 상세 조회
- `POST /api/transaction/insight` — AI 분석 (Brave Search 보강)
- `POST /api/transaction/report` — 리포트 생성
- `POST /api/chatbot` — 챗봇 질의
- `POST /api/content/generate` — 콘텐츠 생성

## 코딩 컨벤션

### 코드 전달 방식
- **Antigravity 호환 프롬프트**: 정확한 코드 블록으로 기존 → 교체 형태
- zip 파일 금지, 고수준 설명 금지
- 프롬프트 2~3회 검토 후 최종 전달

### 페이지 코드 규칙
- 각 page.ts 파일은 하나의 거대한 템플릿 리터럴 (백틱)
- CSS는 `<style>` 블록에 인라인
- JS는 `<script>` 블록에 인라인
- `var` 사용 (템플릿 리터럴 내부 JS는 strict mode 아님)
- 문자열 내 줄바꿈: `\\n` (이중 이스케이프 필요)

### 변수 네이밍
- 실거래가 관련: `tx` 접두사 (txRankingData, txLoadRanking 등)
- 랭킹 관련: `txRank` 접두사
- 상담기록 관련: `record` 접두사
- 멤버 관련: `member` 접두사

### CSS 변수
프로젝트 전체에서 동일한 CSS 변수 사용:
```css
--navy:#2C4A7C; --navy-dark:#1E3560; --navy-light:#EEF2F9;
--bg:#F8F6F1; --surface:#FFFFFF; --border:#E2E2E2;
--text:#1A1A2E; --sub:#6B6B80; --muted:#9CA3AF;
```

## 인증/보안 정책
- 로그인: Google OAuth → Firestore members 컬렉션 이메일 매칭
- 권한: 관리자(4페이지 접근) / 사용자(관리자 페이지 차단)
- 단일 세션: sessionId 기반, 다른 기기 로그인 시 기존 세션 킥
- BroadcastChannel('bsn_auth'): 같은 브라우저 탭 간 세션 공유
- 브라우저 종료 시: sessionStorage 만료로 재로그인 필요
- 직책 고정: No.94 김윤수=사장, No.95 이승진=부사장

## AI 텍스트 규칙 (4개 생성 지점 공통)
1. chatbot.ts — 챗봇 답변
2. content-generator.ts — SNS 콘텐츠
3. index.ts /api/transaction/insight — AI 분석
4. index.ts /api/transaction/report — 리포트

### 문체 원칙
AI가 자동 생성한 티가 나는 정형화된 패턴을 피한다. 특정 단어를 블랙리스트로 금지하는 것이 아니라, 문맥에 맞지 않는 기계적 반복이 문제다. 같은 접속어가 반복되거나, 불필요하게 격식체로 포장하거나, 내용 없이 있어 보이기만 하는 표현을 피한다. 어떤 단어든 문맥에 자연스러우면 사용 가능하되, 실제 사람이 말하듯이 쓴다.

### 허용
- 이모지/이모티콘
- 구어체 ("~거든요", "~인데요")
- 마크다운 문법은 금지

### 데이터 신선도
- 단독 인용: 최근 6개월 이내만 (동적 계산)
- 과거 데이터: 현재 대비 비교 용도로만 사용
- 예: "2024년 30% → 현재 15%로 절반 감소"

## 빌드 & 배포

### 로컬 개발
```bash
npx tsc && pm2 restart bsn
# 서버: http://localhost:12131
```

### Firebase 배포
```bash
npm run deploy  # = npx tsc && firebase deploy
# 도메인: deploy-test1-24dc2.web.app
```

### GitHub
변경 후 GitHub Desktop에서 커밋 → Push → 이후 Firebase 배포

## 환경 변수 (.env)
```
OPENAI_API_KEY=
MOLIT_API_KEY=
FB_WEB_API_KEY=
BRAVE_API_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
KAKAO_REST_API_KEY=
KAKAO_JS_API_KEY=
```

## 실거래가 시스템

### 캐시 정책 (SQLite)
- 확정 데이터 (3개월 이전): 영구 캐시
- 당월 데이터: 6시간 TTL
- 비당월 미확정: 24시간 TTL
- 0건 응답: 재호출

### 랭킹 API
- 전국 → 17개 시/도별 랭킹
- 시/도 선택 → 구별 랭킹
- 시/군/구 선택 → 동별 랭킹
- 정렬 기준: totalCount, avgPrice, avgPricePerPyeong, avgPricePerArea
- 전년 동기 대비 변동률

### 필터링 (실거래 데이터)
- 집합건물 제외
- 지분거래 제외
- cdealDay 존재 시 해제 건으로 처리

## 구성원 관리

### 자동 팀 생성
직책이 대표/상무/이사/팀장인 경우 → "{이름}팀" 자동 생성

### 소속 분류
빌딩, PENT, CARE, 경영 (4개)

## 비효율 감지 시 행동
코드 작업 중 비효율적인 패턴을 발견하면 먼저 개선안을 제안하고, 승인 후 적용.
