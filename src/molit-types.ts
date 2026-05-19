// MOLIT 부동산 종목별 타입 정의 (A-3b 신설, permit는 A-3b-2 sub-track 추가 예정)

export type PropertyType = 'commercial' | 'land' | 'sh' | 'apt';

export interface BaseTransactionRow {
  id: number;
  sggCd: string;
  sggNm: string | null;
  umdNm: string | null;
  jibun: string | null;
}

export interface BaseTransaction extends BaseTransactionRow {
  dealYm: string;
  dealYear: string;
  dealMonth: string;
  dealDay: string;
  dealAmount: number | null;
  cdealDay: string | null;
}

// 상업업무용 (기존 — Step A 미확인이라 사전조사 추정 유지)
export interface CommercialTransaction extends BaseTransaction {
  buildYear: string | null;
  buildingAr: number | null;
  buildingUse: string | null;
  plottageAr: number | null;
  landUse: string | null;
  buyerGbn: string | null;
  slerGbn: string | null;
}

// 토지 (Step A 16 필드 확인)
export interface LandTransaction extends BaseTransaction {
  dealArea: number | null;
  landUse: string | null;
  jimok: string | null;
  shareDealingType: string | null;
  cdealType: string | null;
  dealingGbn: string | null;
  estateAgentSggNm: string | null;
}

// 단독다가구 (Step A 17 필드 확인)
export interface SHTransaction extends BaseTransaction {
  plottageAr: number | null;
  totalFloorAr: number | null;
  buildYear: string | null;
  houseType: string | null;
  buyerGbn: string | null;
  slerGbn: string | null;
  cdealType: string | null;
  dealingGbn: string | null;
  estateAgentSggNm: string | null;
}

// 아파트 (Step A 32 필드 → 21 채택)
export interface AptTransaction extends BaseTransaction {
  aptNm: string | null;
  aptSeq: string | null;
  excluUseAr: number | null;
  buildYear: string | null;
  floor: number | null;
  aptDong: string | null;
  landLeaseholdGbn: string | null;
  roadNm: string | null;
  buyerGbn: string | null;
  slerGbn: string | null;
  cdealType: string | null;
  dealingGbn: string | null;
  estateAgentSggNm: string | null;
}

export type TransactionByType = {
  commercial: CommercialTransaction;
  land: LandTransaction;
  sh: SHTransaction;
  apt: AptTransaction;
};

// ============================================================
// Stage B-1 — BuildingPermit (A-3b-2)
// ============================================================

/**
 * BuildingPermit — ArchPmsHubService getApBasisOulnInfo 응답 매핑
 *
 * - 42 raw 필드 중 38 채택 (rnum + splotNm + block + lot 4건 drop)
 * - 14필드 논리 매핑: docs/a3b2-step-a-probe.json estimatedMappings 참조 (14/14 PASS)
 * - 신규 20필드: docs/a3b2-step-a-probe.json results[0].allFieldNames 참조
 *
 * 주요 주의:
 * - mgmPmsrgstPk는 22자리 BIGINT → JavaScript Number 정밀도 한계로 string 강제
 * - sample 빈 값 가능 필드: stcnsDelayDay, realStcnsDay (시간 지나면 채워짐)
 * - BSN 빌딩 화이트리스트 적용 위치는 UI 레이어 (mainPurpsCdNm 기준)
 * - 본 interface는 raw mapping 전용 — save/get 함수는 B-2 wrapper에서 추가
 */
export interface BuildingPermit {
  // === PK + 식별 ===
  mgmPmsrgstPk: string;             // 22자리 BIGINT, string 강제
  archPmsDay: string;                // 허가일 YYYYMMDD (= permitDate 매핑)

  // === 위치 (요청 echo + 응답 위치) ===
  sigunguCd: string;
  bjdongCd: string;
  platPlc: string;                   // 전체 주소 텍스트
  platGbCd: string;                  // 0=대지/1=산/2=블록
  bun: string;                       // 본번 (zero-pad)
  ji: string;                        // 부번 (zero-pad)

  // === 지목/용도지역/지구 (Nm = UI 표시, Cd = code join용) ===
  jimokCdNm: string;
  jimokCd: string;
  jiyukCdNm: string;
  jiyukCd: string;
  jiguCdNm: string;
  jiguCd: string;
  guyukCdNm: string;
  guyukCd: string;

  // === 건물 정보 ===
  bldNm: string;                     // 건물명
  archGbCdNm: string;                // 허가 구분명 (= permitType 매핑)
  archGbCd: string;
  mainPurpsCdNm: string;             // 주용도명 (= mainUse 매핑, 화이트리스트 키)
  mainPurpsCd: string;

  // === 면적/비율 ===
  platArea: number;                  // 대지면적 ㎡ (= plotAr 매핑)
  archArea: number;                  // 건축면적 ㎡ (= buildingAr 매핑)
  totArea: number;                   // 연면적 ㎡ (= totalFloorAr 매핑)
  vlRatEstmTotArea: number;          // 용적률 산정 연면적 (vlRat 분자)
  bcRat: number;                     // 건폐율 (= bldCoverRatio 매핑)
  vlRat: number;                     // 용적률 (= flrAreaRatio 매핑)

  // === 건물 구성 (UI 표시 X, 필터링 시그널만) ===
  mainBldCnt: number;                // 주동 수
  atchBldDongCnt: number;            // 부속동 수

  // === 세대/호/가구 ===
  hhldCnt: number;
  hoCnt: number;
  fmlyCnt: number;

  // === 주차 ===
  totPkngCnt: number;

  // === 일정 ===
  stcnsSchedDay: string;             // 착공 예정일 (= cnstrtSchedDay 매핑)
  stcnsDelayDay: string;             // 착공 지연일 (sample 빈 값 가능)
  realStcnsDay: string;              // 실착공일 (sample 빈 값 가능)
  useAprDay: string;                 // 사용 승인일

  // === 대장 메타 ===
  crtnDay: string;                   // 대장 생성일 YYYYMMDD
}

/**
 * BSN 빌딩 매수자 설득 콘텐츠 대상 — mainPurpsCdNm 화이트리스트
 *
 * 정책 α: ArchPmsHubService 응답은 빌딩+아파트+주택+공장 모두 포함하므로
 *   저장 단계는 무필터, UI 표시 시점에 본 화이트리스트 적용.
 * SJ 영업 관점에 따라 update 가능 (raw value 정확 형태는 운영 중 raw 확인 권고).
 */
export const BUILDING_PURPS_WHITELIST: ReadonlySet<string> = new Set([
  '업무시설',
  '제1종근린생활시설',
  '제2종근린생활시설',
  '판매시설',
  '숙박시설',
  '의료시설',
  '교육연구시설',
  '문화및집회시설',
]);

/** BSN UI 표시 가능 빌딩 인허가 판정 헬퍼 */
export function isBuildingForBsn(
  permit: Pick<BuildingPermit, 'mainPurpsCdNm'>
): boolean {
  return BUILDING_PURPS_WHITELIST.has(permit.mainPurpsCdNm);
}
