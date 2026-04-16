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
    if (t.length > 20) errors.push(`길이 초과 (${t.length}자 > 20자)`);
    if (!/[0-9]/.test(t)) errors.push('숫자 없음');
    if (/[.?!]/.test(t)) errors.push('마침표·물음표·느낌표 포함');
    if (t.includes(',')) errors.push('쉼표 포함');
    if (/[—–]/.test(t)) errors.push('줄표(—) 포함');
    if (hasEllipsis) errors.push('말줄임표(…) 포함');
    if (hasMiddleDot) errors.push('중간점(·) 포함');
    if (hasEmoji) errors.push('이모지 포함');
    if (forbiddenEnd.test(t)) errors.push('서술어 종결');
    if (narrativeNounEnd.test(t)) errors.push('서사형 명사 종결(이유/비결/방법 등)');
  } else if (template === 'B') {
    if (t.length > 25) errors.push(`길이 초과 (${t.length}자 > 25자)`);
    if (!/[0-9]/.test(t)) errors.push('금액 숫자 없음');
    if (/[?!]/.test(t)) errors.push('물음표·느낌표 포함');
    if (hasEllipsis) errors.push('말줄임표(…) 포함');
    if (hasEmoji) errors.push('이모지 포함');
    if (forbiddenEnd.test(t)) errors.push('서술어 종결');
  } else if (template === 'C') {
    if (t.length < 15) errors.push(`길이 부족 (${t.length}자 < 15자)`);
    if (t.length > 40) errors.push(`길이 초과 (${t.length}자 > 40자)`);
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
    ? `[템플릿 A 규칙 — 반드시 모두 만족]
- 전체 길이 20자 이내 (공백 포함)
- 숫자(0-9) 최소 1개 포함
- 마침표·쉼표·물음표·느낌표·줄표 금지
- 서술어("~요", "~다", "~까", "~죠") 금지
- 박물관 전시 라벨처럼 압축된 명사구
- 좋은 예시: "평당 3억 돌파" / "법인 매수 68%" / "10년 만에 10배" / "성동 TOP5 격차 2배" / "평당가 1억→3억"
- 나쁜 예시: "성동구 평당가 차이가 벌어진다" / "성동구, 격차 2배까지 벌어져요"`
    : template === 'B'
    ? `[템플릿 B 규칙 — 반드시 모두 만족]
- 전체 길이 25자 이내
- 지역명 또는 건물명 포함
- 구체적 금액(숫자+억/만) 포함
- 서술어·물음표·느낌표 금지
- 좋은 예시: "성수동 110억 평당 3억" / "역삼 F&F별관 232억 매각"`
    : `[템플릿 C 규칙 — 반드시 모두 만족]
- 형식: "{지역} {기간} — {성격 규정}"
- 15~40자 범위
- 줄표(—) 또는 하이픈(-) 1개 포함
- 서술어·물음표 금지
- 좋은 예시: "성동구 2026 1분기 — 거래 회복과 법인 집중"`;

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
  const data: ResearchData = { naverNews: [], transactions: [], googleResults: [] };

  // (1) 네이버 뉴스 검색
  const keywords = analysis.search_keywords || [analysis.topic || '부동산'];
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

  // (3) Brave Search
  const bravePromise = (async () => {
    try {
      const braveKey = process.env.BRAVE_API_KEY;
      if (!braveKey) return [];
      const kw = analysis.search_keywords[0] + ' 빌딩 부동산';
      const resp = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: { q: kw, count: 5, search_lang: 'ko' },
        headers: { 'X-Subscription-Token': braveKey, 'Accept': 'application/json' },
        timeout: 5000
      });
      return (resp.data.web?.results || []).map((it: any) => ({
        title: it.title || '',
        snippet: it.description || ''
      }));
    } catch { return []; }
  })();

  const [naverResults, txResults, braveResults] = await Promise.all([
    Promise.all(naverPromises),
    transactionPromise,
    bravePromise
  ]);

  data.naverNews = naverResults.flat();
  data.transactions = txResults;
  data.googleResults = braveResults;

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
}

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
  template: 'A' | 'B' | 'C' = 'A'
): Promise<ContentResult> {
  const researchSummary = buildResearchSummary(research);
  const toneNote = analysis.tone_request ? `\n[사용자 요청 톤] ${analysis.tone_request}` : '';

  // 학습 데이터 참조 컨텍스트 추가
  const learningCtx = buildLearningContext();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const currentYM = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const oldestYM = `${sixMonthsAgo.getFullYear()}년 ${sixMonthsAgo.getMonth() + 1}월`;

  // 템플릿별 카드 구조 + JSON 예시 태그
  const templateStructure = template === 'B' ? `[카드뉴스 구조 — 템플릿 B: 거래 스토리 (반드시 7장)]
1장 (거래 헤드라인): 이 거래의 핵심 한 줄 — 평당 얼마, 총 얼마, 어디서
2장 (건물 프로필): 대지·연면적·준공연도·용도·입지 특징을 서사로 풀어냅니다
3장 (가격 분석): 평당가·매매가가 권역 평균 대비 어떤 위치인지 수치로 제시
4장 (매수자 분석): 법인/개인/SI/자산운용 등 매수 주체와 그 의도 추론
5장 (시장 맥락): 이 거래가 지역·시장에 주는 시그널, 주변 거래와의 연결성
6장 (브로커 인사이트): BSN 실무 관점에서 이 거래를 어떻게 해석해야 하는가
7장 (CTA): 마지막 카드. 형식: "{지역명}의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"
  예: "성수동의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"
  절대 하지 말 것: 구체적 매물 정보 언급, 자료 제공 약속, 서비스 제안, 가격/면적/수익률 수치 포함 유인 문구
  지역명을 특정할 수 없는 일반 주제의 경우: "빌딩 매매의 더 많은 정보가 궁금하다면 프로필 링크 클릭"
각 장표는 캡처하고 싶을 정도로 임팩트 있게 작성하세요.` :
template === 'C' ? `[카드뉴스 구조 — 템플릿 C: 시장 브리핑 (반드시 7장)]
1장 (제목): {지역} {기간} 시장 브리핑 — 한 문장으로 이번 기간의 성격을 요약
2장 (핵심 지표): 거래량·평균가·법인비율 등 이번 기간 핵심 수치 3~4개를 병렬로
3장 (동별 순위): 거래량 또는 평당가 TOP 5 동의 랭킹을 수치와 함께
4장 (주요 거래): 이번 기간 특이 거래 1~2건의 구체적 사례 (건물 프로필·가격·매수자)
5장 (투자 시그널): 법인 매수 추이·용도 비중·지역 집중도 등 구조적 변화 지표
6장 (BSN 전망): 앞 카드들을 종합한 단기 전망, 매수자·매도자별 포지셔닝 권고
7장 (CTA): 마지막 카드. 형식: "{지역명}의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"
  절대 하지 말 것: 구체적 매물 정보 언급, 자료 제공 약속
  지역명을 특정할 수 없는 일반 주제의 경우: "빌딩 매매의 더 많은 정보가 궁금하다면 프로필 링크 클릭"
각 장표는 캡처하고 싶을 정도로 임팩트 있게 작성하세요.` :
`[카드뉴스 구조 — 템플릿 A: 데이터 임팩트 (반드시 7장)]
1장 (숫자 훅): 이번 콘텐츠의 가장 임팩트 있는 숫자 하나 — "평당 3억 돌파" 같은 헤드
2장 (비교의 축): 무엇과 무엇을 비교하는지 명확히 — 지역 vs 지역, 기간 vs 기간, 섹터 vs 섹터
3장 (데이터 1): 첫 번째 비교군의 핵심 수치와 그 의미
4장 (데이터 2): 두 번째 비교군의 핵심 수치와 그 의미
5장 (격차·변곡): 두 비교군 간 격차 또는 변곡점을 수치로 드러냅니다
6장 (전문가 코멘트): BSN 관점에서 이 데이터가 시장에 주는 의미 해석
7장 (CTA): 마지막 카드. 형식: "{지역명}의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"
  절대 하지 말 것: 구체적 매물 정보 언급, 자료 제공 약속
  지역명을 특정할 수 없는 일반 주제의 경우: "빌딩 매매의 더 많은 정보가 궁금하다면 프로필 링크 클릭"
각 장표는 캡처하고 싶을 정도로 임팩트 있게 작성하세요.`;

  const templateCardsExample = template === 'B' ? `      {"tag": "거래 헤드라인", "title": "...", "style": "dark"},
      {"tag": "건물 프로필", "title": "...", "style": "light"},
      {"tag": "가격 분석", "title": "...", "style": "accent"},
      {"tag": "매수자 분석", "title": "...", "style": "light"},
      {"tag": "시장 맥락", "title": "...", "style": "dark"},
      {"tag": "브로커 인사이트", "title": "...", "style": "accent"},
      {"tag": "CTA", "title": "...", "style": "cta"}` :
template === 'C' ? `      {"tag": "제목", "title": "...", "style": "dark"},
      {"tag": "핵심 지표", "title": "...", "style": "light"},
      {"tag": "동별 순위", "title": "...", "style": "accent"},
      {"tag": "주요 거래", "title": "...", "style": "light"},
      {"tag": "투자 시그널", "title": "...", "style": "dark"},
      {"tag": "BSN 전망", "title": "...", "style": "accent"},
      {"tag": "CTA", "title": "...", "style": "cta"}` :
`      {"tag": "숫자 훅", "title": "...", "style": "dark"},
      {"tag": "비교의 축", "title": "...", "style": "light"},
      {"tag": "데이터 1", "title": "...", "style": "accent"},
      {"tag": "데이터 2", "title": "...", "style": "light"},
      {"tag": "격차·변곡", "title": "...", "style": "dark"},
      {"tag": "전문가 코멘트", "title": "...", "style": "accent"},
      {"tag": "CTA", "title": "...", "style": "cta"}`;

  const userContent = `[사용자 입력]
${input}

[분석 결과]
주제: ${analysis.topic}
의도: ${analysis.intent}
${toneNote}

[리서치 데이터]
${researchSummary}

위 정보를 종합하여 5개 채널(인스타그램, 숏폼, 유튜브, 스레드, 블로그)의 콘텐츠를 생성해주세요.`;

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
11. 2장부터 마지막 장까지는 "~거든요", "~인데요", "~더라고요" 같은 구어체를 적극 활용하세요. 딱딱한 문어체보다 말하듯이 쓴 글이 더 자연스럽습니다. (1장 제목에는 구어체 절대 금지 — 맨 아래 [1장 제목 — 절대 규칙] 참조)

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1장 제목 — 절대 규칙: 이 섹션은 다른 모든 지시보다 최우선]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1장(첫 카드)의 title 필드는 "제목"이 아니라 "라벨"입니다.
문장을 쓰지 말고 박물관 전시 라벨처럼 써야 합니다.
[필수 원칙]의 후킹, 구어체, "~거든요", "~에요" 지시는 1장 제목에 절대 적용하지 마세요.

