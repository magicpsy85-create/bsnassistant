import OpenAI from 'openai';
import axios from 'axios';
import { buildLearningContext } from './learn-store';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-5';

// ─── 1장 제목 규칙 검증 ───
function validateFirstCardTitle(title: string, template: 'A' | 'B' | 'C'): string[] {
  const errors: string[] = [];
  if (!title || typeof title !== 'string') {
    errors.push('제목이 비어있음');
    return errors;
  }
  const t = title.trim();

  // 서술어 종결만 검사 (명사형은 별도)
  const forbiddenEnd = /(합니다|됩니다|입니다|습니다|세요|네요|어요|아요|에요|죠|까)\s*$/;
  // 서사형 명사 종결 (A 전용)
  const narrativeNounEnd = /(이유|비결|방법|까닭|이야기|스토리|현실|실태|진실|비밀)\s*$/;

  // 공통 금지 문자
  const hasEllipsis = /[…‥]/.test(t);
  const hasMiddleDot = /[·‧∙•]/.test(t);
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t);

  if (template === 'A') {
    // A = 숫자 훅: 15자 이내, 숫자·단위 30%+, 부정 지표 금지
    if (t.length > 15) errors.push(`길이 초과 (${t.length}자 > 15자)`);
    const forbiddenPatterns = /[요죠네까다]$|[?!。…]|\.{2,}/;
    if (forbiddenPatterns.test(t)) errors.push('서술어/문장부호 금지 위반');
    const titleNoSpace = t.replace(/\s/g, '');
    const digitUnitPattern = /[0-9일이삼사오육칠팔구십백천만억조억만원%건위배평㎡년월일]|TOP/gi;
    const matches = titleNoSpace.match(digitUnitPattern) || [];
    const digitUnitCount = matches.join('').length;
    const ratio = titleNoSpace.length > 0 ? digitUnitCount / titleNoSpace.length : 0;
    if (ratio < 0.3) errors.push(`숫자·단위 비율 부족 (${(ratio*100).toFixed(0)}% < 30%)`);
    const negativePattern = /감소|하락|-\s*\d|급락|축소/;
    if (negativePattern.test(t)) errors.push('부정 지표 사용 금지');
    if (hasEmoji) errors.push('이모지 포함');
  } else if (template === 'B') {
    // B = 두 지역 비교: 격차 숫자 + 두 지역 20자 이내
    if (t.length > 20) errors.push(`길이 초과 (${t.length}자 > 20자)`);
    if (!/[0-9]/.test(t)) errors.push('숫자 없음');
    if (/[.?!]/.test(t)) errors.push('마침표·물음표·느낌표 포함');
    if (hasEllipsis) errors.push('말줄임표(…) 포함');
    if (hasMiddleDot) errors.push('중간점(·) 포함');
    if (hasEmoji) errors.push('이모지 포함');
    if (forbiddenEnd.test(t)) errors.push('서술어 종결');
    if (narrativeNounEnd.test(t)) errors.push('서사형 명사 종결');
  } else if (template === 'C') {
    // C = TOP N 랭킹: 구분자 포함 15~35자
    if (t.length < 15) errors.push(`길이 부족 (${t.length}자 < 15자)`);
    if (t.length > 35) errors.push(`길이 초과 (${t.length}자 > 35자)`);
    if (!/[—–\-~]/.test(t)) errors.push('구분자(—/-/~) 누락');
    if (/[?]/.test(t)) errors.push('물음표 포함');
    if (hasEllipsis) errors.push('말줄임표(…) 포함');
    if (hasEmoji) errors.push('이모지 포함');
    if (forbiddenEnd.test(t)) errors.push('서술어 종결');
  }

  return errors;
}

// ─── 1장 제목 재생성 (follow-up) ───
async function regenerateFirstCardTitle(
  originalTitle: string,
  template: 'A' | 'B' | 'C',
  errors: string[],
  topic: string
): Promise<string | null> {
  const templateRule = template === 'A'
    ? `[템플릿 A — 숫자 훅 헤드라인]
- 전체 길이 15자 이내 (공백 포함)
- 공백 제외 글자수 대비 숫자·단위 비율 30% 이상 (숫자: 0-9·한글숫자, 단위: 억·만·원·%·건·위·배·평·㎡·년·월·일·TOP)
- 지역명은 선택(숫자가 주인공, 지역명은 조연). 숫자 없으면 반드시 탈락
- 서술어·조사 끌기·물음표·느낌표·마침표·말줄임표 금지
- 부정 지표(감소, 하락, -n%) 쓰지 말 것. 긍정·중립 임팩트 지표만
- 좋은 예시: "평당 3억 돌파" / "성수 법인매수 68%" / "용산 평당 1.27억" / "거래량 3년래 최고"
- 나쁜 예시: "용산구 빌딩 시장 분석" (숫자 없음) / "성수동이 조용히 움직여요" (서사+서술어) / "최근 3년 서울 빌딩 누가 샀을까" (길이초과+서사) / "강남 거래 -40%" (부정 지표)`
    : template === 'B'
    ? `[템플릿 B — 두 지역 비교 격차 헤드라인]
- 전체 길이 20자 이내
- 두 지역 이름 또는 "vs" 포함
- 격차 숫자 최소 1개
- 서술어·물음표·마침표·말줄임표·중간점 금지
- 좋은 예시: "강남 vs 서초 거래 2.4배" / "성수 vs 청담 평당가 1.5배" / "종로 vs 중구 거래 2배"
- 나쁜 예시: "강남과 서초를 비교해요" (서술어) / "두 지역 격차가 크죠?" (질문형)`
    : `[템플릿 C — TOP N 랭킹 헤드라인]
- 형식: "{지역범위} {기간/설명} — {랭킹 기준}"
- 15~35자 범위
- 줄표(—) 또는 하이픈(-) 또는 물결(~) 1개 이상 포함
- 서술어·물음표 금지
- 좋은 예시: "서울 25개 구 — 거래량 TOP 10" / "강남 동별 — 평당가 TOP 5"`;

  const prompt = `SNS 카드뉴스 1장 제목 재작성 요청입니다.

[현재 제목]
${originalTitle}

[위반 사항]
${errors.map(e => '- ' + e).join('\n')}

[콘텐츠 주제]
${topic}

${templateRule}

위 규칙을 모두 통과하는 제목 하나만 작성하세요.
설명·인사·따옴표·마크다운 없이 제목 텍스트만 한 줄로 출력하세요.
예시를 복사하지 말고 주제에 맞게 새로 작성하세요.`;

  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 100,
      reasoning_effort: 'low' as any,
      messages: [{ role: 'user', content: prompt }]
    });
    let newTitle = resp.choices[0]?.message?.content?.trim() || '';
    newTitle = newTitle.replace(/^["'"'\[\(]+|["'"'\]\)]+$/g, '').trim();
    newTitle = newTitle.split('\n')[0].trim();
    newTitle = newTitle.replace(/^(제목|title)[:：]\s*/i, '').trim();
    return newTitle || null;
  } catch (e: any) {
    console.log('[1장 제목 재생성] 실패:', e.message);
    return null;
  }
}

// ── 지역코드 매핑 (국토부 API용) ───
const REGION_CODES: Record<string, string> = {
  '강남구':'11680','서초구':'11650','송파구':'11710','마포구':'11440',
  '용산구':'11170','성동구':'11200','광진구':'11215','영등포구':'11560',
  '중구':'11140','종로구':'11110','강서구':'11500','양천구':'11470',
  '구로구':'11530','금천구':'11545','동작구':'11590','관악구':'11620',
  '서대문구':'11410','은평구':'11380','노원구':'11350','도봉구':'11320',
  '강북구':'11305','성북구':'11290','중랑구':'11260','동대문구':'11230',
  '강동구':'11740',
  '성수동':'11200','역삼동':'11680','청담동':'11680','압구정동':'11680',
  '삼성동':'11680','논현동':'11680','대치동':'11680','잠실동':'11710',
  '여의도동':'11560','이태원동':'11170','한남동':'11170',
};

function extractRegionCode(topic: string): string | null {
  for (const [name, code] of Object.entries(REGION_CODES)) {
    if (topic.includes(name)) return code;
  }
  return null;
}

// ══════════════════════════════════════════════════════════
// A단계 — 입력 분석 (의도 파악)
// ══════════════════════════════════════════════════════════
interface AnalysisResult {
  topic: string;
  intent: string;
  tone_request: string | null;
  search_keywords: string[];
  time_keywords: string[];
}

async function analyzeInput(input: string): Promise<AnalysisResult> {
  try {
    const analyzePrompt = `당신은 부동산 빌딩 중개 전문 콘텐츠 기획자입니다.
사용자의 입력을 분석하여 다음을 JSON으로 반환하세요:
{
  "topic": "핵심 주제",
  "intent": "정보전달 | 분석 | 반박 | 의견제시 | 트렌드소개",
  "tone_request": "사용자가 특별히 요청한 톤이 있으면 기재, 없으면 null",
  "search_keywords": ["리서치에 사용할 검색 키워드 3-5개"],
  "time_keywords": ["과거 데이터 검색 키워드", "현재 데이터 검색 키워드", "전망 검색 키워드"]
}
JSON만 반환하세요.

사용자 입력:
${input}`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_completion_tokens: 1000,
      messages: [
        { role: 'user', content: analyzePrompt }
      ]
    });

    const text = res.choices[0]?.message?.content || '{}';
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return { topic: input, intent: '정보전달', tone_request: null, search_keywords: [input], time_keywords: [input] };
    }
  } catch (e: any) {
    console.error('[A단계] analyzeInput 실패:', e.message);
    return { topic: input, intent: '정보전달', tone_request: null, search_keywords: [input], time_keywords: [input] };
  }
}

// ══════════════════════════════════════════════════════════
// B단계 — 자동 리서치
// ══════════════════════════════════════════════════════════
interface ResearchData {
  naverNews: { title: string; description: string; link: string }[];
  transactions: { area: string; price: string; date: string }[];
  googleResults: { title: string; snippet: string }[];
}

async function doResearch(analysis: AnalysisResult): Promise<ResearchData> {
  const t0 = Date.now();
  const data: ResearchData = { naverNews: [], transactions: [], googleResults: [] };

  // (1) 네이버 뉴스 검색
  const keywords = analysis.search_keywords || [analysis.topic || '부동산'];
  console.log(`[doResearch] 시작 — keywords:`, keywords.slice(0, 3));
  const naverPromises = keywords.slice(0, 3).map(async (kw) => {
    try {
      const naverId = process.env.NAVER_CLIENT_ID;
      const naverSecret = process.env.NAVER_CLIENT_SECRET;
      if (!naverId || !naverSecret) return [];
      const resp = await axios.get('https://openapi.naver.com/v1/search/news.json', {
        params: { query: kw, display: 5, sort: 'date' },
        headers: { 'X-Naver-Client-Id': naverId, 'X-Naver-Client-Secret': naverSecret },
        timeout: 5000
      });
      return (resp.data.items || []).map((item: any) => ({
        title: item.title.replace(/<[^>]*>/g, ''),
        description: item.description.replace(/<[^>]*>/g, ''),
        link: item.link
      }));
    } catch { return []; }
  });

  // (2) 국토부 실거래가
  const transactionPromise = (async () => {
    try {
      const apiKey = process.env.MOLIT_API_KEY;
      if (!apiKey) return [];
      const regionCode = extractRegionCode(analysis.topic);
      if (!regionCode) return [];
      const now = new Date();
      const monthPromises = [0, 1, 2].map(i => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
        return axios.get(
          'http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcNrgTrade',
          { params: { serviceKey: apiKey, LAWD_CD: regionCode, DEAL_YMD: dealYmd, pageNo: 1, numOfRows: 10 }, timeout: 5000 }
        ).then(resp => {
          const items = resp.data?.response?.body?.items?.item;
          if (Array.isArray(items)) {
            return items.map((it: any) => ({
              area: `${it['시군구']} ${it['법정동'] || ''}`.trim(),
              price: `${it['거래금액'] || ''}만원`.trim(),
              date: `${it['년']}년 ${it['월']}월`
            }));
          }
          return [];
        }).catch(() => []);
      });
      const results = (await Promise.all(monthPromises)).flat();
      return results.slice(0, 10);
    } catch { return []; }
  })();

  // (3) Brave Search 제거 — 한국 부동산 콘텐츠는 네이버 뉴스 우세, v1/web/search는 노이즈 위험
  // 다른 경로(리포트·LLM Context·Places)의 브레이브는 유지

  const tSearch = Date.now();
  const [naverResults, txResults] = await Promise.all([
    Promise.all(naverPromises),
    transactionPromise
  ]);
  console.log(`[doResearch] 검색 완료 — ${Date.now() - tSearch}ms (네이버 ${naverResults.flat().length}건, 국토부 ${txResults.length}건)`);

  data.naverNews = naverResults.flat();
  data.transactions = txResults;
  data.googleResults = [];

  console.log(`[doResearch] 전체 — ${Date.now() - t0}ms`);
  return data;
}

