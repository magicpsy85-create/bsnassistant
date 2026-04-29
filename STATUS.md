# BSN Assistant — 현재 상태 요약

작성일: 2026-04-29 / main HEAD: `b17c50d`

## 1. 회사 / 운영 컨텍스트
- **회사:** BSN빌사남부동산중개법인 — 상업용 빌딩 매매 중개
- **사용자 규모:** 약 98명 (전 구성원 사내 도구로 사용)
- **인증:** Google OAuth → Firestore `members` 컬렉션 이메일 매칭. 비명단 → 접근 차단
- **배포 계획:** 단계 검증 종료 후 즉시 사내 배포 예정. 도메인은 `deploy-test1-24dc2.web.app` (Firebase Hosting). 로컬은 PM2 + `http://localhost:3000`
- **권한:** 관리자(4페이지 풀 액세스) / 사용자(관리자 페이지 차단). 직책 고정: No.94 김윤수=사장, No.95 이승진=부사장
- **단일 세션 정책:** sessionId 기반 1기기 강제, 다른 기기 로그인 시 기존 세션 킥. 60초 폴링으로 검증

## 2. 기술 스택
| 레이어 | 사용 기술 |
|---|---|
| 런타임 | Node.js 22, TypeScript |
| 서버 | Express.js, PM2 (로컬) → Firebase Cloud Functions (배포) |
| DB | Firestore (구성원·상담기록·규정), SQLite (실거래 캐시) |
| 인증 | Firebase Auth (Google) |
| AI | OpenAI **GPT-5** (콘텐츠 생성, `reasoning_effort:'low'`), GPT-4o (챗봇·AI분석) |
| 외부 API | 국토교통부 실거래가, 네이버 뉴스, Brave Search (리포트/Places만), 카카오맵 |
| 호스팅 | Firebase Hosting + Cloud Functions |

페이지는 SPA 아닌 **SSR**: `src/pages/*-page.ts`가 거대한 템플릿 리터럴로 HTML+CSS+JS 인라인 반환.

## 3. 데이터 저장 방식 (현재 + 전환 계획)
| 데이터 | 현재 위치 | 전환 계획 |
|---|---|---|
| 구성원·상담기록·규정·세션 | Firestore | 유지 |
| 실거래가 캐시 | `data/transactions.db` (SQLite) | 유지 |
| 학습 데이터 (`learn-store`) | JSON 파일 (`data/`) | **SQLite 전환 검토 중** |
| 콘텐츠 생성 입력 히스토리·드래프트 | localStorage (브라우저) | **서버 SQLite/Firestore 전환 검토 중** |
| 지역 코드 매핑 | `data/region_codes.json` | 유지 |
| 멤버 명단 백업 | `data/members.json` | Firestore가 마스터, JSON은 로컬 fallback |

## 4. 최근 git log 5건

| 해시 | 의미 |
|---|---|
| `b17c50d` | **B-2-B-4** — 탭별 placeholder + `/api/content/generate-channel` 프론트 호출 + 410 fallback. `inflightChannels` Set(채널별 중복 방지) + `confirmShown` 플래그(전역 confirm 다중 표시 방지). `data-generated`는 응답 payload 기준(currentPreset 미사용). 410 시 `doGenerate(channels)` 호출 — 프리셋 ∪ 요청 채널 union으로 재생성 |
| `a0723de` | **B-2-B-3** — `/api/content/generate` payload에 `channels` 전달. `getCurrentChannels()` 헬퍼 (백엔드 `presetToChannels()` 미러). UI 변경 없음 (헤더 칩이 B-2-B-1에서 이미 커버) |
| `a242fd3` | **B-2-B-2** — 프리셋 모달 + Firestore 연동 + Firebase ID 토큰 자동 갱신(`fetchWithTokenRetry`) + `ensureFirebaseInitialized()` 가드 |
| `1bbca09` | **B-2-B-1** — 헤더 프리셋 칩 표시 + ⚙️ 버튼 (`#presetLabel` / `#presetSettingsBtn`) |
| `8e3e4e5` | contextCache 인메모리 Map → Firestore TTL 컬렉션 이전 (Cloud Functions 다중 인스턴스 대비) |

## 5. 엔드포인트 목록 (현재)
**인증:** `POST /api/auth/verify` `POST /api/auth/check-session` `GET /api/auth/config`
**구성원:** `GET /api/members` `POST|PUT|DELETE /api/admin/members[/:no]`
**접근 요청:** `GET /api/admin/access-requests` `POST /api/admin/access-requests/:id/approve|reject` `DELETE /api/admin/access-requests/:id`
**사용자 프리셋 (c47ad21):** `GET|POST /api/user/preset` (members.channelPreset 필드)
**콘텐츠 생성 (B-2-B-4 갱신):**
- `POST /api/content/generate` (B-2-B-3에서 프론트가 `channels` 배열 전달 — getCurrentChannels())
- `POST /api/content/generate-channel` (`{channel, contentHash}`, 캐시 미스 시 410. B-2-B-4에서 프론트 연결 완료 — 비프리셋 채널 탭 placeholder 버튼 클릭 시 호출)
- `POST /api/content/regenerate-card` `POST /api/content/generate-card` `POST /api/content/geocode` `POST /api/content/capture-map`
- `GET /api/content/recommend-news`