${template === 'A' ? `[템플릿 A — 1장 라벨 규칙]

형식: 명사구 / 숫자 포함 / 20자 이내

체크리스트 (모두 YES여야 함):
☐ 공백 포함 20자 이내인가?
☐ 숫자(0-9)가 최소 1개 포함되었는가?
☐ 마침표(.), 쉼표(,), 물음표(?), 줄표(—) 중 하나도 없는가?
☐ "~요", "~다", "~까", "~죠", "~세요" 같은 서술어 종결이 없는가?
☐ 문장이 아니라 박물관 전시 라벨처럼 압축되었는가?

통과 예시 (이 스타일로만):
- 평당 3억 돌파
- 법인 매수 68%
- 10년 만에 10배
- 거래량 -40%
- 평균 67억
- 성수 TOP5 격차 2배
- 동별 평당가 1억→3억
- 법인 비율 38→68
- 3개구 격차 2.3배

실패 예시 (절대 이렇게 쓰지 말 것):
✗ "성수동 평당가만 보면, 빌딩 매수가 두 번 흔들려요" → 문장형·서술어·쉼표·길이초과·숫자없음
✗ "동별 격차가 '임대료'와 '권리금'으로 바로 번집니다" → 서술어·길이초과·숫자없음
✗ "성동구, 같은 성동이라도 평당가 차이가 2배까지 벌어진다" → 서술어·길이초과·쉼표
✗ "평당가 2배 차이, 알고 계셨나요?" → 물음표·서술어·쉼표
✗ "법인이 조용히 판을 바꾸고 있어요" → 서술어·숫자없음

작성 절차:
1. 이 콘텐츠의 가장 중요한 숫자 1개를 정한다 (예: 2.3배)
2. 그 숫자를 둘러싼 맥락을 2~4단어로 압축한다 (예: "성동 TOP5 격차")
3. 둘을 붙여서 20자 이내 명사구를 만든다 (예: "성동 TOP5 격차 2.3배")
4. 체크리스트 5개 모두 YES인지 확인한다
5. 하나라도 NO면 처음부터 다시 쓴다` : template === 'B' ? `[템플릿 B — 1장 라벨 규칙]

형식: 지역명 + 금액 / 명사구 / 25자 이내

체크리스트:
☐ 25자 이내인가?
☐ 지역명 또는 건물명이 포함되었는가?
☐ 구체적 금액 또는 평당가가 포함되었는가?
☐ 서술어·질문형·마침표·줄표가 없는가?
☐ 신문 헤드라인처럼 압축되었는가?

통과 예시:
- 성수동 110억, 평당 3억 돌파
- 역삼 F&F별관 232억 매각
- 청담 노후빌딩 10년 만에 2배
- 여의도 오피스 627억 손바뀜

실패 예시:
✗ "성수동에서 최근 거래된 건물이 화제가 되고 있어요" → 서술어·길이초과
✗ "성수동 110억 거래, 왜 의미가 있을까요?" → 물음표·서술어
✗ "이 거래를 보면 시장이 보입니다" → 서술어·구체성없음` : `[템플릿 C — 1장 라벨 규칙]

형식: "{지역} {기간} — {성격 규정}" / 25~30자

체크리스트:
☐ "지역 기간 — 성격" 3요소가 모두 있는가?
☐ 줄표(—)가 1개만 있는가?
☐ 25~30자 범위인가?
☐ 서술어·질문형이 없는가?

통과 예시:
- 성동구 2026 1분기 — 거래 회복과 법인 집중
- 강남 3구 4월 — 고가 갱신의 달
- 서울 오피스 상반기 — 양극화 심화
- 송파 1분기 — 거래량 급증

실패 예시:
✗ "성동구 시장 분석을 해보겠습니다" → AI 말투·서술어·형식 미충족
✗ "2026년 1분기 강남은 어떤 변화가 있었을까요?" → 질문형
✗ "성동구 1분기 브리핑" → 성격 규정 누락`}

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

