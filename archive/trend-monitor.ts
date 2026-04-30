import axios from 'axios';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 빌딩매매 핵심 키워드 목록
const BUILDING_KEYWORDS = [
  '빌딩매매', '상업용부동산', '수익형부동산',
  '꼬마빌딩', '중소형빌딩', '빌딩투자',
  '부동산투자', '임대수익', '공실률',
  '빌딩시세', '상가투자', '토지매매'
];

// ── 네이버 DataLab API ──────────────────────────────────
export async function getNaverTrends(): Promise<{
  keyword: string;
  ratio: number;
  source: string;
}[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  try {
    const keywordGroups = BUILDING_KEYWORDS.slice(0, 5).map(kw => ({
      groupName: kw,
      keywords: [kw]
    }));

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const response = await axios.post(
      'https://openapi.naver.com/v1/datalab/search',
      {
        startDate,
        endDate,
        timeUnit: 'week',
        keywordGroups,
        device: 'mo',
        ages: ['3', '4', '5'],
        gender: 'a'
      },
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
          'Content-Type': 'application/json'
        }
      }
    );

    const results = response.data.results || [];
    return results.map((r: any) => {
      const latestData = r.data[r.data.length - 1];
      return {
        keyword: r.title,
        ratio: Math.round(latestData?.ratio || 0),
        source: '네이버'
      };
    }).sort((a: any, b: any) => b.ratio - a.ratio);

  } catch (err) {
    console.error('네이버 DataLab 오류:', err);
    return [];
  }
}

// ── YouTube Data API ────────────────────────────────────
export async function getYoutubeTrends(): Promise<{
  keyword: string;
  viewCount: number;
  source: string;
  videoTitle?: string;
  videoUrl?: string;
}[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const results = [];

    for (const keyword of BUILDING_KEYWORDS.slice(0, 6)) {
      const response = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            part: 'snippet',
            q: keyword + ' 2026',
            type: 'video',
            order: 'viewCount',
            maxResults: 1,
            regionCode: 'KR',
            relevanceLanguage: 'ko',
            key: apiKey
          }
        }
      );

      const items = response.data.items || [];
      if (items.length > 0) {
        const item = items[0];
        const statsRes = await axios.get(
          'https://www.googleapis.com/youtube/v3/videos',
          {
            params: {
              part: 'statistics',
              id: item.id.videoId,
              key: apiKey
            }
          }
        );
        const stats = statsRes.data.items?.[0]?.statistics;
        results.push({
          keyword,
          viewCount: parseInt(stats?.viewCount || '0'),
          source: '유튜브',
          videoTitle: item.snippet.title,
          videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
        });
      }
    }

    return results.sort((a, b) => b.viewCount - a.viewCount);
  } catch (err) {
    console.error('YouTube API 오류:', err);
    return [];
  }
}

// ── GPT-4o 웹검색 기반 시장 동향 ───────────────────────
export async function getMarketInsights(region: string): Promise<{
  signal: string;
  urgentTopics: string;
  weeklyThemes: { day: string; theme: string; reason: string }[];
  contentOpportunities: string[];
}> {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [{
        role: 'system',
        content: `당신은 수도권 빌딩매매 전문 공인중개사이자 부동산 시장 분석가입니다.
2025~2026년 최신 시장 동향을 반영하여 분석합니다.
현재 시장 상황:
- 고금리 장기화로 수익형 빌딩 수요 지속
- 소형빌딩(50억 미만) 거래 활성화 추세
- 법인 매수자 비중 증가 (세금 절감 목적)
- 역세권 + 코너 입지 프리미엄 심화
- 공실 리스크로 임대현황 검증 중요성 증가`
      }, {
        role: 'user',
        content: `오늘(${today}) 기준 ${region} 빌딩매매 시장을 분석해줘.

JSON으로만 응답:
{
  "signal": "현재 시장 핵심 동향 3가지 (구체적 수치 포함, 각 항목 줄바꿈)",
  "urgentTopics": "지금 당장 올려야 할 시의성 있는 콘텐츠 주제 3개 (이유 포함)",
  "weeklyThemes": [
    {"day": "월요일", "theme": "콘텐츠 테마", "reason": "이 요일에 올리는 이유"},
    {"day": "화요일", "theme": "콘텐츠 테마", "reason": "이유"},
    {"day": "수요일", "theme": "콘텐츠 테마", "reason": "이유"},
    {"day": "목요일", "theme": "콘텐츠 테마", "reason": "이유"},
    {"day": "금요일", "theme": "콘텐츠 테마", "reason": "이유"}
  ],
  "contentOpportunities": [
    "경쟁자가 안 다루는 블루오션 콘텐츠 주제 (구체적 기획안)",
    "주제2", "주제3", "주제4", "주제5"
  ]
}`
      }]
    });

    const text = response.choices[0]?.message?.content || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('GPT 시장분석 오류:', err);
    return {
      signal: '시장 분석 중 오류가 발생했습니다.',
      urgentTopics: '',
      weeklyThemes: [],
      contentOpportunities: []
    };
  }
}

// ── 통합 트렌드 분석 ────────────────────────────────────
export async function getIntegratedTrends(region: string): Promise<{
  naverTrends: { keyword: string; ratio: number; source: string }[];
  youtubeTrends: { keyword: string; viewCount: number; source: string; videoTitle?: string; videoUrl?: string }[];
  marketInsights: any;
  topKeywords: { keyword: string; score: number; sources: string[] }[];
}> {
  const [naverTrends, youtubeTrends, marketInsights] = await Promise.all([
    getNaverTrends(),
    getYoutubeTrends(),
    getMarketInsights(region)
  ]);

  const keywordScores: Record<string, { score: number; sources: string[] }> = {};

  naverTrends.forEach((item, idx) => {
    const key = item.keyword;
    if (!keywordScores[key]) keywordScores[key] = { score: 0, sources: [] };
    keywordScores[key].score += (naverTrends.length - idx) * 3 + item.ratio;
    keywordScores[key].sources.push('네이버');
  });

  youtubeTrends.forEach((item, idx) => {
    const key = item.keyword;
    if (!keywordScores[key]) keywordScores[key] = { score: 0, sources: [] };
    keywordScores[key].score += (youtubeTrends.length - idx) * 3;
    keywordScores[key].sources.push('유튜브');
  });

  const topKeywords = Object.entries(keywordScores)
    .map(([keyword, data]) => ({ keyword, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return { naverTrends, youtubeTrends, marketInsights, topKeywords };
}