// ══════════════════════════════════════════════════════════
// C단계 — 콘텐츠 생성
// ══════════════════════════════════════════════════════════
export interface ContentResult {
  region: string;
  instagram: {
    cards: { tag: string; title: string; style: 'dark' | 'light' | 'accent' | 'cta' }[];
    caption: string;
  };
  imageIdeas: string[];
  shortform: {
    filming: string;
    reelsUpload: string;
    shortsUpload: string;
  };
  youtube: {
    title: string;
    script: string;
    description: string;
  };
  thread: {
    post: string;
  };
  blog: {
    post: string;
  };
  sessionMeta?: {
    currentPeriod?: string;
    comparisonPeriod?: string;
  };
  channels?: AllChannelsResult;
}

// ─── B-1a: 채널별 분리 준비용 타입 ───
// 현재는 단일 GPT 응답에서 분배하지만, B-1b에서 채널별 독립 GPT 호출 시 동일 타입 사용.
export interface ContentContext {
  topic: string;
  template: 'A' | 'B' | 'C';
  mode: 'text' | 'url';
  input: string;
  contentInput?: string; // URL 모드 추출 본문 (text 모드는 input과 동일)
  region?: string;
  region1?: string;
  region2?: string;
  rankBy?: string;
  analysis: any;
  research: any;
  regionStats: any | null;
  sessionMeta?: { currentPeriod?: string; comparisonPeriod?: string };
}

export interface InstagramChannel {
  cards: { tag: string; title: string; style: 'dark' | 'light' | 'accent' | 'cta' }[];
  caption: string;
  hashtags: string[];
  imageIdeas: string[];
}
export interface ShortformChannel {
  filming: string;
  reelsUpload: string;
  shortsUpload: string;
}
export interface YoutubeChannel {
  title: string;
  script: string;
  description: string;
}
export interface ThreadChannel {
  post: string;
}
export interface BlogChannel {
  post: string;
}
export interface AllChannelsResult {
  instagram: InstagramChannel;
  shortform: ShortformChannel;
  youtube: YoutubeChannel;
  thread: ThreadChannel;
  blog: BlogChannel;
  sessionMeta?: ContentContext['sessionMeta'];
}

// ─── B-1b: 채널 키 ───
export type ChannelKey = 'instagram' | 'shortform' | 'youtube' | 'thread' | 'blog';
export const ALL_CHANNELS: ChannelKey[] = ['instagram', 'shortform', 'youtube', 'thread', 'blog'];

// B-2-A: contextCache는 Firestore 백엔드로 이전 (src/contextCache.ts)
// computeContentHash도 동일 모듈로 이동, 기존 import 호환을 위해 re-export
import { contextCache, computeContentHash } from './contextCache';
export { contextCache, computeContentHash };