${templateStructure}

[채널별 출력 — 아래 JSON 스키마를 정확히 따르세요]

인스타그램 (insta):
- cards: 7개 객체 배열, 각각 { tag, title, style }
  - style 배분: 1장 dark, 2장 light, 3장 accent, 4장 light, 5장 dark, 6장 accent, 7장 cta
- caption: 캡션 + 해시태그 8-12개 (하나의 문자열)

숏폼 (short) — 사용자의 실제 행동 단위로 구분:
- filming: 촬영용 스크립트. 촬영 현장에서 이것만 보고 촬영할 수 있도록. 제목, 컨셉 1~2줄, 초별 대사(0-3초 훅, 3-10초 문제, 10-20초 핵심, 20-27초 인사이트, 27-30초 CTA), 촬영 팁. 모든 대사는 실제로 말할 수 있는 자연스러운 구어체로. (하나의 문자열)
- reelsUpload: 릴스 업로드용. 인스타 릴스 업로드 시 캡션란에 그대로 붙여넣을 수 있도록. 캡션 텍스트 + 해시태그 10-15개 + 커버/연동 팁을 한 블록으로. (하나의 문자열)
- shortsUpload: 쇼츠 업로드용. 유튜브 쇼츠 업로드 시 제목과 설명란에 바로 쓸 수 있도록. 제목(40자 이내) + 설명란 텍스트 + 해시태그 5-8개 + 본채널 유도 멘트를 한 블록으로. (하나의 문자열)

