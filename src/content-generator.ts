import OpenAI from 'openai';
import axios from 'axios';
import { buildLearningContext } from './learn-store';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-5';

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
      model: MODEL,
      max_completion_tokens: 1000,
      reasoning_effort: 'low' as any,
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
      const results: any[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
        try {
          const resp = await axios.get(
            'http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcNrgTrade',
            { params: { serviceKey: apiKey, LAWD_CD: regionCode, DEAL_YMD: dealYmd, pageNo: 1, numOfRows: 10 }, timeout: 5000 }
          );
          const items = resp.data?.response?.body?.items?.item;
          if (Array.isArray(items)) {
            results.push(...items.map((it: any) => ({
              area: `${it['시군구']} ${it['법정동'] || ''}`.trim(),
              price: `${it['거래금액'] || ''}만원`.trim(),
              date: `${it['년']}년 ${it['월']}월`
            })));
          }
        } catch { /* skip month */ }
      }
      return results.slice(0, 10);
    } catch { return []; }
  })();

  // (3) 구글 검색 (선택적)
  const googlePromise = (async () => {
    try {
      const gKey = process.env.GOOGLE_API_KEY;
      const gCx = process.env.GOOGLE_CX;
      if (!gKey || !gCx) return [];
      const kw = analysis.search_keywords[0] + ' 빌딩 부동산';
      const resp = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key: gKey, cx: gCx, q: kw, num: 5, lr: 'lang_ko' },
        timeout: 5000
      });
      return (resp.data.items || []).map((it: any) => ({
        title: it.title,
        snippet: it.snippet
      }));
    } catch { return []; }
  })();

  const [naverResults, txResults, gResults] = await Promise.all([
    Promise.all(naverPromises),
    transactionPromise,
    googlePromise
  ]);

  data.naverNews = naverResults.flat();
  data.transactions = txResults;
  data.googleResults = gResults;

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
  research: ResearchData
): Promise<ContentResult> {
  const researchSummary = buildResearchSummary(research);
  const toneNote = analysis.tone_request ? `\n[사용자 요청 톤] ${analysis.tone_request}` : '';

  // 학습 데이터 참조 컨텍스트 추가
  const learningCtx = buildLearningContext();

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
1. 후킹: 모든 결과물의 첫 문장(카드뉴스 1장 포함)은 독자가 스크롤을 멈추고 '이건 나한테 해당되는 얘기인데?' 또는 '이거 안 보면 나만 손해겠는데?'라고 느끼게 만들어야 합니다. 이 느낌을 주는 구체적이고 도발적인 문장을 직접 작성하세요. 가이드라인 문구를 그대로 쓰지 마세요. 예시: '강남역 건물주들이 조용히 빠지고 있습니다', '이 법 바뀐 거 모르면 세금 2배 냅니다', '성수동 임대료, 작년이 마지막 기회였습니다' 같이 주제에 맞는 구체적 훅을 만드세요.
2. 직접적이고, 구체적이고, 이해하기 쉽게 쓰세요.
3. AI가 쓴 것 같지 않게, 실제 현장 경험이 있는 사람이 말하는 것처럼 자연스럽게 작성하세요.
4. "~입니다", "~됩니다"의 딱딱한 어투 대신 "~거든요", "~에요", "~합니다" 를 자연스럽게 섞어 사용하세요.
5. 과거·현재·미래 데이터를 반드시 포함하세요. 시간축 비교가 설득력을 만듭니다.
6. 구체적인 수치와 사례를 반드시 포함하세요. 막연한 표현 금지.
7. 마크다운 강조 문법(*, ** 등)은 절대 사용하지 마세요. 이모지는 허용합니다.
8. 단어를 절대 축약하지 마세요. "리모델링"을 "리모델"로, "브랜딩"을 "브랜"으로 줄이는 등 단어 끝을 자르지 마세요. 글자 수가 길어지더라도 정확한 완전한 단어를 사용하세요.

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

[카드뉴스 구조 — 반드시 7장, 슬라이드당 핵심 1개]
1장 (문제 제기): 대다수가 간과하고 있는 현상을 짚어줍니다
2장 (손해 인식): 이걸 모르면 어떤 손해를 보는지 구체적으로 보여줍니다
3장 (관점 전환): 뻔한 사실 뒤에 숨겨진 진짜 핵심을 드러냅니다
4장 (해결 방법): 실질적인 해결책이나 접근법을 제시합니다
5장 (증거): 구체적 수치, 데이터, 사례로 뒷받침합니다
6장 (결심): 행동하지 않으면 벌어질 격차를 보여줍니다
7장 (CTA): 마지막 카드. 형식: "{지역명}의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"
  예: "성수동의 더 많은 정보와 매물이 궁금하다면 프로필 링크 클릭"
  절대 하지 말 것: 구체적 매물 정보 언급, 자료 제공 약속, 서비스 제안, 가격/면적/수익률 수치 포함 유인 문구
  이유: 빌딩 매매 중개는 매물 자료 보안이 중요하여 직접 만나서 신원 확인 전까지 자료 제공을 자제합니다.
  지역명을 특정할 수 없는 일반 주제의 경우: "빌딩 매매의 더 많은 정보가 궁금하다면 프로필 링크 클릭" 처럼 주제를 지역명 자리에 넣어 자연스럽게 작성하세요.
각 장표는 캡처나 저장하고 싶을 정도로 임팩트 있게 작성하세요.

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
- 2장 (손해 인식)에는 반드시 해당 지역의 지도 일러스트를 포함하세요:
  - 조감도(aerial view) 스타일, 핵심 영역 하이라이트, 마커 표시
  - 예: "Aerial view map illustration of Seongsu-dong area in Seoul, highlighting key commercial zones with glowing markers, nearby Han River visible, subway line 2 route marked, modern minimal cartographic style"

반드시 아래 정확한 JSON 구조로만 응답하세요. 키 이름을 절대 변경하지 마세요.
모든 값은 문자열(string) 타입이어야 합니다. 객체나 배열로 넣지 마세요 (cards, imageIdeas 제외).
JSON 외의 텍스트, 마크다운 코드블록(\`\`\`)은 포함하지 마세요.

{
  "region": "이 콘텐츠의 주요 지역명 (예: 성수동, 강남역). 지역이 특정되지 않으면 서울",
  "insta": {
    "cards": [
      {"tag": "문제 제기", "title": "...", "style": "dark"},
      {"tag": "손해 인식", "title": "...", "style": "light"},
      {"tag": "관점 전환", "title": "...", "style": "accent"},
      {"tag": "해결 방법", "title": "...", "style": "light"},
      {"tag": "증거", "title": "...", "style": "dark"},
      {"tag": "결심", "title": "...", "style": "accent"},
      {"tag": "CTA", "title": "...", "style": "cta"}
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
    max_completion_tokens: 16000,
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
    return normalizeResult(parsed);
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
  input: string
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
  const result = await generateContent(contentInput, analysis, research);

  return result;
}
