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