유튜브 (youtube):
- title: 영상 제목 (하나의 문자열)
- script: 7-8분 롱폼 스크립트 (하나의 문자열)
- description: 설명란 + 타임스탬프 + 해시태그 (하나의 문자열)

스레드 (threads) — 반말투 필수:
- post: 반말투로 작성한 글 200~300자 (데이터나 수치 1~2개 포함하여 전문성 확보. 하나의 문자열)
- "~했다", "~인 듯", "~인데", "~거든", "~같아", "~임" 등 자연스러운 반말 사용
- 딱딱한 존댓말("~합니다", "~하세요") 사용 금지
- 친구에게 부동산 이야기하듯 편하고 솔직한 톤
- 이모지 1~2개 자연스럽게 사용
- 예: "성수동 빌딩 거래량이 미쳤다. 2월만 300% 폭증이라니. 이건 진짜 한 번 살펴볼 필요 있음 🔥"

블로그 (blog):
- post: SEO 최적화 긴 글 1500-2000자 + SEO 키워드 (하나의 문자열)

[이미지 아이디어 — imageIdeas]
각 카드뉴스 배경 이미지에 사용할 시각적 아이디어를 영어로 7개 작성하세요.
- 주제의 핵심 키워드와 직접 연관된 구체적인 시각적 장면을 묘사하세요
- 추상적 도시 실루엣 같은 일반적 이미지는 피하세요
- 각 카드마다 다른 시각적 요소를 사용하세요 (반복 금지)
${template === 'A' ? `- 2장 (비교의 축)에는 반드시 해당 지역의 지도 일러스트를 포함하세요:
  - 조감도(aerial view) 스타일, 비교 대상 지역들을 모두 포함한 광역 지도, 각 비교군을 마커로 표시
  - 예: "Aerial view map illustration of Seoul commercial districts comparing Gangnam and Seongsu, both areas highlighted with distinct colored zones and markers, modern minimal cartographic style"` : template === 'B' ? `- 2장 (건물 프로필)에는 해당 건물 또는 거리의 시각화를 포함하세요:
  - 건축 일러스트 스타일, 주변 상권 맥락이 느껴지는 구도
  - 예: "Architectural illustration of a commercial building in Seongsu-dong Yeonmujang-gil, surrounded by trendy cafes and popup stores, street-level perspective, clean modern style"` : `- 2장 (핵심 지표)에는 데이터 시각화 또는 해당 지역 조감도를 포함하세요:
  - 차트/그래프 느낌 또는 도시 조감도 중 주제에 맞게 선택
  - 예: "Aerial view map of Seongdong-gu Seoul with data visualization overlay, key metrics displayed as floating cards with numbers, modern infographic style"`}

