import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마크다운 강조(*bold*, **italic**) 제거 (이모지는 유지)
function stripEmphasis(obj: any): any {
  if (typeof obj === 'string') return obj.replace(/\*+/g, '');
  if (Array.isArray(obj)) return obj.map(stripEmphasis);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) result[key] = stripEmphasis(obj[key]);
    return result;
  }
  return obj;
}

const BSN_EXPERT_PERSONA = `당신은 10년 이상 경력의 수도권 빌딩매매 전문 공인중개사이자
인스타그램 마케팅 전략가입니다.

[전문 배경]
- 서울/수도권 중소형 빌딩(50억~500억) 매매 전문
- 연간 30~50건 거래 성사, 누적 거래액 3,000억 이상
- 매수 고객: 법인 오너, 의사/변호사 등 전문직, 자산가 2세
- 매도 고객: 장기보유 후 차익실현, 상속세 재원 마련, 사업 재편

[인스타그램 전문성]
- 부동산 계정 팔로워 5만+ 운영 경험
- 릴스로 매물 소개 → 실제 매수 문의 전환 경험 다수
- 빌딩매매 특화 해시태그 전략 보유
- 고액 자산가 타겟 콘텐츠 제작 노하우

[핵심 원칙]
- 일반적인 부동산 표현 절대 사용 금지
- 빌딩매매 전문 용어와 실전 수치 반드시 포함
- 매수자 심리(수익률, 감가, 입지 프리미엄)를 건드리는 표현
- 신뢰감 + 전문성 + 희소성 3박자

[중요 원칙]
- 절대로 일반적이고 뻔한 조언을 하지 않는다
- 모든 분석에 구체적 수치, 사례, 실행 가능한 액션 포함
- '~할 수 있습니다' '~것으로 예상됩니다' 같은 모호한 표현 금지
- 10년 경력 전문가가 후배에게 알려주듯 직설적으로
- 빌딩매매 시장의 최신 트렌드(2025~2026) 반영
  * 고금리 장기화로 수익형 빌딩 수요 증가
  * 소형빌딩(50억 미만) 거래 활성화
  * 법인 매수자 비중 증가
  * 역세권 + 코너 입지 프리미엄 심화
  * 공실 리스크로 임대현황 검증 중요성 증가
`;

// ── 게시물 생성 ──────────────────────────────────────────
export async function generatePost(params: {
  location: string;
  area: string;
  price: string;
  features: string;
  tone: 'professional' | 'friendly' | 'investment';
}): Promise<{ post: string; hashtags_general: string; hashtags_expert: string }> {

  const toneGuide: Record<string, string> = {
    professional: `
      [전문적 톤 가이드]
      - 수치와 팩트 중심: 수익률, 용적률, 임대현황 구체적으로
      - 감정적 표현 최소화, 데이터로 설득
      - "검토해보실 만합니다" 같은 모호한 표현 금지
      - 실제 투자 의사결정에 필요한 정보 중심
    `,
    friendly: `
      [친근한 톤 가이드]
      - 투자 입문자도 이해할 수 있는 쉬운 설명
      - "이런 물건이 왜 좋은지" 스토리텔링 방식
      - 질문형 문장으로 공감 유도
      - 하지만 핵심 수치(수익률, 위치 이점)는 반드시 포함
    `,
    investment: `
      [투자 강조 톤 가이드]
      - 투자자 관점의 EXIT 전략까지 언급
      - 시세차익 + 임대수익 이중 수익구조 강조
      - 희소성과 타이밍 강조 ("지금이 마지막 기회" 류)
      - 리스크 대비 리턴 관점으로 설명
    `
  };

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [{
      role: 'system',
      content: BSN_EXPERT_PERSONA
    }, {
      role: 'user',
      content: `아래 매물로 인스타그램 게시물을 작성해줘.

${toneGuide[params.tone]}

[매물 정보]
위치: ${params.location}
규모: ${params.area}
가격: ${params.price}
특징: ${params.features}

[작성 필수 요소]
1. 첫 줄: 스크롤을 멈추게 하는 후킹 문장 (위치+핵심 강점)
2. 본문: 투자자가 실제로 궁금해하는 정보 (임대현황, 수익구조, 입지 분석)
3. 희소성/긴급성 표현 자연스럽게 포함
4. 행동유도(DM/문의) 자연스럽게 마무리
5. 이모지는 전략적으로 2-3개만 사용 (남발 금지)
6. 줄바꿈으로 가독성 확보

[절대 금지 표현]
- '새로운 기회를 소개합니다' → 금지
- '놓치지 마세요' → 금지 (진부)
- '최고의 조건' → 금지 (근거없음)
- '문의하세요' → '010-XXXX-XXXX로 DM 주세요'처럼 구체적으로

[반드시 포함]
- 실제 수익률 계산 예시 (임대료×12÷매매가)
- 주변 시세 비교 언급
- 매수자가 검토해야 할 체크포인트 1개

[해시태그 - 각각 15개]
- 일반용: 매물 위치+특성으로 실제 검색되는 해시태그 (너무 큰 태그 금지)
- 전문가용: 투자자/법인 담당자가 검색하는 전문 해시태그

JSON 형식으로만 응답:
{
  "post": "게시물 본문",
  "hashtags_general": "#태그1 #태그2 ...",
  "hashtags_expert": "#태그1 #태그2 ..."
}`
    }]
  });

  const text = response.choices[0]?.message?.content || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return stripEmphasis(JSON.parse(clean));
  } catch {
    return stripEmphasis({ post: text, hashtags_general: '', hashtags_expert: '' });
  }
}