**학습:** `GET|POST|DELETE /api/learn/articles*` `POST /api/learn/add` `POST /api/learn/upload-pdf` `GET|DELETE /api/learn/corrupted`
**챗봇:** `POST /api/chatbot` `GET /api/chatbot/top-questions`
**관리자 — 기록:** `GET /api/admin/records` `PUT /api/admin/records/:id/status|report-error`
**관리자 — 드래프트·규정:** `GET|POST|PUT|DELETE /api/admin/drafts[/:id]` `POST /api/admin/drafts/apply` `GET /api/admin/rules` `POST /api/admin/rules/update|section` `DELETE /api/admin/rules/section/:sectionName`
**실거래가:** `GET /api/regions` `GET /api/transaction/{test|debug|query|ranking}` `POST /api/transaction/{insight|report}`
**기타:** `GET /api/kakao-key`

## 6. 진행 중 / 다음 작업

**완료 (B-2-B 시리즈 전체 종료):**
- **B-1b** (`e116b15`) — 채널 분리 백엔드. 캐시 hit 시 31초(분석·검색 스킵)
- **사용자 프리셋 백엔드** (`c47ad21`) — `/api/user/preset` GET·POST, `members.channelPreset`
- **contextCache Firestore TTL 이전** (`8e3e4e5`) — 다중 인스턴스 대비
- **B-2-B-1** (`1bbca09`) — 헤더 ⚙️ + 프리셋 모드 표시
- **B-2-B-2** (`a242fd3`) — 모달 + Firestore 저장/로드 + Firebase ID 토큰 자동 갱신 + `ensureFirebaseInitialized()` 가드
- **B-2-B-3** (`a0723de`) — `/api/content/generate` payload에 `channels` 전달. **메인 칩은 미추가 결정** — 헤더 칩이 동일 기능 커버 (D 옵션). sessionStorage 캐시 미도입 (Q 옵션) — 메모리 `currentPreset` 변수만 사용
- **B-2-B-4** (`b17c50d`) — 탭별 placeholder UI + `/api/content/generate-channel` 프론트 연결. **결정사항:** ① data-generated는 응답 payload 기준(프리셋 변경 시 마킹 흔들림 방지) ② inflightChannels Set은 채널별·confirmShown은 전역(병렬 호출 허용·다중 confirm 차단) ③ 410 fallback은 자동이 아닌 confirm 후 `doGenerate(channels)` — 프리셋 ∪ 요청 채널 union으로 재생성하여 사용자 의도 보존

**다음 후속 (낮은 우선):**
- 카드 레이아웃 정교화 (split-side / comparison-list 정규식)
- 학습 데이터 SQLite 전환
- 운영 시뮬레이션: ~98명 일일 사용량 추정 + OpenAI 월 비용
- 사내 배포 (단계 검증 종료 시)

## 7. 운영 시 고려사항
- **OpenAI 비용:** 카드 1회 생성 입력 9,800 + 출력 6,000 토큰 (gpt-5 low). 사용자 ~98명 × 일일 사용량 추정 후 월 비용 시뮬레이션 필요. B-1b로 단일 채널 호출은 출력 토큰 1/3 수준
- **응답 시간 기준치:** 카드 생성 평균 80초, 재생성 12~15초, 캐시 hit 채널 단독 31초. 80초 GPT 호출이 **전체의 95~98%** — 추가 최적화는 GPT 측 변수
- **API 한도:** OpenAI rate limit (조직별 RPM/TPM), 국토교통부 실거래 API (호출 빈도 무관하지만 응답 지연 가능), 네이버 뉴스 API (일일 25,000건), Brave Search (요금제별)
- **세션 타임아웃:** 서버 5분 (`req.setTimeout(300000)`). GPT 호출이 5분 초과하면 클라이언트 타임아웃 — 카드 생성에서 일부 발생 가능
- **PM2 단일 프로세스:** contextCache가 인메모리 Map이므로 Cloud Functions 다중 인스턴스 환경에선 캐시 미스 빈발 예상. **배포 시 Firestore TTL 컬렉션 또는 Redis 검토 필요**
- **데이터 신선도 정책:** 단독 인용 데이터는 6개월 이내만, 그 이전은 비교용. AI 텍스트 생성 4개 지점(챗봇·콘텐츠·인사이트·리포트)에서 동일 규칙 적용