반드시 아래 정확한 JSON 구조로만 응답하세요. 키 이름을 절대 변경하지 마세요.
모든 값은 문자열(string) 타입이어야 합니다. 객체나 배열로 넣지 마세요 (cards, imageIdeas 제외).
JSON 외의 텍스트, 마크다운 코드블록(\`\`\`)은 포함하지 마세요.

{
  "region": "이 콘텐츠의 주요 지역명 (예: 성수동, 강남역). 지역이 특정되지 않으면 서울",
  "insta": {
    "cards": [
${templateCardsExample}
    ],
    "caption": "캡션 텍스트 전체를 하나의 문자열로"
  },
  "imageIdeas": [
    "Detailed English description of scene for card 1",
    "Aerial view map illustration of [area] for card 2",
    "Scene description for card 3",
    "Scene description for card 4",
    "Scene description for card 5",
    "Scene description for card 6",
    "Scene description for card 7"
  ],
  "short": {
    "filming": "촬영용 스크립트 전체를 하나의 문자열로",
    "reelsUpload": "릴스 업로드용 전체를 하나의 문자열로",
    "shortsUpload": "쇼츠 업로드용 전체를 하나의 문자열로"
  },
  "youtube": {
    "title": "영상 제목",
    "script": "롱폼 스크립트 전체를 하나의 문자열로",
    "description": "설명란 전체를 하나의 문자열로"
  },
  "threads": {
    "post": "스레드 게시글 전체를 하나의 문자열로"
  },
  "blog": {
    "post": "블로그 글 전체를 하나의 문자열로"
  }
}`;

  // 학습 데이터가 있으면 시스템 프롬프트에 추가
  const fullSystemContent = learningCtx ? systemContent + '\n' + learningCtx : systemContent;

  console.log('[DEBUG] System prompt 길이:', fullSystemContent.length);
  console.log('[DEBUG] 학습 컨텍스트 포함:', learningCtx ? '있음 (' + learningCtx.length + '자)' : '없음');
  console.log('[DEBUG] System prompt 마지막 200자:', systemContent.slice(-200));
  console.log('[DEBUG] User message 길이:', userContent.length);
  console.log('[DEBUG] User message 앞 200자:', userContent.slice(0, 200));

  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 12000,
    reasoning_effort: 'low' as any,
    messages: [
      { role: 'user', content: fullSystemContent + '\n\n' + userContent }
    ]
  });

  const text = res.choices[0]?.message?.content || '{}';
  console.log('[GPT 원본 응답 (처음 800자)]', text.slice(0, 800));

  const parsed = safeParseGPTJson(text);
  if (parsed) {
    console.log('[GPT 파싱 성공] 최상위 키:', Object.keys(parsed));
    const result = normalizeResult(parsed);

    // 1장 제목 규칙 검증 + 재생성 (최대 2회 재시도)
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
// 메인 엔트리
// ══════════════════════════════════════════════════════════
export async function generateAllContent(
  mode: 'url' | 'text',
  input: string,
  template: 'A' | 'B' | 'C' = 'A'
): Promise<ContentResult> {
  // URL 모드: 기사 내용 추출
  let contentInput = input;
  if (mode === 'url') {
    const article = await extractArticle(input);
    contentInput = article || input;
  }

  // A단계: 입력 분석
  const analysis = await analyzeInput(contentInput);

  // B단계: 리서치
  const research = await doResearch(analysis);

  // C단계: 콘텐츠 생성
  const result = await generateContent(contentInput, analysis, research, template);

  return result;
}