// ── 경쟁사 분석 ──────────────────────────────────────────
export async function analyzeCompetitor(account: string): Promise<{
  posting_pattern: string;
  content_types: string;
  hashtag_strategy: string;
  benchmarks: string[];
  weaknesses: string[];
  recommendations: string;
}> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [{
      role: 'system',
      content: BSN_EXPERT_PERSONA
    }, {
      role: 'user',
      content: `인스타그램 계정 @${account} 을 빌딩매매 공인중개사 관점에서 심층 분석해줘.

[분석 관점]
- 단순한 계정 분석이 아니라 "우리가 이 계정을 어떻게 이겨낼 것인가" 전략 분석
- 계정명, 아이디에서 유추할 수 있는 포지셔닝 파악
- 빌딩매매 시장에서의 경쟁 구도 맥락에서 분석

[분석 깊이 요구사항]
계정명 '@${account}'에서 유추 가능한 것들:
- 계정명의 키워드로 포지셔닝 파악
- 부동산 전문 계정인지 겸업 계정인지
- 타겟 고객층 추정

경쟁 전략 구체화:
- BSN이 이 계정보다 우월한 점 3가지 (구체적 근거)
- 이 계정 팔로워를 빼앗을 수 있는 콘텐츠 유형
- 절대 따라하면 안 되는 이 계정의 실수

[반드시 포함]
1. 예상 게시 패턴 (빈도, 시간대, 콘텐츠 비율)
2. 강점 콘텐츠 유형 + 약점 영역
3. 해시태그 전략의 허점
4. BSN이 차별화할 수 있는 구체적 포인트 3가지
5. 이 계정 팔로워를 BSN으로 유입시키는 전술

JSON 형식으로만 응답:
{
  "posting_pattern": "구체적 게시 패턴 분석 (수치 포함)",
  "content_types": "콘텐츠 유형별 분석 + 예상 반응률",
  "hashtag_strategy": "해시태그 전략 분석 + 개선 포인트",
  "benchmarks": ["따라할 점 1 (구체적 실행방법 포함)", "따라할 점 2", "따라할 점 3"],
  "weaknesses": ["이 계정의 약점 1 (BSN이 공략할 부분)", "약점 2", "약점 3"],
  "recommendations": "BSN만의 차별화 전략 (구체적 콘텐츠 기획안 3개 포함)"
}`
    }]
  });

  const text = response.choices[0]?.message?.content || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return stripEmphasis(JSON.parse(clean));
  } catch {
    return stripEmphasis({
      posting_pattern: text, content_types: '', hashtag_strategy: '',
      benchmarks: [], weaknesses: [], recommendations: ''
    });
  }
}