function safeParseGPTJson(raw: string): any {
  let text = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // 1차: 정상 파싱
  try { return JSON.parse(text); } catch (e: any) {
    console.log('[GPT 파싱] 1차 실패, 복구 시도:', e.message);
  }

  // 2차: 잘린 JSON 복구
  try {
    let fixed = text;
    if ((fixed.match(/"/g) || []).length % 2 !== 0) fixed += '"';
    let ob = (fixed.match(/\[/g) || []).length;
    let cb = (fixed.match(/\]/g) || []).length;
    let oc = (fixed.match(/{/g) || []).length;
    let cc = (fixed.match(/}/g) || []).length;
    while (cb < ob) { fixed += ']'; cb++; }
    while (cc < oc) { fixed += '}'; cc++; }
    const parsed = JSON.parse(fixed);
    console.log('[GPT 파싱] 복구 성공');
    return parsed;
  } catch (e2: any) {
    console.error('[GPT 파싱] 복구 실패:', e2.message);
    return null;
  }
}

async function generateContent(
  input: string,
  analysis: AnalysisResult,
  research: ResearchData,
  template: 'A' | 'B' | 'C' = 'A',
  regionStats: any = null,
  channels: ChannelKey[] = ALL_CHANNELS
): Promise<ContentResult> {
  const wantInstagram = channels.includes('instagram');
  const wantShortform = channels.includes('shortform');
  const wantYoutube = channels.includes('youtube');
  const wantThread = channels.includes('thread');
  const wantBlog = channels.includes('blog');
  const wantImageIdeas = wantInstagram; // imageIdeas는 instagram 채널과 항상 함께
  const researchSummary = buildResearchSummary(research);
  const toneNote = analysis.tone_request ? `\n[사용자 요청 톤] ${analysis.tone_request}` : '';

  // 학습 데이터 참조 컨텍스트 추가
  const learningCtx = buildLearningContext();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const currentYM = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const oldestYM = `${sixMonthsAgo.getFullYear()}년 ${sixMonthsAgo.getMonth() + 1}월`;

  if (regionStats) {
    console.log('[콘텐츠 생성] regionStats 전달됨 — type:', regionStats.type);
  } else {
    console.log('[콘텐츠 생성] regionStats 없음 (직접 입력 또는 URL 모드)');
  }

  // 템플릿별 카드 구조 + JSON 예시 태그
  const templateStructure = template === 'A' ? `[카드뉴스 구조 — 템플릿 A: 한 지역·상권 심층 분석 (반드시 7장)]

핵심 원칙:
- 통계는 2장에서 핵심 1~2개 지표만 강조. 나머지는 맥락적 활용.
- 3~5장은 리서치 데이터(뉴스·기사)를 적극 활용 — 개발호재, 브랜드 입점, 상권 변화, 정책 등.
- "왜 이 지역에 돈이 모이는가"의 스토리를 전달. 통계 나열 보고서 금지.
- 리서치에 개발호재가 없으면 상권 특성(유동인구, 업종, 임차 구조 등)으로 대체. 확인 안 된 개발 계획은 언급 금지.
- title 본문에 기간 괄호 표기 금지. 기간 정보는 UI가 배지로 자동 표시.

1장 (숫자 훅): 이번 콘텐츠에서 가장 임팩트 있는 숫자 하나가 제목의 주인공. 서사형 문장 금지, 헤드라인 스타일.
  핵심 규칙:
    - 숫자·단위가 제목의 절반(공백 제외 30% 이상) 차지
    - 15자 이내 (공백 포함)
    - 서술어·조사 끌기 금지. 헤드처럼 끊어 씀
    - 긍정 지표 또는 임팩트 큰 중립 지표에서 숫자 선택. 부정 지표는 1장에 쓰지 말 것 (부정 지표는 5장 가치 재발견에서 활용)
  좋은 예: "평당 3억 돌파", "성수 법인매수 68%", "용산 평당 1.27억", "거래량 3년래 최고"
  나쁜 예: "용산구 빌딩 시장 분석" (숫자 없음), "성수동이 조용히 움직이고 있어요" (서사+서술어)

2장 (핵심 통계): 가장 긍정적이거나 주목할 통계 1~2개 압축 + 서울 내 위상.
  [지역 통계 컨텍스트]에서 상위권이거나 전년 대비 개선된 지표 우선.
  나머지 지표는 3~5장에서 맥락적으로 한 줄씩 활용.

3장 (개발호재·뉴스): 땅값에 긍정 영향을 줄 수 있는 호재.
  리서치 데이터(뉴스·기사)에서 발굴한 개발 계획, 교통, 정책, 브랜드 입점 등.
  리서치에 없으면 상권·입지 특성으로 대체.
  [중립 표현 원칙]
    - 완료 여부가 불확실한 프로젝트는 "추진 중", "계획", "보도"로 서술
    - 구체적 완료·오픈 시점이 확실하지 않으면 "예정" 단정 금지
    - 뉴스 인용 시 "보도 기준" 맥락 유지
    - 좋은 예: "젠틀몬스터 본사 추진 보도", "대형 오피스 순차 입주 계획"
    - 나쁜 예: "젠틀몬스터 본사 준공 예정" (확정 단정), "2026년 오픈 확정"

4장 (상권·입지 매력): 이 지역이 매력적인 이유 — 상권 흐름, 임차 수요, 업종 구성.
  뉴스 + 통계를 조합한 현장감 있는 서술.

5장 (가치 재발견): 매수 관점에서 해당 지역의 부정 지표·변동성을 가치 요소로 재해석.
  핵심 원칙:
    - 부정 지표(하락/감소/변동성) 인용 시 비교 기준 명시 (예: "전년 동기 대비", "서울 평균 대비")
    - 변동성이 큰 지표는 "필지별 선별 진입 필요" 같은 리스크 인지 + 기회 전환의 2단 구조
    - 최소 1개의 전년 동기 비교 수치 인용 필수
  좋은 예: "전년 동기 -35% → 협상력 회복 구간", "평당가 격차 3.4배 → 필지별 선별 진입"
  나쁜 예: "평균가 -35%" (비교 기준 없음)

6장 (인사이트·관찰 포인트): 이 지역·시장을 보는 데이터 너머의 관점. 포지션 중립.
  핵심 원칙:
    - "놓치기 쉬운 포인트" / "숫자 너머의 의미" / "앞으로 주목할 변수" 중 하나의 프레임 선택
    - 매수자·매도자·관심자 모두에게 유익한 통찰
    - 3~5개의 짧은 포인트 bullet
  금지 용어: "매수", "매도", "진입", "정리", "선점", "디딜물건", "매수 팁", "매도 팁"
  좋은 예:
    - "준주거 거래 소수지만 회전 빠름"
    - "전년 상승 구간 후 조정 진입, 관찰 포인트"
    - "법인 집중은 기관 검증 신호"
  나쁜 예: "매수 추천", "매도자는..."

7장 (CTA): "{지역명}의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"` :

template === 'B' ? `[카드뉴스 구조 — 템플릿 B: 두 지역 비교 (반드시 7장)]

핵심 원칙:
- 2장에서 핵심 통계 1~2개 병렬 비교.
- 3장에서 양쪽 매력을 대비하여 제시 (한 카드에 두 지역 모두). 수치 반복 금지.
- 4~5장은 뉴스·호재 기반 투자 분석.
- 양쪽 모두에 매수 근거 제시. 어느 쪽이든 기회가 보여야 함.
- 병렬 구분자: " | ", 항목 간 줄바꿈(\\n) 필수.
- title 본문에 기간 괄호 표기 금지. 기간 정보는 UI가 배지로 자동 표시.

1장 (격차 헤드라인): 두 지역 격차의 가장 임팩트 있는 숫자.

2장 (핵심 통계 대조): 주목할 지표 1~2개를 병렬 압축.
  예시: "거래량\\n{지역1} N건 | {지역2} M건\\n\\n평당가\\n{지역1} X억 | {지역2} Y억"

3장 (양쪽 매력 대비): 두 지역 핵심 매력을 한 카드에 대비. 서사·맥락 중심.
  핵심 원칙:
    - 1·2장에 제시된 수치(평당가, 거래량, 법인 비율 등) 반복 금지
    - 각 지역당 1~2개 핵심 매력 (상권 성격, 업무수요, 개발 이슈, 입지 특성)
    - 새 수치 필요 시 1·2장에 없는 지표만 간결하게
  좋은 예: "역삼: 테헤란로 업무수요 + 리모델링 여지 / 삼성: GBC 계획 기반 중장기 모멘텀"
  나쁜 예: "역삼: 법인 100%, 거래 11건" (2장 수치 반복)

4장 (변화 대조): 전년 동기 대비 양쪽 변화율 병렬 + 추세 해석.
  예시: "전년 동기 대비\\n거래량 | {지역1} +15% | {지역2} -8%\\n평당가 | {지역1} +21% | {지역2} +5%"

5장 (가치 재발견): 두 지역 거래 완화를 매수자 우위 구간으로 프레이밍.
  - 전년 동기 거래량 감소 → "거래 경쟁 완화" 프레임
  - 두 지역 성격 차이 명시 (가격 메리트 vs 프리미엄 레버리지)
  - 비교 기준 명시 필수

6장 (인사이트·관찰 포인트): 두 지역·시장을 보는 데이터 너머의 관점. 포지션 중립.
  핵심 원칙:
    - "놓치기 쉬운 포인트" / "숫자 너머의 의미" / "앞으로 주목할 변수" 중 하나의 프레임 선택
    - 매수자·매도자·관심자 모두에게 유익한 통찰
    - 3~5개의 짧은 포인트 bullet
  금지 용어: "매수", "매도", "진입", "정리", "선점", "디딜물건", "매수 팁", "매도 팁"
  좋은 예: "프리미엄 레버리지 vs 가격 메리트는 매매 목적에 따라 다름"
  나쁜 예: "강남 매수, 서초 매도 추천"

7장 (CTA): "{공통 지역}의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"` :

`[카드뉴스 구조 — 템플릿 C: TOP N 랭킹 (반드시 7장)]

핵심 원칙:
- 2장은 임팩트 관찰 1~2개. TOP 3 나열 금지 (3장과 중복 방지).
- 3장에서 요청된 TOP N 전체를 명확히 나열.
- 4~5장은 상위권·주목 지역의 뉴스·호재 기반 인사이트 제공.
- "왜 여기에 거래가 몰리는가"를 뉴스로 설명. 단순 랭킹 표가 아닌 스토리.
- 확인 안 된 개발 계획은 언급 금지. 리서치에 없으면 상권 일반 특성으로 서술.
- title 본문에 기간 괄호 표기 금지. 기간 정보는 UI가 배지로 자동 표시.

1장 (랭킹 헤드라인): "{지역범위} — {랭킹 기준} TOP N" 포맷.

2장 (핵심 하이라이트): TOP 3 나열 금지. 랭킹 전체에서 가장 임팩트 있는 관찰 1~2개를 수치와 함께 제시.
  좋은 예:
    - "1위와 10위 평당가 격차 2.2배"
    - "TOP 3 모두 평당 7천만 이상"
  나쁜 예: "1위 성동 8751, 2위 강동 7866, 3위 강남 7662" (3장과 중복)

3장 (전체 TOP N 나열): N개 모두 순서대로. 각 순위마다 줄바꿈. 절대 생략 금지.

4장 (상위권 — 왜 강한가): TOP 1~5가 강한 이유를 뉴스·호재 기반 분석.
  개발 계획, 상권 회복, 정책 변화 등 리서치 데이터에서 근거 발굴.
  리서치에 없으면 상권 일반 특성으로 서술.
  [중립 표현 원칙]
    - 완료 여부가 불확실한 프로젝트는 "추진 중", "계획", "보도"로 서술
    - 구체적 완료·오픈 시점이 확실하지 않으면 "예정" 단정 금지
    - 뉴스 인용 시 "보도 기준" 맥락 유지
    - 좋은 예: "젠틀몬스터 본사 추진 보도", "대형 오피스 순차 입주 계획"
    - 나쁜 예: "젠틀몬스터 본사 준공 예정" (확정 단정), "2026년 오픈 확정"

5장 (가치 재발견): 랭킹 중·하위권의 저평가 요소와 반등 여지.
  - 상위권과의 평당가 격차 → 진입 여지 프레이밍
  - "낮은 진입가", "상승 여지", "회복 국면" 관점

6장 (인사이트·관찰 포인트): 이 랭킹이 시장에 주는 관찰 포인트. 포지션 중립.
  핵심 원칙:
    - "놓치기 쉬운 포인트" / "숫자 너머의 의미" / "앞으로 주목할 변수" 중 하나의 프레임 선택
    - 매수자·매도자·관심자 모두에게 유익한 통찰
    - 3~5개의 짧은 포인트 bullet
  금지 용어: "매수", "매도", "진입", "정리", "선점", "디딜물건", "매수 팁", "매도 팁"
  좋은 예:
    - "상위권 집중 심화는 지역별 양극화 신호"
    - "중하위권 회복 국면은 관찰 변수"
  나쁜 예: "하위권 선점 기회", "매수 타이밍"

7장 (CTA): "{랭킹 대상 지역}의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"

TOP N 개수가 10이면 3장에 반드시 10개 모두 나열. 절대 생략 금지.`;

  const templateCardsExample = template === 'A' ? `      {"tag": "숫자 훅", "title": "...", "style": "dark"},
      {"tag": "핵심 통계", "title": "...", "style": "light"},
      {"tag": "개발호재·뉴스", "title": "...", "style": "accent"},
      {"tag": "상권·입지", "title": "...", "style": "light"},
      {"tag": "가치 재발견", "title": "...", "style": "dark"},
      {"tag": "인사이트", "title": "...", "style": "accent"},
      {"tag": "CTA", "title": "...", "style": "cta"}` :

template === 'B' ? `      {"tag": "격차 헤드라인", "title": "...", "style": "dark"},
      {"tag": "핵심 통계 대조", "title": "...", "style": "light"},
      {"tag": "양쪽 매력 대비", "title": "...", "style": "accent"},
      {"tag": "변화 대조", "title": "...", "style": "light"},
      {"tag": "가치 재발견", "title": "...", "style": "dark"},
      {"tag": "인사이트", "title": "...", "style": "accent"},
      {"tag": "CTA", "title": "...", "style": "cta"}` :

`      {"tag": "랭킹 헤드라인", "title": "...", "style": "dark"},
      {"tag": "핵심 하이라이트", "title": "...", "style": "light"},
      {"tag": "전체 나열", "title": "...", "style": "accent"},
      {"tag": "상위권 분석", "title": "...", "style": "light"},
      {"tag": "가치 재발견", "title": "...", "style": "dark"},
      {"tag": "인사이트", "title": "...", "style": "accent"},
      {"tag": "CTA", "title": "...", "style": "cta"}`;

  const regionStatsBlock = regionStats ? formatRegionStats(regionStats) : '';

  if (regionStatsBlock) {
    console.log('[2-c 검증] regionStatsBlock 길이:', regionStatsBlock.length, '문자');
    console.log('[2-c 검증] 앞 500자:', regionStatsBlock.substring(0, 500));
  }

  const userContent = `[사용자 입력]
${input}

[분석 결과]
주제: ${analysis.topic}
의도: ${analysis.intent}
${toneNote}

[리서치 데이터]
${researchSummary}
${regionStatsBlock ? '\n' + regionStatsBlock + '\n' : ''}
위 리서치 데이터와 지역 통계 컨텍스트를 종합하여 ${(() => {
  const labels = [
    wantInstagram ? '인스타그램' : null,
    wantShortform ? '숏폼' : null,
    wantYoutube ? '유튜브' : null,
    wantThread ? '스레드' : null,
    wantBlog ? '블로그' : null,
  ].filter(Boolean);
  return `${labels.length}개 채널(${labels.join(', ')})`;
})()}의 콘텐츠를 생성해주세요.

[중요 규칙 — 카드뉴스 작성 시]
- 모든 수치는 지역 통계 컨텍스트의 값만 사용. 임의 창작 금지.
- 상대적 위상은 기준 수 함께 제시 (예: "서울 25개 구 중 3위").
- 데이터 부족 시 "데이터 부족"으로 정직 표현.
- title 본문에 "(2026.01~2026.04 기준)" 같은 괄호 기간 표기를 절대 넣지 말 것. UI가 기간 배지를 자동 표시하므로 본문 중복 표기하면 가독성 훼손.
- B 템플릿 비교 카드는 한 카드에 두 지역을 " | " 구분자로 병렬 표시. 절대 한 지역씩 카드 나누지 말 것. 항목마다 반드시 \n(줄바꿈)으로 분리. 한 줄 나열 금지.
- C 템플릿 TOP N 랭킹은 3장에 요청 개수를 모두 순서대로 나열 (TOP 10이면 10개 모두). 각 순위마다 반드시 \n(줄바꿈)으로 분리.
- 모든 템플릿에서 title 안에 여러 항목이 있을 때 반드시 \n으로 구분. 가독성을 위한 줄바꿈은 적극 활용.`;

  const systemContent = `[필수 — 콘텐츠 관점 설정]

당신이 만드는 모든 콘텐츠는 "빌딩 매매 중개 전문가"의 관점에서 작성되어야 합니다.

우리의 주업무: 상업용 빌딩 매매 중개
우리의 타겟 독자: 빌딩 소유자, 빌딩 투자자, 빌딩 매수 희망자

[관점 변환 규칙]
어떤 기사나 주제가 입력되든, 반드시 아래 관점 중 하나 이상으로 변환하여 작성하세요:

1. 빌딩 매매가에 미치는 영향
   - 이 소식이 해당 지역 빌딩 가격에 어떤 영향을 주는가?
   - 매수/매도 타이밍에 어떤 시사점이 있는가?

2. 상권 분석
   - 이 소식이 상권 활성화/침체에 어떤 영향을 주는가?
   - 유동인구, 업종 변화, 브랜드 입점이 빌딩 가치와 어떻게 연결되는가?

3. 거래량 동향
   - 해당 지역의 빌딩 거래량이 어떻게 변화하고 있는가?
   - 매물 증감, 거래 활성도가 시장에 어떤 신호를 보내는가?

4. 임대료 분석 (임대 중개가 아닌, 빌딩 가치 판단 기준으로서의 임대료)
   - 임대료 변화가 빌딩 수익률(CAP Rate)에 어떤 영향을 주는가?
   - 임대료 상승/하락이 빌딩 매매가에 어떻게 반영되는가?

5. 권리금 분석 (권리금 중개가 아닌, 상권 가치와 빌딩 가치 판단 기준으로서의 권리금)
   - 권리금 수준이 해당 상권의 활성도를 어떻게 보여주는가?
   - 권리금 상승/하락이 빌딩의 1층 임대 경쟁력과 매매가에 어떤 영향을 주는가?
   - 권리금이 높은 상권 vs 낮은 상권이 빌딩 투자 관점에서 어떤 차이를 만드는가?

[변환 예시]
- 입력: "성수동 팝업스토어 급증" 기사
  잘못된 방향: "팝업스토어를 열고 싶다면 성수동을 추천합니다"
  올바른 방향: "팝업스토어가 몰리면서 성수동 상권이 활성화되고 있고, 이것이 주변 빌딩 매매가와 임대 수익률에 어떤 변화를 만들고 있는가"

- 입력: "스타벅스 리저브 강남 오픈" 기사
  잘못된 방향: "스타벅스 리저브에서 커피 마시세요"
  올바른 방향: "스타벅스 리저브 같은 프리미엄 F&B가 입점하면 해당 빌딩과 주변 빌딩의 가치가 어떻게 변하는가"

- 입력: "GTX-A 개통" 기사
  잘못된 방향: "GTX-A로 출퇴근이 편해집니다"
  올바른 방향: "GTX-A 개통으로 역세권 상업용 빌딩의 거래량과 매매가가 어떻게 움직이고 있는가"

- 입력: "성수동 카페 권리금 2억 돌파" 기사
  잘못된 방향: "성수동에서 카페를 인수하려면 권리금이 이 정도 듭니다"
  올바른 방향: "권리금이 2억을 넘었다는 것은 이 상권의 매출력이 그만큼 검증되었다는 의미이고, 이것이 주변 빌딩의 1층 임대 수익률과 매매가에 어떻게 반영되고 있는가"

[예외]
사용자가 "직접 입력" 모드에서 구체적으로 다른 관점을 요청한 경우에만 그 요청을 따르세요.
기사 URL 모드에서는 항상 빌딩 매매/상권 분석 관점을 유지하세요.

---

당신은 빌딩 중개 전문 SNS 콘텐츠 작가입니다. 상업용 부동산(빌딩 매매) 중개사의 인지도와 전문성을 높이는 콘텐츠를 만듭니다.

[필수 원칙]
1. 콘텐츠 2장~7장(CTA 제외 2~6장, CTA는 7장)의 후킹: 독자가 스크롤을 멈추고 '이건 나한테 해당되는 얘기인데?'라고 느끼게 만드는 구체적이고 도발적인 문장을 작성하세요. 예시: '강남역 건물주들이 조용히 빠지고 있습니다', '이 법 바뀐 거 모르면 세금 2배 냅니다'.

   ※ 1장(첫 카드) 제목은 별도 규칙이 적용됩니다. 이 문서 맨 아래 [1장 제목 — 절대 규칙] 섹션을 참조하세요. 해당 규칙이 다른 모든 지시보다 우선합니다.
2. 직접적이고, 구체적이고, 이해하기 쉽게 쓰세요.
3. AI가 쓴 것 같지 않게, 실제 현장 경험이 있는 사람이 말하는 것처럼 자연스럽게 작성하세요.
4. "~입니다", "~됩니다"의 딱딱한 어투 대신 "~거든요", "~에요", "~합니다" 를 자연스럽게 섞어 사용하세요. (단, 1장 제목에는 어떤 서술어도 사용하지 마세요 — 맨 아래 [1장 제목 — 절대 규칙] 참조)
5. 과거·현재·미래 데이터를 반드시 포함하세요. 시간축 비교가 설득력을 만듭니다. 현재 시점은 ${currentYM}이며, 단독으로 인용하는 수치는 반드시 ${oldestYM} 이후의 데이터여야 합니다. 6개월보다 오래된 과거 데이터는 반드시 현재 데이터와 비교하는 용도로만 사용하세요. 예: "2024년 공실률 30%에서 현재 15%로 절반 가까이 줄었다" — 이처럼 과거 수치는 변화폭을 보여주는 비교 기준으로만 쓰고, 과거 수치만 단독으로 언급하지 마세요. 정확한 시점의 데이터를 모르겠으면 수치를 넣지 말고 정성적 표현으로 대체하세요.
6. 구체적인 수치와 사례를 반드시 포함하되, 출처와 시점이 불확실한 수치는 절대 사용하지 마세요. 오래된 데이터를 마치 현재 상황인 것처럼 쓰는 것은 신뢰를 깎습니다. 리서치 데이터에서 제공된 수치만 사용하고, 리서치에 없는 수치는 직접 만들어내지 마세요.
7. 마크다운 강조 문법(*, ** 등)은 절대 사용하지 마세요. 이모지는 허용합니다.
8. 단어를 절대 축약하지 마세요. "리모델링"을 "리모델"로, "브랜딩"을 "브랜"으로 줄이는 등 단어 끝을 자르지 마세요. 글자 수가 길어지더라도 정확한 완전한 단어를 사용하세요.
9. AI가 자동 생성한 티가 나는 정형화된 패턴을 피하세요. 같은 접속어를 반복 사용하거나, 불필요하게 격식체로 포장하거나, 내용 없이 있어 보이기만 하는 표현이 문제입니다. 특정 단어가 금지되는 것이 아니라, 문맥에 맞지 않는 기계적 반복이 문제입니다. 실제 현장 브로커가 고객에게 이야기하듯이 자연스럽게 쓰세요.
10. 실제 현장에서 부동산 브로커가 고객에게 설명하듯이 쓰세요. 교과서나 보고서 톤이 아니라 실무자의 말투입니다.

10-2. [6장 포지션 중립 — 문맥 기반]
  6장은 매수자·매도자 특정 포지션 권고가 아닌, 시장을 보는 범용 통찰 카드입니다.

  [금지] 포지션 권고 표현:
    - "매수 추천", "매수 팁", "매수 타이밍", "매수자는 ~해야"
    - "매도 추천", "매도 팁", "매도 타이밍", "매도자는 ~해야"
    - "진입 추천", "정리 검토 필요", "선점 타이밍", "디딜물건 잡기"

  [허용] 통계 지표·시장 관찰:
    - "법인 매도 64%" (지표)
    - "매수 수요 분산" (시장 관찰)
    - "거래 경쟁 완화 구간" (중립 프레이밍)
    - "회전 신호", "수요 구조", "공급 모멘텀"

  [판단 기준]
    - "무엇을 해야 하는지" 독자에게 권고 → 금지
    - "시장이 어떻게 움직이는지" 관찰·서술 → 허용

  좋은 예:
    - "법인 매도 64% → 시장 회전율 신호"
    - "준주거 필지 거래 소수, 희소성 상승"
    - "신축 프리미엄 vs 노후 리모델링 투트랙"
  나쁜 예:
    - "지금이 매수 타이밍" (권고)
    - "매도자는 프리미엄 방어가 유리" (포지션 특정)

10-3. [카드 본문 간결·명사 중심 톤]
  적용 범위: 카드 2~6장 본문. 1장 숫자 훅, 7장 CTA, 인스타그램 캡션은 제외.
  핵심 원칙:
    - 종결어미 금지: "~요", "~네요", "~더라고요", "~잖아요", "~어요/~아요", "~이에요", "~거든요"
    - 각 bullet은 명사구 또는 -됨/-기/-음/-화 형으로 끊을 것
    - bullet 한 줄당 15자 내외 (길어지면 의미 단위로 분할)
    - 문학적 은유 금지 ("가속대", "무게중심" 류)
  좋은 예:
    - "공실 방어력 탄탄"
    - "주말 유입 강세"
    - "노후 비중 높음 → 리모델링 여지"
  나쁜 예:
    - "공실 방어력이 탄탄해요" (종결어미)
    - "희소성이 만든 무게중심—파고가 와도 가치 축은 흐트러지지 않아요" (은유+장황)

11. 2장부터 마지막 장까지는 "~거든요", "~인데요", "~더라고요" 같은 구어체를 적극 활용하세요. 단, 10-3 규칙이 적용되는 **카드뉴스 2~6장 본문**에서는 종결어미를 제거하고 명사 중심으로 쓰되, 인스타그램 캡션·숏폼·유튜브·스레드·블로그 채널에는 이 구어체 규칙을 그대로 적용합니다. (1장 제목에는 구어체 절대 금지 — 맨 아래 [1장 제목 — 절대 규칙] 참조)

11-1. [뉴스·보도 사실 단정 회피]
  적용: A 3장(개발호재), C 4장(상위권 이유) 및 모든 뉴스 기반 본문.
  - 완료·오픈·준공 등 미래 이벤트의 확정성이 불분명할 때 "예정" 대신 "추진 중/계획/기대"
  - 과거 완료 이벤트는 사실 서술 허용 ("2024년 오픈" 등 검증된 경우만)
  - 불확실한 시점은 연도·분기 단정 금지
  좋은 예: "본사 이전 추진 보도", "신축 오피스 입주 계획"
  나쁜 예: "2026년 준공 예정" (검증 불가), "하반기 오픈 확정"

12. 일상에서 실제로 쓰는 단어만 사용하세요. 한자어를 기계적으로 축약한 단어나 사전에는 있지만 일상에서 거의 쓰지 않는 단어는 절대 사용하지 마세요. 빌딩 중개 실무자가 고객에게 말할 때 쓰는 자연스러운 한국어로만 작성합니다.

    잘못된 예 → 올바른 예:
    - "과가" → "고가" 또는 "비싸게"
    - "저가" (문맥상 어색하면) → "싸게" 또는 "낮은 가격"
    - "매도인" → "파는 쪽" 또는 "매도자"
    - "매수인" → "사는 쪽" 또는 "매수자"
    - "본건" → "이 거래" 또는 "이 건물"
    - "동건" → "이 건" 또는 "같은 사례"
    - "제반" → "전반적인" 또는 "모든"
    - "당해" → "해당" 또는 "그"
    - "유수의" → "손꼽히는" 또는 "유명한"
    - "영위하다" → "하다" 또는 "운영하다"
    - "기시감" → "본 적 있는 느낌"
    - "상정하다" → "가정하다" 또는 "생각하다"
    - "작금" → "요즘" 또는 "최근"
    - "심지어" (과도한 반복) → 문맥에 맞는 자연스러운 접속사
    - "유의미한" → "의미 있는"
    - "도래하다" → "오다" 또는 "다가오다"
    - "~에 다름 아니다" → "~이다" 또는 "결국 ~이다"

    기준: 30대 빌딩 투자자가 카페에서 친구와 대화할 때 자연스럽게 쓸 단어인가? 어색하면 쓰지 마세요.
    법률·계약 문서에서만 쓰는 단어("본건", "당해", "제반", "매도인", "매수인" 등)는 SNS 콘텐츠에서 절대 금지입니다.
    한자어를 한 글자 잘라낸 신조어("과가", "저매", "고매" 등)는 절대 사용 금지입니다.

13. [데이터 프레이밍 — 매수 설득 관점]
   이 콘텐츠의 궁극적 목적은 빌딩 매수를 유도하는 것입니다.
   모든 핵심 지표를 정직하게 인용하되, 해석은 항상 매수자에게 유리한 관점으로 프레이밍하세요.
   수치 자체를 숨기거나 왜곡하지 말고, "그래서 매수자에게 어떤 기회인가"를 함께 제시하세요.

   ■ 긍정 지표 → 그대로 강조:
     - 거래량 증가 → "거래 활발, 유동성 높은 시장"
     - 평당가 상승 → "자산가치 상승 추세, 보유 수익 기대"
     - 법인 매수 비율 높음 → "법인이 선점하는 입지 = 가치 검증 완료"

   ■ 부정 지표 → 매수 기회로 전환 해석 필수:
     - 거래량 감소 → 수치 인용 후 "매수 경쟁 완화, 협상 여지 확대"
     - 평당가 하락/정체 → 수치 인용 후 "조정 구간 진입, 저점 매수 기회"
     - 노후 건물 비중 높음 → "리모델링·증축 여지 풍부, 밸류애드 전략 적합"

   ■ 비교(B 템플릿): 양쪽 모두에 매수 근거 제시. 고가="검증된 프리미엄", 저가="추격 잠재력"
   ■ 랭킹(C 템플릿): 상위권="시장 검증 입지", 중하위="선점 기회"
   ■ 매수 관점 80%, 매도자 관점 20%
   ■ 데이터에 없는 긍정 전망을 창작하지 말 것. 있는 수치 + 기회 해석만.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1장 제목 — 절대 규칙: 이 섹션은 다른 모든 지시보다 최우선]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1장(첫 카드)의 title 필드는 "제목"이 아니라 "라벨"입니다.
문장을 쓰지 말고 박물관 전시 라벨처럼 써야 합니다.
[필수 원칙]의 후킹, 구어체, "~거든요", "~에요" 지시는 1장 제목에 절대 적용하지 마세요.

${template === 'A' ? `[템플릿 A — 1장: 숫자 훅 헤드라인]

필수 조건 (모두 충족해야 함):
① 전체 길이 15자 이내 (공백 포함)
② 공백 제외 글자수 대비 숫자·단위 비율 30% 이상 (숫자: 0-9·한글숫자, 단위: 억·만·원·%·건·위·배·평·㎡·년·월·일·TOP)
③ 지역명은 선택. 숫자 없으면 반드시 탈락
④ 서술어·조사 끌기·물음표·느낌표·마침표·말줄임표 금지
⑤ 부정 지표(감소, 하락, -n%, 급락, 축소) 쓰지 말 것. 긍정·중립 임팩트 지표만

통과 예시:
- 평당 3억 돌파
- 성수 법인매수 68%
- 용산 평당 1.27억
- 거래량 3년래 최고

실패 예시:
✗ "용산구 빌딩 시장 분석" → 숫자 없음
✗ "성수동이 조용히 움직여요" → 서사형+서술어
✗ "최근 3년 서울 빌딩 누가 샀을까" → 길이초과+서사형
✗ "강남 거래 -40%" → 부정 지표` :

template === 'B' ? `[템플릿 B — 1장: 두 지역 비교 격차 헤드라인]

필수 조건 (모두 충족해야 함):
① 전체 길이 20자 이내
② 두 지역 이름 또는 "vs" 포함
③ 격차 숫자 최소 1개 (배수/퍼센트/건수 차이 등)
④ 서술어·물음표·느낌표 금지
⑤ 마침표·말줄임표·중간점·이모지 금지

통과 예시:
- 강남 vs 서초 거래 2.4배
- 성수 vs 청담 평당가 1.5배
- 역삼 vs 삼성 격차 40%
- 종로 vs 중구 거래 2배

실패 예시:
✗ "강남과 서초의 거래를 비교해봤어요" → 서사형·서술어
✗ "강남 vs 서초, 어디가 나을까?" → 질문형

제목 작성 전 자문: "두 지역이 있나? 격차 숫자가 있나? 20자 이내인가?" — 하나라도 아니면 다시 작성.` :

`[템플릿 C — 1장: TOP N 랭킹 헤드라인]

필수 조건 (모두 충족해야 함):
① "{지역범위} {기간 or 설명} — {랭킹 기준}" 형식
② 전체 길이 15~35자
③ 줄표(—) 또는 하이픈(-) 또는 물결(~) 1개 이상 포함
④ 서술어·물음표 금지

통과 예시:
- 서울 25개 구 — 거래량 TOP 10
- 강남 동별 — 평당가 TOP 5
- 서울 2026 1~4월 — 거래 집중
- 성동 동별 — 거래량 랭킹

실패 예시:
✗ "서울 25개 구의 거래량을 살펴보겠습니다" → AI 말투·서술어
✗ "어떤 구가 거래량 1위일까요?" → 질문형`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1장 제목을 쓴 후 반드시 위 체크리스트로 자가 점검하세요.
하나라도 실패하면 다시 쓰세요. 이 규칙이 실패하면 전체 콘텐츠가 실패로 간주됩니다.

[분석 방식 제한]
CAP Rate(자본환원율), NOI 기반 수익률 계산 등의 분석 방식은 사용하지 마세요.
이 방식은 프라임급 대형 오피스나 해외 시장에서 주로 사용되며, 한국 중소형 빌딩 시장에서는 일반적으로 적용하지 않습니다.
대신 아래 분석 포인트를 활용하세요:
- 평당 매매가 비교 (주변 시세 대비)
- 임대 수익률 (월 임대료 기준 단순 수익률)
- 거래량 변화 추이
- 상권 활성도 변화 (유동인구, 브랜드 입점, 공실률)
- 권리금 수준 변화
- 개발 호재 (재개발, 교통 인프라 등)
- 건축연도 대비 가격 메리트
사용자가 "직접 입력" 모드에서 CAP Rate 분석을 명시적으로 요청한 경우에만 적용하세요.

${wantInstagram ? templateStructure + '\n\n' : ''}[채널별 출력 — 아래 JSON 스키마를 정확히 따르세요]

${[
  wantInstagram ? `인스타그램 (insta):
- cards: 7개 객체 배열, 각각 { tag, title, style }
  - style 배분: 1장 dark, 2장 light, 3장 accent, 4장 light, 5장 dark, 6장 accent, 7장 cta
- caption: 캡션 + 해시태그 8-12개 (하나의 문자열)` : '',
  wantShortform ? `숏폼 (short) — 사용자의 실제 행동 단위로 구분:
- filming: 촬영용 스크립트. 촬영 현장에서 이것만 보고 촬영할 수 있도록. 제목, 컨셉 1~2줄, 초별 대사(0-3초 훅, 3-10초 문제, 10-20초 핵심, 20-27초 인사이트, 27-30초 CTA), 촬영 팁. 모든 대사는 실제로 말할 수 있는 자연스러운 구어체로. (하나의 문자열)
- reelsUpload: 릴스 업로드용. 인스타 릴스 업로드 시 캡션란에 그대로 붙여넣을 수 있도록. 캡션 텍스트 + 해시태그 10-15개 + 커버/연동 팁을 한 블록으로. (하나의 문자열)
- shortsUpload: 쇼츠 업로드용. 유튜브 쇼츠 업로드 시 제목과 설명란에 바로 쓸 수 있도록. 제목(40자 이내) + 설명란 텍스트 + 해시태그 5-8개 + 본채널 유도 멘트를 한 블록으로. (하나의 문자열)` : '',
  wantYoutube ? `유튜브 (youtube):
- title: 영상 제목 (하나의 문자열)
- script: 7-8분 롱폼 스크립트 (하나의 문자열)
- description: 설명란 + 타임스탬프 + 해시태그 (하나의 문자열)` : '',
  wantThread ? `스레드 (threads) — 반말투 필수:
- post: 반말투로 작성한 글 200~300자 (데이터나 수치 1~2개 포함하여 전문성 확보. 하나의 문자열)
- "~했다", "~인 듯", "~인데", "~거든", "~같아", "~임" 등 자연스러운 반말 사용
- 딱딱한 존댓말("~합니다", "~하세요") 사용 금지
- 친구에게 부동산 이야기하듯 편하고 솔직한 톤
- 이모지 1~2개 자연스럽게 사용
- 예: "성수동 빌딩 거래량이 미쳤다. 2월만 300% 폭증이라니. 이건 진짜 한 번 살펴볼 필요 있음 🔥"` : '',
  wantBlog ? `블로그 (blog):
- post: SEO 최적화 긴 글 1500-2000자 + SEO 키워드 (하나의 문자열)` : '',
].filter(Boolean).join('\n\n')}
${wantImageIdeas ? `\n[이미지 아이디어 — imageIdeas]
각 카드뉴스 배경 이미지에 사용할 시각적 아이디어를 영어로 7개 작성하세요.
- 주제의 핵심 키워드와 직접 연관된 구체적인 시각적 장면을 묘사하세요
- 추상적 도시 실루엣 같은 일반적 이미지는 피하세요
- 각 카드마다 다른 시각적 요소를 사용하세요 (반복 금지)
${template === 'A' ? `- 2장 (건물 프로필)에는 해당 건물 또는 거리의 시각화를 포함하세요:
  - 건축 일러스트 스타일, 주변 상권 맥락이 느껴지는 구도
  - 예: "Architectural illustration of a commercial building in Seongsu-dong Yeonmujang-gil, surrounded by trendy cafes and popup stores, street-level perspective, clean modern style"` : template === 'B' ? `- 2장 (비교의 축)에는 반드시 해당 지역의 지도 일러스트를 포함하세요:
  - 조감도(aerial view) 스타일, 비교 대상 지역들을 모두 포함한 광역 지도, 각 비교군을 마커로 표시
  - 예: "Aerial view map illustration of Seoul commercial districts comparing Gangnam and Seongsu, both areas highlighted with distinct colored zones and markers, modern minimal cartographic style"` : `- 2장 (핵심 지표)에는 데이터 시각화 또는 해당 지역 조감도를 포함하세요:
  - 차트/그래프 느낌 또는 도시 조감도 중 주제에 맞게 선택
  - 예: "Aerial view map of Seongdong-gu Seoul with data visualization overlay, key metrics displayed as floating cards with numbers, modern infographic style"`}\n` : ''}
반드시 아래 정확한 JSON 구조로만 응답하세요. 키 이름을 절대 변경하지 마세요.
모든 값은 문자열(string) 타입이어야 합니다. 객체나 배열로 넣지 마세요 (cards, imageIdeas 제외).
JSON 외의 텍스트, 마크다운 코드블록(\`\`\`)은 포함하지 마세요.

{
  "region": "이 콘텐츠의 주요 지역명 (예: 성수동, 강남역). 지역이 특정되지 않으면 서울"${[
  wantInstagram ? `,
  "insta": {
    "cards": [
${templateCardsExample}
    ],
    "caption": "캡션 텍스트 전체를 하나의 문자열로"
  }` : '',
  wantImageIdeas ? `,
  "imageIdeas": [
    "Detailed English description of scene for card 1",
    "Aerial view map illustration of [area] for card 2",
    "Scene description for card 3",
    "Scene description for card 4",
    "Scene description for card 5",
    "Scene description for card 6",
    "Scene description for card 7"
  ]` : '',
  wantShortform ? `,
  "short": {
    "filming": "촬영용 스크립트 전체를 하나의 문자열로",
    "reelsUpload": "릴스 업로드용 전체를 하나의 문자열로",
    "shortsUpload": "쇼츠 업로드용 전체를 하나의 문자열로"
  }` : '',
  wantYoutube ? `,
  "youtube": {
    "title": "영상 제목",
    "script": "롱폼 스크립트 전체를 하나의 문자열로",
    "description": "설명란 전체를 하나의 문자열로"
  }` : '',
  wantThread ? `,
  "threads": {
    "post": "스레드 게시글 전체를 하나의 문자열로"
  }` : '',
  wantBlog ? `,
  "blog": {
    "post": "블로그 글 전체를 하나의 문자열로"
  }` : '',
].join('')}
}`;

  // 학습 데이터가 있으면 시스템 프롬프트에 추가
  const fullSystemContent = learningCtx ? systemContent + '\n' + learningCtx : systemContent;

  console.log('[DEBUG] System prompt 길이:', fullSystemContent.length);
  console.log('[DEBUG] 학습 컨텍스트 포함:', learningCtx ? '있음 (' + learningCtx.length + '자)' : '없음');
  console.log('[DEBUG] System prompt 마지막 200자:', systemContent.slice(-200));
  console.log('[DEBUG] User message 길이:', userContent.length);
  console.log('[DEBUG] User message 앞 200자:', userContent.slice(0, 200));

  const tGptCall = Date.now();
  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 12000,
    reasoning_effort: 'low' as any,
    messages: [
      { role: 'user', content: fullSystemContent + '\n\n' + userContent }
    ]
  });
  console.log(`[generateContent] GPT 응답 — ${Date.now() - tGptCall}ms (input tokens: ${res.usage?.prompt_tokens}, output: ${res.usage?.completion_tokens})`);

  const text = res.choices[0]?.message?.content || '{}';
  console.log('[GPT 원본 응답 (처음 800자)]', text.slice(0, 800));

  const parsed = safeParseGPTJson(text);
  if (parsed) {
    console.log('[GPT 파싱 성공] 최상위 키:', Object.keys(parsed));
    const result = normalizeResult(parsed);

    // 1장 제목 규칙 검증 + 재생성 (최대 2회 재시도) — instagram 채널 요청 시에만
    if (!wantInstagram) {
      console.log('[1장 제목 검증] instagram 채널 미요청 — 스킵');
      return result;
    }
    console.log('[1장 제목 검증] 시작 — 템플릿:', template);
    try {
      const firstCard = result.instagram?.cards?.[0];
      if (!firstCard) {
        console.log('[1장 제목 검증] instagram.cards[0]이 없음 — 스킵');
      } else if (!firstCard.title) {
        console.log('[1장 제목 검증] title이 비어있음 — 스킵');
      } else {
        const originalTitle = firstCard.title;
        console.log(`[1장 제목 검증] 원본: "${originalTitle}" (${originalTitle.length}자)`);
        let currentTitle = firstCard.title;
        const topicForRetry = analysis.topic || input.slice(0, 200);

        for (let attempt = 1; attempt <= 2; attempt++) {
          const errors = validateFirstCardTitle(currentTitle, template);
          if (errors.length === 0) {
            console.log(`[1장 제목 검증] 시도 ${attempt} 통과:`, currentTitle);
            break;
          }
          console.log(`[1장 제목 검증] 시도 ${attempt} 실패 (${errors.join(', ')}) — "${currentTitle}"`);
          const newTitle = await regenerateFirstCardTitle(currentTitle, template, errors, topicForRetry);
          if (newTitle) {
            console.log(`[1장 제목 검증] 시도 ${attempt} 재생성 결과: "${newTitle}"`);
            currentTitle = newTitle;
          } else {
            console.log('[1장 제목 검증] 재생성 API 실패 — 원본 유지');
            break;
          }
        }

        const finalErrors = validateFirstCardTitle(currentTitle, template);
        if (finalErrors.length > 0) {
          console.log(`[1장 제목 검증] 최종 실패 (${finalErrors.join(', ')}) — 원본 유지: "${originalTitle}"`);
        } else if (currentTitle !== originalTitle) {
          console.log(`[1장 제목 검증] 교체 완료: "${originalTitle}" → "${currentTitle}"`);
          firstCard.title = currentTitle;
        } else {
          console.log('[1장 제목 검증] 원본이 이미 통과 — 변경 없음');
        }
      }
    } catch (e: any) {
      console.log('[1장 제목 검증] 예외:', e.message, e.stack);
    }
    console.log('[1장 제목 검증] 종료');

    return result;
  }
  return getEmptyResult();
}

// ─── regionStats를 GPT 프롬프트용 텍스트로 변환 ───
function formatRegionStats(regionStats: any): string {
  if (!regionStats) return '';
  const parts: string[] = [];

  const formatPrice = (amount: number): string => {
    if (!amount || amount <= 0) return '0원';
    const eok = amount / 10000;
    if (eok >= 1) return eok.toFixed(eok >= 10 ? 0 : 1) + '억';
    return amount + '만원';
  };

  const formatPP = (pp: number): string => {
    if (!pp || pp <= 0) return '0';
    if (pp >= 10000) return (pp / 10000).toFixed(2) + '억/평';
    return pp + '만/평';
  };

  const formatRegion = (r: any): string => {
    if (!r) return '';
    let s = r.sido || '';
    if (r.sgg) s += ' ' + r.sgg;
    if (r.dong) s += ' ' + r.dong;
    return s.trim();
  };

  parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  parts.push('[지역 통계 컨텍스트 — 실제 실거래가 DB 집계 결과]');
  parts.push('이 섹션의 수치는 국토교통부 실거래가 데이터를 집계한 실제 값입니다.');
  parts.push('GPT는 임의로 숫자를 만들지 말고 이 데이터만 인용하세요.');
  parts.push('모든 수치 인용 시 반드시 기간(예: "2026.01~2026.04 기준")을 함께 명시하세요.');
  parts.push('통계가 0이거나 없으면 "데이터 부족"으로 정직하게 표현하세요.');
  parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  parts.push('');

  if (regionStats.type === 'single') {
    const s = regionStats;
    parts.push(`◆ 분석 대상: ${formatRegion(s.region)}`);
    parts.push(`◆ 분석 기간(당기): ${s.currentPeriodLabel}`);
    parts.push(`◆ 전년 동기: ${s.prevPeriodLabel}`);
    parts.push('');

    if (s.error) {
      parts.push(`⚠ 데이터 집계 실패: ${s.error}`);
      parts.push('');
      return parts.join('\n');
    }

    parts.push(`[당기 핵심 지표 (${s.currentPeriodLabel} 기준)]`);
    parts.push(`- 거래 건수: ${s.current.totalCount}건`);
    parts.push(`- 평균 매매가: ${formatPrice(s.current.avgPrice)}`);
    parts.push(`- 평균 평당가(토지): ${formatPP(s.current.avgPricePerPyeong)}`);
    parts.push(`- 평균 연면적 평당가: ${formatPP(s.current.avgPricePerArea)}`);
    parts.push(`- 법인 매수 비율: ${s.current.buyerCorpRatio}%`);
    parts.push(`- 법인 매도 비율: ${s.current.sellerCorpRatio}%`);
    parts.push('');

    parts.push(`[전년 동기 대비 변화 (${s.currentPeriodLabel} vs ${s.prevPeriodLabel})]`);
    const ch = s.changes || {};
    if (ch.totalCount !== null && ch.totalCount !== undefined) parts.push(`- 거래 건수: ${ch.totalCount > 0 ? '+' : ''}${ch.totalCount}%`);
    else parts.push(`- 거래 건수 변화: 전년 데이터 부족`);
    if (ch.avgPrice !== null && ch.avgPrice !== undefined) parts.push(`- 평균 매매가: ${ch.avgPrice > 0 ? '+' : ''}${ch.avgPrice}%`);
    if (ch.avgPricePerPyeong !== null && ch.avgPricePerPyeong !== undefined) parts.push(`- 평당가: ${ch.avgPricePerPyeong > 0 ? '+' : ''}${ch.avgPricePerPyeong}%`);
    if (ch.avgPricePerArea !== null && ch.avgPricePerArea !== undefined) parts.push(`- 연면적 평당가: ${ch.avgPricePerArea > 0 ? '+' : ''}${ch.avgPricePerArea}%`);
    parts.push('');

    if (s.rankings) {
      parts.push(`[${s.region.sgg}의 서울 내 상대적 위상 (${s.currentPeriodLabel} 기준, ${s.rankings.totalSggCount}개 구 중)]`);
      if (s.rankings.totalCount) parts.push(`- 거래량: ${s.rankings.totalCount}위`);
      if (s.rankings.avgPrice) parts.push(`- 평균 매매가: ${s.rankings.avgPrice}위`);
      if (s.rankings.avgPricePerPyeong) parts.push(`- 평당가(토지): ${s.rankings.avgPricePerPyeong}위`);
      if (s.rankings.avgPricePerArea) parts.push(`- 연면적 평당가: ${s.rankings.avgPricePerArea}위`);
      if (s.rankings.buyerCorpRatio) parts.push(`- 법인 매수 비율: ${s.rankings.buyerCorpRatio}위`);
      parts.push('');
    }

    if (s.dongRankings) {
      const dr = s.dongRankings;
      parts.push(`[${s.region.dong}의 구·서울 내 위상 (${s.currentPeriodLabel} 기준)]`);
      parts.push(`- ${s.region.sgg}의 서울 내 위상 (${dr.sggInSeoul.totalSggCount}개 구 중):`);
      if (dr.sggInSeoul.totalCount) parts.push(`  · 거래량 ${dr.sggInSeoul.totalCount}위`);
      if (dr.sggInSeoul.avgPricePerPyeong) parts.push(`  · 평당가 ${dr.sggInSeoul.avgPricePerPyeong}위`);
      parts.push(`- ${s.region.dong}의 ${s.region.sgg} 내 위상 (${dr.dongInSgg.totalDongCount}개 동 중):`);
      if (dr.dongInSgg.totalCount) parts.push(`  · 거래량 ${dr.dongInSgg.totalCount}위`);
      if (dr.dongInSgg.avgPricePerPyeong) parts.push(`  · 평당가 ${dr.dongInSgg.avgPricePerPyeong}위`);
      parts.push('');
    }

    if (s.halves && s.halves.length > 0) {
      parts.push(`[반기별 추이 (2024 상반기 ~ 2026 상반기)]`);
      s.halves.forEach((h: any) => {
        if (h.totalCount > 0) {
          parts.push(`- ${h.label}: 거래 ${h.totalCount}건, 평균 ${formatPrice(h.avgPrice)}, 평당가 ${formatPP(h.avgPricePerPyeong)}, 법인매수 ${h.buyerCorpRatio}%`);
        } else {
          parts.push(`- ${h.label}: 거래 데이터 없음`);
        }
      });
      parts.push('');
    }

    if (s.current.highest) {
      const h = s.current.highest;
      parts.push(`[${s.currentPeriodLabel} 중 최고 평당가 거래]`);
      parts.push(`- ${h.umdNm || ''} ${h.jibun || ''} (${h.buildYear || '연도미상'}년 준공): ${formatPP(h.pricePerPyeong)}, ${formatPrice(h.dealAmount)}`);
      parts.push('');
    }
    if (s.current.lowest && s.current.lowest !== s.current.highest) {
      const l = s.current.lowest;
      parts.push(`[${s.currentPeriodLabel} 중 최저 평당가 거래]`);
      parts.push(`- ${l.umdNm || ''} ${l.jibun || ''} (${l.buildYear || '연도미상'}년 준공): ${formatPP(l.pricePerPyeong)}, ${formatPrice(l.dealAmount)}`);
      parts.push('');
    }

    if (!s.region.dong && s.current.byDong && s.current.byDong.length > 0) {
      const top = s.current.byDong.slice().sort((a: any, b: any) => b.count - a.count).slice(0, 5);
      parts.push(`[${s.region.sgg} 내 거래량 상위 동 (${s.currentPeriodLabel} 기준)]`);
      top.forEach((d: any, i: number) => {
        parts.push(`${i + 1}위. ${d.name}: ${d.count}건, 평균 ${formatPrice(d.avgPrice)}, 평당가 ${formatPP(d.avgPricePerPyeong)}`);
      });
      parts.push('');
    }

    const byY = s.current.byBuildYear;
    if (byY && Object.values(byY).some((v: any) => v > 0)) {
      parts.push(`[건축연도별 거래 분포 (${s.currentPeriodLabel} 기준)]`);
      Object.entries(byY).forEach(([k, v]: any) => {
        if (v > 0) parts.push(`- ${k}: ${v}건`);
      });
      parts.push('');
    }

    if (s.current.byLandUse && Object.keys(s.current.byLandUse).length > 0) {
      const topUses = Object.entries(s.current.byLandUse).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
      parts.push(`[용도지역별 거래 분포 (${s.currentPeriodLabel} 기준)]`);
      topUses.forEach(([k, v]: any) => parts.push(`- ${k}: ${v}건`));
      parts.push('');
    }
  }

  if (regionStats.type === 'compare') {
    const r1 = regionStats.region1;
    const r2 = regionStats.region2;
    parts.push(`◆ 비교 대상: ${formatRegion(r1.region)} vs ${formatRegion(r2.region)}`);
    parts.push(`◆ 분석 기간(당기): ${r1.currentPeriodLabel}`);
    parts.push('');

    const formatRegionBlock = (label: string, s: any): string[] => {
      const lines: string[] = [];
      lines.push(`[${label}: ${formatRegion(s.region)} (${s.currentPeriodLabel} 기준)]`);
      if (s.error) {
        lines.push(`- 데이터 집계 실패: ${s.error}`);
        return lines;
      }
      lines.push(`- 거래 건수: ${s.current.totalCount}건`);
      lines.push(`- 평균 매매가: ${formatPrice(s.current.avgPrice)}`);
      lines.push(`- 평균 평당가(토지): ${formatPP(s.current.avgPricePerPyeong)}`);
      lines.push(`- 평균 연면적 평당가: ${formatPP(s.current.avgPricePerArea)}`);
      lines.push(`- 법인 매수 비율: ${s.current.buyerCorpRatio}%`);
      const ch = s.changes || {};
      lines.push(`- 전년 동기 거래량 변화: ${ch.totalCount !== null && ch.totalCount !== undefined ? (ch.totalCount > 0 ? '+' : '') + ch.totalCount + '%' : '데이터 부족'}`);
      lines.push(`- 전년 동기 평당가 변화: ${ch.avgPricePerPyeong !== null && ch.avgPricePerPyeong !== undefined ? (ch.avgPricePerPyeong > 0 ? '+' : '') + ch.avgPricePerPyeong + '%' : '데이터 부족'}`);
      if (s.rankings) {
        lines.push(`- 서울 ${s.rankings.totalSggCount}개 구 중 거래량 ${s.rankings.totalCount || '-'}위, 평당가 ${s.rankings.avgPricePerPyeong || '-'}위`);
      }
      return lines;
    };

    parts.push(...formatRegionBlock('지역 1', r1));
    parts.push('');
    parts.push(...formatRegionBlock('지역 2', r2));
    parts.push('');

    if (!r1.error && !r2.error) {
      parts.push(`[두 지역 간 격차 (${r1.currentPeriodLabel} 기준)]`);
      const countDiff = r1.current.totalCount - r2.current.totalCount;
      const priceDiff = r1.current.avgPrice - r2.current.avgPrice;
      parts.push(`- 거래 건수 차이: ${Math.abs(countDiff)}건 (${countDiff > 0 ? formatRegion(r1.region) + ' 우위' : countDiff < 0 ? formatRegion(r2.region) + ' 우위' : '동일'})`);
      if (priceDiff !== 0) {
        parts.push(`- 평균 매매가 차이: ${formatPrice(Math.abs(priceDiff))} (${formatRegion(priceDiff > 0 ? r1.region : r2.region)} 높음)`);
      }
      if (r1.current.avgPricePerPyeong > 0 && r2.current.avgPricePerPyeong > 0) {
        const ppRatio = (r1.current.avgPricePerPyeong / r2.current.avgPricePerPyeong).toFixed(2);
        parts.push(`- 평당가 비율: ${formatRegion(r1.region)} / ${formatRegion(r2.region)} = ${ppRatio}배`);
      }
      parts.push('');
    }

    const halvesBlock = (s: any) => {
      if (s.halves && s.halves.length > 0) {
        parts.push(`[${formatRegion(s.region)} 반기 추이 (2024 상반기~2026 상반기)]`);
        s.halves.forEach((h: any) => {
          if (h.totalCount > 0) parts.push(`- ${h.label}: 거래 ${h.totalCount}건, 평당가 ${formatPP(h.avgPricePerPyeong)}`);
        });
        parts.push('');
      }
    };
    halvesBlock(r1);
    halvesBlock(r2);
  }

  if (regionStats.type === 'ranking') {
    const r = regionStats;
    parts.push(`◆ 랭킹 대상: ${formatRegion(r.region)} ${r.scope === 'dong' ? '내 동별' : '내 구별'}`);
    parts.push(`◆ 분석 기간: ${r.currentPeriodLabel}`);
    parts.push('');

    if (r.error) {
      parts.push(`⚠ 데이터 집계 실패: ${r.error}`);
      parts.push('');
      return parts.join('\n');
    }

    const metricLabelMap: any = {
      totalCount: '거래 건수',
      avgPrice: '평균 매매가',
      avgPricePerPyeong: '평균 평당가(토지)',
      avgPricePerArea: '평균 연면적 평당가',
      corpBuyerRatio: '법인 매수 비율',
      buyerCorpRatio: '법인 매수 비율',
      count: '거래 건수'
    };

    const sortField = r.sortField || (r.scope === 'dong' && r.rankBy === 'totalCount' ? 'count' : r.rankBy);
    const label = metricLabelMap[r.rankBy] || r.rankBy;

    parts.push(`[${label} 랭킹 TOP 10 (${r.currentPeriodLabel} 기준)]`);
    const top = r.items.slice(0, 10);
    top.forEach((item: any, i: number) => {
      const val = item[sortField];
      let display = '';
      if (val === undefined || val === null) display = '데이터 없음';
      else if (r.rankBy === 'avgPrice') display = formatPrice(val);
      else if (r.rankBy === 'avgPricePerPyeong' || r.rankBy === 'avgPricePerArea') display = formatPP(val);
      else if (r.rankBy === 'corpBuyerRatio' || r.rankBy === 'buyerCorpRatio') display = val + '%';
      else display = val + '건';
      parts.push(`${i + 1}위. ${item.name}: ${display}`);
    });
    parts.push('');
  }

  parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  parts.push('[통계 컨텍스트 사용 지침 — 반드시 지킬 것]');
  parts.push('1. 카드뉴스에 인용하는 모든 수치는 위 섹션의 값만 사용하세요. 없는 숫자를 창작하지 마세요.');
  parts.push('2. 모든 수치 옆에 기간을 표시하세요. 예: "평당 1.5억 (2026.01~2026.04 기준)", "+20% (전년 동기 대비)"');
  parts.push('3. "구 내 N위", "서울 내 M위" 같은 상대적 위상은 기준 수와 기간을 함께 제시하세요.');
  parts.push('   예: "서울 25개 구 중 거래량 3위 (2026.01~2026.04 기준)"');
  parts.push('4. 데이터가 0이거나 없으면 "데이터 부족", "최근 거래 없음"으로 정직하게 표현하세요.');
  parts.push('5. 반기 추이는 "2024 상반기 대비 +40%" 같은 비교 인용에 활용하세요.');
  parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return parts.join('\n');
}

function buildResearchSummary(research: ResearchData): string {
  const parts: string[] = [];

  if (research.naverNews.length > 0) {
    parts.push('[네이버 뉴스]');
    research.naverNews.slice(0, 8).forEach((n, i) => {
      parts.push(`${i + 1}. ${n.title}: ${n.description}`);
    });
  }

  if (research.transactions.length > 0) {
    parts.push('\n[실거래 데이터]');
    research.transactions.forEach((t) => {
      parts.push(`- ${t.area} | ${t.price} | ${t.date}`);
    });
  }

  if (research.googleResults.length > 0) {
    parts.push('\n[추가 자료]');
    research.googleResults.slice(0, 5).forEach((g, i) => {
      parts.push(`${i + 1}. ${g.title}: ${g.snippet}`);
    });
  }

  return parts.length > 0 ? parts.join('\n') : '리서치 데이터 없음 — 내부 지식 기반으로 작성하세요.';
}

// 객체/배열을 읽기 좋은 문자열로 변환
function toStr(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(toStr).join('\n');
  if (typeof val === 'object') {
    // { title, structure, tip } 같은 객체를 줄바꿈 연결
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v, null, 2) : v}`)
      .join('\n');
  }
  return String(val);
}

function normalizeResult(raw: any): ContentResult {
  // GPT 응답 키명 변형 대응
  const ig = raw.insta || raw.instagram || {};
  const sf = raw.short || raw.shortform || raw.shortForm || {};
  const th = raw.threads || raw.thread || {};

  console.log('[normalizeResult] insta 키:', Object.keys(ig));
  console.log('[normalizeResult] short 키:', Object.keys(sf));
  console.log('[normalizeResult] threads 키:', Object.keys(th));
  console.log('[normalizeResult] reels type:', typeof ig.reels);
  console.log('[normalizeResult] short.script type:', typeof sf.script);

  return {
    region: toStr(raw.region) || '',
    instagram: {
      cards: Array.isArray(ig.cards) ? ig.cards.slice(0, 7) : [],
      caption: toStr(ig.caption),
    },
    imageIdeas: Array.isArray(raw.imageIdeas) ? raw.imageIdeas.map(String) : [],
    shortform: {
      filming: toStr(sf.filming || sf.script),
      reelsUpload: toStr(sf.reelsUpload || sf.reelsTip || sf.reels_tip),
      shortsUpload: toStr(sf.shortsUpload || sf.shortsTip || sf.shorts_tip),
    },
    youtube: {
      title: toStr(raw.youtube?.title),
      script: toStr(raw.youtube?.script),
      description: toStr(raw.youtube?.description)
    },
    thread: {
      post: toStr(th.post)
    },
    blog: {
      post: toStr(raw.blog?.post)
    }
  };
}

function getEmptyResult(): ContentResult {
  return {
    region: '',
    instagram: { cards: [], caption: '' },
    imageIdeas: [],
    shortform: { filming: '', reelsUpload: '', shortsUpload: '' },
    youtube: { title: '', script: '', description: '' },
    thread: { post: '' },
    blog: { post: '' }
  };
}

// ══════════════════════════════════════════════════════════
// URL 기사 내용 추출
// ══════════════════════════════════════════════════════════
async function extractArticle(url: string): Promise<string> {
  try {
    const resp = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html: string = resp.data;
    // 간단한 텍스트 추출: script/style 제거 후 태그 제거
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // 앞부분 4000자 정도만 사용
    return cleaned.slice(0, 4000);
  } catch {
    return '';
  }
}

// ══════════════════════════════════════════════════════════
// B-1a: 채널별 분배 헬퍼
// ──────────────────────────────────────────────────────────
// 단일 GPT 응답(ContentResult)에서 채널별 슬라이스를 추출.
// B-1b에서 채널별 독립 GPT 호출로 확장 시 동일 인터페이스 유지.
// ══════════════════════════════════════════════════════════
function extractInstagramFromResponse(result: ContentResult, _ctx: ContentContext): InstagramChannel {
  const ig = result.instagram || ({} as any);
  const cap = String(ig.caption || '');
  const hashtags = (cap.match(/#\S+/g) || []);
  return {
    cards: Array.isArray(ig.cards) ? ig.cards : [],
    caption: cap,
    hashtags,
    imageIdeas: Array.isArray(result.imageIdeas) ? result.imageIdeas : []
  };
}
function extractShortformFromResponse(result: ContentResult, _ctx: ContentContext): ShortformChannel {
  const sf = result.shortform || ({} as any);
  return {
    filming: String(sf.filming || ''),
    reelsUpload: String(sf.reelsUpload || ''),
    shortsUpload: String(sf.shortsUpload || '')
  };
}
function extractYoutubeFromResponse(result: ContentResult, _ctx: ContentContext): YoutubeChannel {
  const y = result.youtube || ({} as any);
  return {
    title: String(y.title || ''),
    script: String(y.script || ''),
    description: String(y.description || '')
  };
}
function extractThreadFromResponse(result: ContentResult, _ctx: ContentContext): ThreadChannel {
  const t = result.thread || ({} as any);
  return { post: String(t.post || '') };
}
function extractBlogFromResponse(result: ContentResult, _ctx: ContentContext): BlogChannel {
  const b = result.blog || ({} as any);
  return { post: String(b.post || '') };
}

function buildSessionMeta(regionStats: any): ContentContext['sessionMeta'] | undefined {
  if (!regionStats) return undefined;
  if (regionStats.type === 'single' || regionStats.type === 'ranking') {
    return {
      currentPeriod: regionStats.currentPeriodLabel,
      comparisonPeriod: regionStats.prevPeriodLabel
    };
  }
  if (regionStats.type === 'compare') {
    return {
      currentPeriod: regionStats.region1?.currentPeriodLabel,
      comparisonPeriod: regionStats.region1?.prevPeriodLabel
    };
  }
  return undefined;
}

// ══════════════════════════════════════════════════════════
// 메인 엔트리
// ══════════════════════════════════════════════════════════
export async function generateAllContent(
  mode: 'url' | 'text',
  input: string,
  template: 'A' | 'B' | 'C' = 'A',
  regionStats: any = null,
  options: {
    channels?: ChannelKey[];
    contentHash?: string;
    region?: string;
    region1?: string;
    region2?: string;
    rankBy?: string;
  } = {}
): Promise<ContentResult & { contentHash?: string }> {
  const channels: ChannelKey[] = options.channels && options.channels.length > 0 ? options.channels : ['instagram'];
  const tStart = Date.now();
  console.log(`[generateAllContent] 시작 — template: ${template}, mode: ${mode}, channels: [${channels.join(',')}], input: "${input.slice(0, 50)}"`);

  // URL 모드: 기사 내용 추출
  let contentInput = input;
  if (mode === 'url') {
    const tExtract = Date.now();
    const article = await extractArticle(input);
    contentInput = article || input;
    console.log(`[generateAllContent] URL 추출 — ${Date.now() - tExtract}ms`);
  }

  // A단계: 입력 분석
  const tAnalyze = Date.now();
  const analysis = await analyzeInput(contentInput);
  console.log(`[generateAllContent] 입력 분석 — ${Date.now() - tAnalyze}ms`);

  // B단계: 리서치
  const tResearch = Date.now();
  const research = await doResearch(analysis);
  console.log(`[generateAllContent] doResearch 완료 — ${Date.now() - tResearch}ms`);

  // C단계: 콘텐츠 생성 (B-1b: channels 배열에 따라 동적 스키마)
  const sessionMeta = buildSessionMeta(regionStats);
  const ctx: ContentContext = {
    topic: analysis?.topic || input.slice(0, 100),
    template, mode, input,
    contentInput,
    region: options.region,
    region1: options.region1,
    region2: options.region2,
    rankBy: options.rankBy,
    analysis, research, regionStats,
    sessionMeta
  };

  // ContentContext 캐시 (B-1b: 채널별 후속 호출용)
  const contentHash = options.contentHash || computeContentHash({
    input, template,
    region: options.region, region1: options.region1, region2: options.region2, rankBy: options.rankBy
  });
  await contextCache.set(contentHash, ctx);

  const tGen = Date.now();
  const result = await generateContent(contentInput, analysis, research, template, regionStats, channels);
  console.log(`[generateAllContent] generateContent 완료 — ${Date.now() - tGen}ms`);

  // sessionMeta 주입 (기간 배지용 실제 기간 값)
  if (sessionMeta) result.sessionMeta = sessionMeta;

  // B-1a: nested 채널 구조도 함께 반환 (additive — 기존 nested 필드 그대로 유지)
  result.channels = {
    instagram: extractInstagramFromResponse(result, ctx),
    shortform: extractShortformFromResponse(result, ctx),
    youtube: extractYoutubeFromResponse(result, ctx),
    thread: extractThreadFromResponse(result, ctx),
    blog: extractBlogFromResponse(result, ctx),
    sessionMeta
  };
  (result as any).contentHash = contentHash;

  console.log(`[generateAllContent] 전체 — ${Date.now() - tStart}ms`);
  return result;
}

// ─── B-1b: 캐시된 ctx로 단일 채널만 생성 ───
export async function generateChannelFromContext(
  contentHash: string,
  channel: ChannelKey
): Promise<ContentResult> {
  const ctx = await contextCache.get(contentHash);
  if (!ctx) {
    const err: any = new Error('CONTEXT_CACHE_MISS');
    err.code = 'CONTEXT_CACHE_MISS';
    throw err;
  }
  const tStart = Date.now();
  console.log(`[generateChannelFromContext] 시작 — hash: ${contentHash}, channel: ${channel}`);

  const contentInput = ctx.contentInput || ctx.input;
  const result = await generateContent(
    contentInput,
    ctx.analysis,
    ctx.research,
    ctx.template,
    ctx.regionStats,
    [channel]
  );
  if (ctx.sessionMeta) result.sessionMeta = ctx.sessionMeta;

  // nested 채널 구조도 함께 반환 (요청한 채널만 의미 있음)
  result.channels = {
    instagram: extractInstagramFromResponse(result, ctx),
    shortform: extractShortformFromResponse(result, ctx),
    youtube: extractYoutubeFromResponse(result, ctx),
    thread: extractThreadFromResponse(result, ctx),
    blog: extractBlogFromResponse(result, ctx),
    sessionMeta: ctx.sessionMeta
  };

  console.log(`[generateChannelFromContext] 완료 — ${Date.now() - tStart}ms`);
  return result;
}

// ─── 단일 카드 재생성 ───
export async function regenerateSingleCard(params: {
  cardIndex: number;
  template: 'A' | 'B' | 'C';
  topic: string;
  previousCards: any[];
  previousContent: any;
  regionStats?: any;
}): Promise<{ card: any }> {
  const { cardIndex, template, topic, previousCards, previousContent, regionStats } = params;

  if (cardIndex === 6) {
    throw new Error('7장 CTA 카드는 재생성할 수 없습니다');
  }
  if (cardIndex < 0 || cardIndex > 5) {
    throw new Error(`cardIndex 범위 오류: ${cardIndex} (0~5만 허용)`);
  }
  if (!Array.isArray(previousCards) || previousCards.length === 0) {
    throw new Error('previousCards가 비어있습니다');
  }

  const targetCard = previousCards[cardIndex] || previousContent || {};
  const fixedTag = targetCard.tag || '';
  const fixedStyle = targetCard.style || 'light';

  const otherCardsText = previousCards
    .map((c: any, i: number) => i === cardIndex ? null : `${i + 1}. [${c?.tag || ''}] ${c?.title || ''}`)
    .filter(Boolean)
    .join('\n');

  const regionStatsBlock = regionStats ? formatRegionStats(regionStats) : '';

  const isFirstCard = cardIndex === 0;
  const firstCardRule = isFirstCard ? (
    template === 'A'
      ? '\n- A 1장 절대 규칙: 15자 이내, 공백 제외 숫자·단위 비율 30%+, 부정 지표(감소/하락/-n%/급락/축소) 금지, 서술어·물음표·느낌표·마침표·말줄임표 금지'
      : template === 'B'
      ? '\n- B 1장 절대 규칙: 20자 이내, 두 지역 이름 또는 "vs" 포함, 격차 숫자 1개 이상, 서술어·문장부호·중간점 금지'
      : '\n- C 1장 절대 규칙: 15~35자, 줄표(—)/하이픈(-)/물결(~) 1개 이상 포함, 서술어·물음표 금지'
  ) : '';

  const prompt = `다음 SNS 카드뉴스의 ${cardIndex + 1}장(0-based: ${cardIndex})을 재생성한다.
사용자가 현재 내용에 만족하지 못해 재생성을 요청했다. 이전과 명확히 다른 접근으로 더 임팩트 있는 버전 작성.

[템플릿]: ${template}
[전체 주제]: ${topic}

[해당 카드 고정값 — 절대 변경 금지]
- tag: ${fixedTag}
- style: ${fixedStyle}

[이전 title — 반드시 다른 표현으로 대체]
${previousContent?.title || targetCard.title || ''}

[다른 카드 맥락 — 톤·중복 방지용 (수정 금지, 참고만)]
${otherCardsText}
${regionStatsBlock ? `\n[지역 통계 데이터]\n${regionStatsBlock}\n` : ''}
[규칙]
- title 한 개만 새로 작성
- tag와 style은 위 고정값 그대로 유지
- 이전 title과 명확히 다른 단어·각도 사용
- 다른 카드와 수치·표현 중복 금지
- 마크다운 금지, 이모지 허용${firstCardRule}

[재생성 주의사항]
- "이전 내용과 다른 접근" = 다른 관점·각도에서 해석. 더 많은 정보 나열이 아님.
- title 필드는 [필수 원칙] 10-3 준수: 각 줄 15자 내외, 명사구 중심, 종결어미 금지.
- 기간(YYYY.MM~YYYY.MM)은 본문에 반복 금지. 좌상단 배지로 이미 표시됨.
- bullet 4~6개 이내로 간결하게.
- 재생성 결과가 이전보다 길어지면 탈락 (이전 title 글자수 + 30자를 초과하지 말 것).

JSON 형식으로만 응답:
{"card": {"tag": "${fixedTag}", "title": "...", "style": "${fixedStyle}"}}`;

  const tRegenStart = Date.now();
  console.log(`[regenerateSingleCard] 시작 — idx=${cardIndex}, template=${template}, tag=${fixedTag}`);

  const tRegenGpt = Date.now();
  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 1500,
    reasoning_effort: 'low' as any,
    messages: [{ role: 'user', content: prompt }]
  });
  console.log(`[regenerateSingleCard] GPT 완료 — ${Date.now() - tRegenGpt}ms (input tokens: ${res.usage?.prompt_tokens}, output: ${res.usage?.completion_tokens})`);

  const text = res.choices[0]?.message?.content || '{}';
  console.log('[카드 재생성 GPT 응답]', text.slice(0, 500));

  const parsed = safeParseGPTJson(text);
  if (!parsed || !parsed.card) {
    throw new Error('GPT 응답 파싱 실패');
  }

  // 6장 재생성 길이·기간 반복 가드 (cardIndex === 5)
  if (cardIndex === 5) {
    const previousLen = (previousContent?.title || targetCard.title || '').length;
    const newLen = (parsed.card?.title || '').length;
    if (previousLen > 0 && newLen > previousLen + 30 && newLen > previousLen * 1.3) {
      console.warn(`[6장 재생성 길이 가드] 이전 ${previousLen}자 → 새 ${newLen}자 (${Math.round((newLen / previousLen) * 100)}%) — 너무 길어졌을 가능성. 사용자 확인 권장.`);
    }
    const periodPattern = /\d{4}\.\d{1,2}\s*~\s*\d{4}\.\d{1,2}/g;
    const periodMatches = (parsed.card?.title || '').match(periodPattern);
    if (periodMatches && periodMatches.length >= 1) {
      console.warn(`[6장 재생성 기간 반복] 본문에 기간 ${periodMatches.length}회 등장: ${periodMatches.join(', ')} — 배지 중복 가능성.`);
    }
  }

  const newCard: any = {
    tag: fixedTag,
    title: String(parsed.card.title || '').trim(),
    style: fixedStyle
  };

  if (!newCard.title) {
    throw new Error('재생성된 title이 비어있습니다');
  }

  // 1장 재생성 시 검증 루프 (최대 2회)
  if (isFirstCard) {
    let currentTitle = newCard.title;
    const originalTitle = currentTitle;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const errors = validateFirstCardTitle(currentTitle, template);
      if (errors.length === 0) {
        console.log(`[1장 재생성 검증] 시도 ${attempt} 통과: "${currentTitle}"`);
        break;
      }
      console.log(`[1장 재생성 검증] 시도 ${attempt} 실패 (${errors.join(', ')}) — "${currentTitle}"`);
      const fixed = await regenerateFirstCardTitle(currentTitle, template, errors, topic);
      if (fixed) {
        console.log(`[1장 재생성 검증] 시도 ${attempt} 보정 결과: "${fixed}"`);
        currentTitle = fixed;
      } else {
        break;
      }
    }
    const finalErrors = validateFirstCardTitle(currentTitle, template);
    if (finalErrors.length === 0) {
      newCard.title = currentTitle;
    } else {
      console.log(`[1장 재생성 검증] 최종 실패 (${finalErrors.join(', ')}) — 새 title 유지: "${originalTitle}"`);
    }
  }

  console.log(`[regenerateSingleCard] 전체 — ${Date.now() - tRegenStart}ms`);
  return { card: newCard };
}
