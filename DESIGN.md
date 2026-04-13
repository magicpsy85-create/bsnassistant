# BSN Assistant — Design System

## 컬러 시스템

### 브랜드 컬러
- Primary (Navy): `#2C4A7C`
- Navy Dark: `#1E3560`
- Navy Light (배경): `#EEF2F9`
- Navy Border: `#C5D3EC`
- Deep Navy: `#1E3A5F` (상세 분석 CTA 버튼)

### 기본 컬러
- Background: `#F8F6F1` (아이보리)
- Surface: `#FFFFFF`
- Border: `#E2E2E2`
- Text: `#1A1A2E`
- Sub (보조 텍스트): `#6B6B80`
- Muted (비활성 텍스트): `#9CA3AF`

### 차트 그라데이션 (딥 네이비 → 스카이블루)
txShade 함수 기반, 순위/비율 차트에 사용:
- 1위 (가장 진한): `rgb(30, 58, 95)` (#1E3A5F)
- 중간: `rgb(97, 131, 164)` 
- 마지막 (가장 밝은): `rgb(163, 203, 232)` (#A3CBE8)

### 상태 컬러
- 성공/상승: `#0F6E56` (녹색)
- 위험/하락: `#E24B4A` (빨간색)
- 경고/주의: `#C2410C` (주황색)

### 뱃지
- AI해결: bg `#EEF2F9`, text `#2C4A7C`, border `#C5D3EC`
- 직접문의: bg `#FFF7ED`, text `#C2410C`, border `#FED7AA`
- 오류: bg `#FCEBEB`, text `#E24B4A`, border `#F7C1C1`
- 관리자: bg `#EEF2F9`, text `#2C4A7C`
- 사용자: bg `#F0EDE6`, text `#6B6B80`

### 랭킹 순위 컬러
- 1위: `#BA7517` (금색)
- 2위: `#5F5E5A` (은색)
- 3위: `#993C1D` (동색)
- 4위~: `var(--muted)`

---

## 타이포그래피

### 폰트 패밀리
- 본문: `'Pretendard', -apple-system, sans-serif`
- 네비게이션: `'Inter', -apple-system, sans-serif`
- 제목/숫자 강조: `'Poppins', sans-serif`

### 폰트 크기 규칙
- 페이지 제목: 22px, Poppins, weight 700
- 섹션 제목: 14~15px, weight 600
- 카드 제목: 12px, weight 600
- 본문: 13px, weight 400~500
- 보조 텍스트: 12px, color var(--sub)
- 범례/캡션: 11px
- 차트 내부 퍼센티지: 11px, weight 500, color #fff
- 최소 크기: 10px (변동률 서브텍스트에만 사용)

### 숫자 표기
- 통계 카드 큰 숫자: 26px, Poppins, weight 800
- 랭킹 카드 주요 값: 16px, weight 600, color var(--navy)
- 상세 분석 통계: 15px, weight 600

---

## 컴포넌트

### 네비게이션 바
- 높이: 52px, 상단 고정 (sticky)
- 배경: #FFFFFF, 하단 border 1px
- 로고: 28x28 네이비 아이콘 + "BSN Assistant" (Poppins)
- 메뉴 순서: 실거래가 → 콘텐츠 생성 → 챗봇 → 관리자
- 활성 메뉴: bg var(--navy-light), color var(--navy), weight 600
- 우측: 사용자 이름(13px) + 나가기 버튼

### 카드
- 배경: var(--surface) (#FFFFFF)
- Border: 1px solid rgba(44,74,124,0.06~0.08)
- Border-radius: 12~14px
- Padding: 12~20px
- Shadow: 0 1px 4px rgba(0,0,0,0.07)

### 통계 카드 (클릭 가능)
- 기본: border 1px solid var(--border), cursor pointer
- Hover: border-color var(--navy)
- Active: border 2px solid var(--navy), bg var(--navy-light)

### 랭킹 카드
- 5열 그리드 (데스크톱), 3열 (≤700px), 2열 (≤480px)
- 체크박스: 우상단 16x16, 선택 시 네이비 배경 + 흰색 체크
- 클릭 시 open: border-color var(--navy), border-width 1.5px
- 상세 패널: grid-column 1/-1, 같은 행 아래에 삽입

### 버튼
- Primary: bg var(--navy), color #fff, font-weight 600
- Outline: border 1px solid var(--border), bg var(--surface)
- Hover: border-color var(--navy), color var(--navy)
- Disabled: bg #9ca3af, cursor not-allowed
- Border-radius: 8~10px

### 세그먼트 바
- 높이: 24px, border-radius 4px
- 내부 퍼센티지: 11px, weight 500, color #fff
- 8% 이상일 때만 퍼센티지 텍스트 표시
- 범례: 12px, dot 8x8, 건수는 11px color var(--sub)

### 개별 바 차트
- 바 높이: 18px, border-radius 4px
- 트랙 배경: rgba(30,58,95,0.06)
- 라벨: 48px 너비, 12px, weight 500, 우측 정렬
- 값: 12px, weight 500, min-width 60px

### 건축연도 바 차트
- 바 높이: 22px, 최소 너비 25%
- 연도 텍스트: 바 내부 왼쪽, 11px, weight 500, color #fff

### 피리어드 Pill (통계 선택)
- 기본: border 1px solid var(--border), border-radius 99px, 11px
- 활성: bg var(--navy-light), color var(--navy), border-color var(--navy-border)
- 단일 선택 (라디오 방식)

---

## 레이아웃

### 상세 분석 패널 (2열 그리드)
- ROW 1: 매수/매도 비율 | 건물용도별 + 용도지역별
- ROW 2: 동별 거래량 (전체) | 동별 평당가 (전체)
- ROW 3: 건축연도별 | 최고/최저 평당가
- 거래 리스트: 전체 너비
- 하단 버튼: 콘텐츠 생성 (outline) | 리포트 생성 (filled)
- gap: 12px, margin-bottom: 12px

### 비교 분석 테이블 (A안)
- 6행 구조: 거래건수, 평균매매가, 평당(토지), 평당(연면적), 매수명의, 매도명의
- 값과 전년대비 변동률을 한 셀에 2줄로 표시
- 매수/매도: "법인 39% · 개인 61%" + 건수
- AI 분석: 테이블 아래 자동 실행
- 최대 5개 지역 비교 가능

### 반응형 브레이크포인트
- 데스크톱: 5열 그리드
- 태블릿 (≤700px): 3열
- 모바일 (≤480px): 2열
- 상세 패널 통계: 4열 → 2열 (≤500px)

---

## 인터랙션

### 트랜지션
- 기본: all 0.12~0.15s
- 바 차트 애니메이션: width 0.5s ease

### 호버 효과
- 카드: border-color 변경
- 버튼: border-color + color 변경
- 네비게이션: 배경색 변경

### 클릭 피드백
- 랭킹 카드: open 클래스 토글 → 상세 패널 삽입
- 통계 카드: active 클래스 토글 → 필터 적용
- 체크박스: on 클래스 토글 → 비교 플로팅 버튼 표시

---

## 아이콘

- SVG 인라인 사용 (외부 아이콘 라이브러리 없음)
- stroke 기반, width 2~2.5
- 크기: 14~18px
- 로고: 14x14 격자 아이콘 (네이비 배경)

---

## AI 생성 텍스트 문체 규칙

- 마크다운 문법(**, *, #) 사용 금지
- AI투 표현 금지: "살펴보겠습니다", "인사이트", "핵심 포인트", "결론적으로" 등
- 이모지/이모티콘 허용
- 구어체 활용: "~거든요", "~인데요", "~더라고요"
- 데이터 신선도: 6개월 이내만 단독 인용, 과거 데이터는 비교 용도로만
- 톤: 현장 브로커가 동료에게 설명하는 톤