// ── 타겟 분석 ────────────────────────────────────────────
export async function analyzeTarget(params: {
  property_type: string;
  price_range: string;
  region: string;
}): Promise<{
  persona: string;
  pain_points: string;
  content_strategy: string;
  best_times: string;
  hashtag_categories: string[];
  sample_post_ideas: string[];
  dm_script: string;
}> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2500,
    messages: [{
      role: 'system',
      content: BSN_EXPERT_PERSONA
    }, {
      role: 'user',
      content: `${params.region} ${params.property_type} (${params.price_range}) 매수 잠재 고객을
인스타그램 마케팅 관점에서 심층 분석해줘.

[분석 깊이]
- 단순 페르소나가 아니라 실제 매수 결정 과정의 심리까지
- "어떤 콘텐츠를 보면 DM을 보내는가"까지 분석
- 구체적인 콘텐츠 기획안 (제목까지)

[페르소나 구체화 요구]
단순 묘사 금지. 아래 형식으로:
이름: (가상 이름)
나이/직업: 구체적으로
자산 규모: 대략적 수치
투자 경험: (첫 빌딩 vs 3번째 매수 등)
현재 고민: (지금 이 사람이 밤에 잠 못 자는 이유)
인스타 사용: (언제, 무슨 계정을 팔로우, 어떤 게시물에 저장)

[필수 포함 항목]
1. 페르소나: 위 형식대로 구체적 인물상
2. 페인포인트: 이 타겟이 빌딩 투자에서 가장 두려워하는 것/원하는 것
3. 콘텐츠 전략: 각 단계별 (인지→관심→신뢰→문의) 맞춤 콘텐츠
4. 최적 게시 시간: 이 타겟의 라이프스타일 기반으로 구체적으로
5. 해시태그: 이 타겟이 실제 검색하는 키워드 카테고리
6. 콘텐츠 아이디어: 즉시 제작 가능한 릴스/피드 기획안 5개 (제목+핵심메시지)
7. DM 스크립트: 단순 템플릿이 아니라 이 페르소나가 실제로 DM 보냈을 때 BSN 담당자가 써야 할 구체적 답변 (질문 2개 포함)

JSON 형식으로만 응답:
{
  "persona": "구체적 페르소나 (실제 인물처럼 묘사)",
  "pain_points": "핵심 페인포인트 + 욕구 분석",
  "content_strategy": "단계별 콘텐츠 전략 (인지/관심/신뢰/문의)",
  "best_times": "최적 게시 시간대 + 요일 (이유 포함)",
  "hashtag_categories": ["카테고리1: 예시태그", "카테고리2: 예시태그", "카테고리3: 예시태그", "카테고리4: 예시태그", "카테고리5: 예시태그"],
  "sample_post_ideas": ["[릴스] 제목: 내용핵심", "[피드] 제목: 내용핵심", "[릴스] 제목: 내용핵심", "[피드] 제목: 내용핵심", "[스토리] 제목: 내용핵심"],
  "dm_script": "문의 DM에 대한 첫 답변 템플릿 (실제 사용 가능하게)"
}`
    }]
  });

  const text = response.choices[0]?.message?.content || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return stripEmphasis(JSON.parse(clean));
  } catch {
    return stripEmphasis({
      persona: text, pain_points: '', content_strategy: '',
      best_times: '', hashtag_categories: [], sample_post_ideas: [], dm_script: ''
    });
  }
}