## 8. 새 세션 인계용 핵심 컨텍스트

### 8-1. 페이지 코드 컨벤션 (가장 잘 빠지는 함정)
- `src/pages/*-page.ts`는 **TS 템플릿 리터럴 안에 JS 인라인 반환**. 출력 JS에 escape를 남기려면 TS 소스에서 **두 번 escape** 해야 한다 (`\\n`, `\\'`).
- 변수 네이밍 접두사: 실거래=`tx*`, 랭킹=`txRank*`, 상담=`record*`, 멤버=`member*`.
- CSS 변수 통일 (`--navy`, `--bg`, `--surface` 등). 페이지마다 동일 팔레트.

### 8-2. 작업 워크플로 (사용자 명시 선호)
- **여러 도메인 섞이면 분리 커밋.** 한 파일 안에 도메인 섞여 있으면 backup 브랜치 + Edit으로 분리.
- 작업 시작 전 `git checkout -b X-backup` + `/tmp/` 백업 두 겹.
- 각 커밋 전 `rm -rf dist && npx tsc` 빌드 검증 필수.
- 각 단계 후 사용자에게 **명시적 OK 신호** 받고 다음 단계로.
- staging 전 `git status` 의무. 예상 외 파일 발견 시 즉시 중단·보고.

### 8-3. AI 콘텐츠 문체 원칙
- 마크다운 강조(`*`, `**`) 금지. 이모지·구어체 허용.
- 카드뉴스 2~6장 본문은 **명사 중심**, 종결어미 금지 (`~요`, `~네요` 등). 1장은 별도 절대 규칙(템플릿 A/B/C마다 다름).
- 6장 포지션 중립 — "매수 추천", "매도 추천" 권고 금지. 시장 관찰 서술만.
- "예정" 단정 금지(미확정 보도), "추진 중/계획/보도" 사용.

### 8-4. 콘텐츠 생성 파이프라인 (5단계)
1. `analyzeInput` (3초) — 주제·의도 추출
2. `doResearch` (0.08초) — 네이버·국토부 병렬
3. `regionStats` 집계 (선택)
4. `generateContent` (60~100초) — 채널별 동적 스키마, GPT-5 low
5. (instagram 포함 시) 1장 제목 검증 + 최대 2회 재생성

### 8-5. 콘텐츠 생성 데이터 흐름 (B-1b)
- `/generate` 호출 → 분석·검색 → ctx 생성 → `contextCache.set(hash, ctx)` (TTL 10분) → GPT(요청 channels만) → 응답에 `contentHash` 포함
- 후속 채널 요청 → `/generate-channel {channel, contentHash}` → 캐시 hit 시 ctx 재사용, miss 시 410(`CONTEXT_CACHE_MISS`) → 프론트가 `/generate` 재호출

### 8-6. 자동 팀 생성 규칙
직책이 대표/상무/이사/팀장이면 `{이름}팀` 자동 생성. 소속은 빌딩/PENT/CARE/경영 4개.

### 8-7. 환경 변수 (.env)
`OPENAI_API_KEY`, `MOLIT_API_KEY`, `FB_WEB_API_KEY`, `BRAVE_API_KEY`, `NAVER_CLIENT_ID/SECRET`, `KAKAO_REST_API_KEY/JS_API_KEY`. **누락 시 401·환경 변수 안내 메시지 반환** (콘텐츠 생성 엔드포인트).

### 8-8. 배포 명령
- 로컬: `npx tsc && pm2 restart bsn-assistant`
- Firebase: `npm run deploy` (= `npx tsc && firebase deploy`)
- GitHub Desktop으로 commit/push 후 Firebase 배포 (관행)

### 8-9. 도메인 룰 (CLAUDE.md 끝 섹션) — **활성 상태**
B-2-B-1 시점에 CLAUDE.md 하단 "도메인 룰 (조건부 우선 참조)" 섹션 도입. 5개 `<important>` / `<important if>` 블록:
- `*-page.ts` 수정 시 — SSR escape 이중처리, `ensureFirebaseInitialized()` 호출, `/ssr-check` 검증 흐름
- 카드뉴스 콘텐츠 — 카드 객체 스키마, BADGE_MATRIX, 6장 중립, 1장 절대 규칙
- 실거래가/SQLite — DB 분리 원칙, 캐시 정기 재검증, API resultCode `'000'`
- GPT 모델 정책 — 콘텐츠는 gpt-5 + reasoning_effort `'low'`, 챗봇·AI 분석은 gpt-4o
- 시간 측정 마커 표준 — `[doResearch]` `[generateAllContent]` `[generateContent]` `[regenerateSingleCard]` `[/api/...]` `[contextCache]`

새 작업 진입 시 해당 룰 우선 참조 필수.