// ── 트렌드 모니터링 (단일/다중 지역) ─────────────────────
export async function getTrends(regions: string[]): Promise<{
  market_signal: string;
  hot_keywords: string[];
  content_opportunities: string[];
  weekly_themes: { day: string; theme: string; reason: string }[];
  urgent_topics: string;
  hashtag_trends: string;
  comparison?: string;
}> {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  const isCompare = regions.length > 1;
  const regionLabel = regions.join(', ');

  const compareSection = isCompare ? `
[비교 분석 필수 포함]
- 각 지역(${regionLabel})의 빌딩매매 시장 특성을 비교 분석
- 지역별 평균 거래가, 수익률, 공실률 차이
- 어떤 지역이 지금 가장 핫한지, 어떤 지역이 저평가되어 있는지
- 지역별로 다른 콘텐츠 전략이 필요한 부분
- "comparison" 필드에 지역 비교 분석 결과를 상세히 작성
` : '';

  const compareJson = isCompare ? `
  "comparison": "지역별 비교 분석 (각 지역의 장단점, 투자 매력도, 콘텐츠 차별화 포인트 상세 비교)",` : '';

  let response: any;
  try {
    // 1차 시도: gpt-4o-search-preview (자동 웹검색 지원)
    response = await client.chat.completions.create({
      model: 'gpt-4o-search-preview' as any,
      max_tokens: 3000,
      messages: [{
        role: 'system',
        content: BSN_EXPERT_PERSONA
      }, {
        role: 'user',
        content: `오늘(${today}) 기준으로 아래를 실제 웹 검색해서 분석해줘:

검색 키워드:
- "${regionLabel} 빌딩 매매 시장 2026"
- "수도권 상업용 부동산 트렌드 최근"
- "금리 부동산 시장 영향 2026"
- "빌딩 공실률 서울 최근"

검색 결과를 바탕으로 ${regionLabel} 빌딩매매
인스타그램 콘텐츠 전략을 분석해줘.

[분석 관점]
- 현재 부동산 시장 상황 (금리, 공실률, 거래량 트렌드)
- 빌딩매매 투자자들이 지금 가장 관심 갖는 이슈
- 경쟁 계정들이 아직 다루지 않은 콘텐츠 블루오션
- 이번 주 올리면 반응 좋을 주제
${compareSection}
[필수 포함]
1. 시장 시그널: 지금 빌딩 시장의 핵심 동향 (투자자가 알아야 할 것)
2. 핫 키워드: 지금 부동산 투자자들이 검색하는 키워드 10개
3. 콘텐츠 기회: 경쟁자가 안 다루는 블루오션 주제 5개
4. 요일별 테마: 월~금 각 요일에 맞는 콘텐츠 테마 (이유 포함)
5. 긴급 이슈: 지금 당장 올려야 할 시의성 있는 주제
6. 해시태그 트렌드: 지금 뜨고 있는 부동산 해시태그

JSON 형식으로만 응답:
{
  "market_signal": "현재 시장 핵심 동향 (구체적 수치/이슈 포함)",${compareJson}
  "hot_keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5", "키워드6", "키워드7", "키워드8", "키워드9", "키워드10"],
  "content_opportunities": ["블루오션 주제1 (구체적 기획안)", "주제2", "주제3", "주제4", "주제5"],
  "weekly_themes": [
    {"day": "월요일", "theme": "테마명", "reason": "이 요일에 올리는 이유"},
    {"day": "화요일", "theme": "테마명", "reason": "이유"},
    {"day": "수요일", "theme": "테마명", "reason": "이유"},
    {"day": "목요일", "theme": "테마명", "reason": "이유"},
    {"day": "금요일", "theme": "테마명", "reason": "이유"}
  ],
  "urgent_topics": "지금 당장 올려야 할 시의성 있는 콘텐츠 주제 3개 (이유 포함)",
  "hashtag_trends": "현재 트렌딩 해시태그 분석 + 추천"
}`
      }]
    });
  } catch {
    // 2차 시도: gpt-4o + web_search_preview 도구
    response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      tools: [{ type: 'web_search_preview' } as any],
      messages: [{
        role: 'system',
        content: BSN_EXPERT_PERSONA
      }, {
        role: 'user',
        content: `오늘(${today}) 기준으로 아래를 실제 웹 검색해서 분석해줘:

검색 키워드:
- "${regionLabel} 빌딩 매매 시장 2026"
- "수도권 상업용 부동산 트렌드 최근"
- "금리 부동산 시장 영향 2026"
- "빌딩 공실률 서울 최근"

검색 결과를 바탕으로 ${regionLabel} 빌딩매매
인스타그램 콘텐츠 전략을 분석해줘.

[분석 관점]
- 현재 부동산 시장 상황 (금리, 공실률, 거래량 트렌드)
- 빌딩매매 투자자들이 지금 가장 관심 갖는 이슈
- 경쟁 계정들이 아직 다루지 않은 콘텐츠 블루오션
- 이번 주 올리면 반응 좋을 주제
${compareSection}
[필수 포함]
1. 시장 시그널: 지금 빌딩 시장의 핵심 동향 (투자자가 알아야 할 것)
2. 핫 키워드: 지금 부동산 투자자들이 검색하는 키워드 10개
3. 콘텐츠 기회: 경쟁자가 안 다루는 블루오션 주제 5개
4. 요일별 테마: 월~금 각 요일에 맞는 콘텐츠 테마 (이유 포함)
5. 긴급 이슈: 지금 당장 올려야 할 시의성 있는 주제
6. 해시태그 트렌드: 지금 뜨고 있는 부동산 해시태그

JSON 형식으로만 응답:
{
  "market_signal": "현재 시장 핵심 동향 (구체적 수치/이슈 포함)",${compareJson}
  "hot_keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5", "키워드6", "키워드7", "키워드8", "키워드9", "키워드10"],
  "content_opportunities": ["블루오션 주제1 (구체적 기획안)", "주제2", "주제3", "주제4", "주제5"],
  "weekly_themes": [
    {"day": "월요일", "theme": "테마명", "reason": "이 요일에 올리는 이유"},
    {"day": "화요일", "theme": "테마명", "reason": "이유"},
    {"day": "수요일", "theme": "테마명", "reason": "이유"},
    {"day": "목요일", "theme": "테마명", "reason": "이유"},
    {"day": "금요일", "theme": "테마명", "reason": "이유"}
  ],
  "urgent_topics": "지금 당장 올려야 할 시의성 있는 콘텐츠 주제 3개 (이유 포함)",
  "hashtag_trends": "현재 트렌딩 해시태그 분석 + 추천"
}`
      }]
    });
  }

  const text = response.choices[0]?.message?.content || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return stripEmphasis(JSON.parse(clean));
  } catch {
    return stripEmphasis({
      market_signal: text, hot_keywords: [], content_opportunities: [],
      weekly_themes: [], urgent_topics: '', hashtag_trends: ''
    });
  }
}

// ── 마케팅 플랜 생성 ─────────────────────────────────────
export async function generateMarketingPlan(params: {
  location: string;
  price: string;
  property_type: string;
  target: string;
  goal: string;
}): Promise<{
  calendar: { day: string; time: string; type: string; title: string; hook: string; hashtags: string }[];
  ab_posts: { version_a: string; version_b: string; test_point: string }[];
  hook_sentences: string[];
}> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 3000,
    messages: [{
      role: 'system',
      content: BSN_EXPERT_PERSONA
    }, {
      role: 'user',
      content: `아래 조건으로 1주일 인스타그램 마케팅 플랜을 수립해줘.

[조건]
매물 지역: ${params.location}
가격대: ${params.price}
매물 유형: ${params.property_type}
타겟 고객: ${params.target}
마케팅 목표: ${params.goal}

[필수 포함]
1. 주간 콘텐츠 캘린더 (월~금, 각 요일별)
   - 게시 시간, 콘텐츠 유형(릴스/피드/스토리/캐러셀), 제목, 후킹 문장, 해시태그
2. A/B 테스트용 게시물 3세트
   - 같은 주제를 다른 각도로 접근한 2개 버전 + 테스트 포인트
3. 후킹 문장 10개
   - 스크롤을 멈추게 하는 첫 문장 (다양한 스타일)

[작성 원칙]
- 모든 콘텐츠는 빌딩매매 전문가 관점
- 구체적 수치와 사례 포함
- 즉시 제작 가능한 수준의 구체성
- 타겟 고객의 심리를 정확히 자극

JSON 형식으로만 응답:
{
  "calendar": [
    {"day": "월요일", "time": "08:30", "type": "릴스", "title": "콘텐츠 제목", "hook": "후킹 첫 문장", "hashtags": "#태그1 #태그2 ..."},
    {"day": "화요일", "time": "12:00", "type": "캐러셀", "title": "제목", "hook": "후킹", "hashtags": "#태그"},
    {"day": "수요일", "time": "18:00", "type": "피드", "title": "제목", "hook": "후킹", "hashtags": "#태그"},
    {"day": "목요일", "time": "08:30", "type": "스토리", "title": "제목", "hook": "후킹", "hashtags": "#태그"},
    {"day": "금요일", "time": "17:00", "type": "릴스", "title": "제목", "hook": "후킹", "hashtags": "#태그"}
  ],
  "ab_posts": [
    {"version_a": "A버전 게시물 전문", "version_b": "B버전 게시물 전문", "test_point": "무엇을 테스트하는지"},
    {"version_a": "A버전", "version_b": "B버전", "test_point": "테스트 포인트"},
    {"version_a": "A버전", "version_b": "B버전", "test_point": "테스트 포인트"}
  ],
  "hook_sentences": ["후킹1", "후킹2", "후킹3", "후킹4", "후킹5", "후킹6", "후킹7", "후킹8", "후킹9", "후킹10"]
}`
    }]
  });

  const text = response.choices[0]?.message?.content || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return stripEmphasis(JSON.parse(clean));
  } catch {
    return { calendar: [], ab_posts: [], hook_sentences: [] };
  }
}

// ── 게시물 품질 검증 ─────────────────────────────────────
export async function validatePost(post: string): Promise<{
  score: number;
  issues: string[];
  improved_post: string;
}> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1500,
    messages: [{
      role: 'system',
      content: BSN_EXPERT_PERSONA
    }, {
      role: 'user',
      content: `아래 인스타그램 게시물을 빌딩매매 전문가 관점에서 검토해줘.

게시물:
${post}

평가 기준:
1. 전문성 (0-25): 빌딩매매 전문 용어와 수치 포함 여부
2. 신뢰도 (0-25): 근거 있는 정보 vs 과장/모호한 표현
3. 후킹력 (0-25): 첫 문장이 스크롤을 멈추게 하는가
4. 행동유도 (0-25): DM/문의로 이어지는 자연스러운 흐름

JSON으로만 응답:
{
  "score": 총점(0-100),
  "issues": ["개선점1", "개선점2"],
  "improved_post": "개선된 버전 (점수가 80 미만인 경우만)"
}`
    }]
  });

  const text = response.choices[0]?.message?.content || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return stripEmphasis(JSON.parse(clean));
  } catch {
    return { score: 0, issues: [], improved_post: '' };
  }
}
