import fs from 'fs';
import path from 'path';
import axios from 'axios';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DATA_PATH = path.join(__dirname, '..', 'data', 'learned_articles.json');

export interface LearnedArticle {
  id: string;
  url: string;
  title: string;
  source: string;
  sourceType: 'url' | 'pdf';
  date: string;
  tags: string[];
  summary: string;
  region: string;
  tone: string;
  key_data: string[];
  building_relevance: string;
  analyzedAt: string;
}

interface LearnData {
  articles: LearnedArticle[];
  lastUpdated: string;
}

// ── 데이터 읽기/쓰기 ───
function loadData(): LearnData {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    }
  } catch {}
  return { articles: [], lastUpdated: '' };
}

function saveData(data: LearnData): void {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  data.lastUpdated = new Date().toISOString();
  const tmp = DATA_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_PATH);
}

// ── 출처 매핑 ───
const SOURCE_MAP: Record<string, string> = {
  'news.naver.com': '네이버뉴스', 'n.news.naver.com': '네이버뉴스',
  'mk.co.kr': '매일경제', 'hankyung.com': '한국경제',
  'chosun.com': '조선일보', 'donga.com': '동아일보',
  'sedaily.com': '서울경제', 'mt.co.kr': '머니투데이',
  'edaily.co.kr': '이데일리', 'newsis.com': '뉴시스', 'yna.co.kr': '연합뉴스',
};

function getSource(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    for (const [domain, name] of Object.entries(SOURCE_MAP)) {
      if (host.includes(domain)) return name;
    }
    return host;
  } catch { return '알 수 없음'; }
}

// ── 기사 스크래핑 ───
async function scrapeArticle(url: string): Promise<{ title: string; body: string; date: string }> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Referer': 'https://www.google.com/'
  };

  // 1차: 원본 URL
  let html = '';
  try {
    const resp = await axios.get(url, { headers, timeout: 15000 });
    html = resp.data;
  } catch {
    // 2차: 네이버 모바일 URL 시도
    if (url.includes('news.naver.com') || url.includes('n.news.naver.com')) {
      try {
        const mUrl = url.replace('n.news.naver.com', 'm.news.naver.com').replace('news.naver.com', 'm.news.naver.com');
        const resp = await axios.get(mUrl, { headers, timeout: 15000 });
        html = resp.data;
      } catch {}
    }
  }

  // HTML 파싱
  let title = '';
  let body = '';
  let date = '';

  // 제목 추출
  const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1]
    || html.match(/content="([^"]+)"\s+property="og:title"/)?.[1];
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1];
  title = (ogTitle || titleTag || h1 || '').replace(/&[^;]+;/g, ' ').trim();

  // 본문 추출
  const bodySelectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /class="article_body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /id="articleBody[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="news_end[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];
  for (const sel of bodySelectors) {
    const m = html.match(sel);
    if (m && m[1]) {
      body = m[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (body.length > 100) break;
    }
  }
  if (body.length < 100) {
    body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  body = body.slice(0, 4000);

  // 날짜 추출
  const dateMeta = html.match(/property="article:published_time"\s+content="([^"]+)"/)?.[1]
    || html.match(/content="([^"]+)"\s+property="article:published_time"/)?.[1];
  if (dateMeta) date = dateMeta.slice(0, 10);
  if (!date) {
    const dateMatch = html.match(/(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
    if (dateMatch) date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }
  if (!date) date = new Date().toISOString().slice(0, 10);

  return { title, body, date };
}

// ── GPT 분석 ───
async function analyzeArticle(title: string, body: string, url: string): Promise<any> {
  const content = body.length > 50 ? `제목: ${title}\n\n본문:\n${body}` : `URL: ${url}\n제목: ${title}\n(본문 추출 실패 — 제목과 URL 기반으로 추론 분석해주세요)`;

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `당신은 상업용 빌딩 매매 중개 전문가입니다.
다음 부동산 관련 기사를 '빌딩 매매 및 상권 분석' 관점에서 분석하여 JSON만 반환하세요.
마크다운 코드블록으로 감싸지 마세요. 순수 JSON만 출력하세요.

기사의 주제가 빌딩 매매와 직접 관련 없더라도,
빌딩 매매가, 상권 활성도, 거래량, 임대료, 권리금에 어떤 영향을 줄 수 있는지의
관점에서 요약하고 분석하세요.

{
  "title": "기사 제목",
  "summary": "빌딩 매매/상권 관점에서 2-3문장 요약",
  "tags": ["상권","개발호재","임대료","권리금","법률변화","빌딩매매","유명인","F&B","브랜드입점","리모델링","수익률","세법","기타 중 해당하는 것"],
  "region": "관련 지역",
  "tone": "긍정 또는 부정 또는 중립 또는 분석",
  "key_data": ["핵심 수치 배열"],
  "building_relevance": "빌딩 매매에 미치는 영향 1문장"
}`
        },
        { role: 'user', content }
      ]
    });

    const text = (res.choices[0]?.message?.content || '{}').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    console.log('[학습] GPT 응답 (앞 300자):', text.slice(0, 300));
    try { return JSON.parse(text); } catch (parseErr: any) {
      console.error('[학습] GPT JSON 파싱 실패:', parseErr.message);
      return { title: title || url, summary: '분석 실패 — GPT 응답 파싱 오류', tags: ['기타'], region: '', tone: '중립', key_data: [], building_relevance: '' };
    }
  } catch (apiErr: any) {
    console.error('[학습] GPT API 호출 실패:', apiErr.message);
    return { title: title || url, summary: '분석 실패 — API 오류: ' + (apiErr.message || '').slice(0, 100), tags: ['기타'], region: '', tone: '중립', key_data: [], building_relevance: '' };
  }
}

// ── 공개 함수들 ───

export function getArticles(): LearnedArticle[] {
  return loadData().articles;
}

export function getArticleStats() {
  const articles = getArticles();
  const tagCount: Record<string, number> = {};
  articles.forEach(a => a.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const total = articles.length;
  const urlCount = articles.filter(a => a.sourceType === 'url').length;
  const pdfCount = articles.filter(a => a.sourceType === 'pdf').length;
  const stats = Object.entries(tagCount).map(([tag, count]) => ({ tag, count, percentage: total ? Math.round(count / total * 100) : 0 })).sort((a, b) => b.count - a.count);
  return { total, urlCount, pdfCount, stats };
}

export function deleteArticle(id: string): number {
  const data = loadData();
  data.articles = data.articles.filter(a => a.id !== id);
  saveData(data);
  return data.articles.length;
}

export async function addArticlesFromUrls(urls: string[]): Promise<{ added: number; skipped: number; failed: number; articles: LearnedArticle[]; errors: string[] }> {
  const data = loadData();
  const existingUrls = new Set(data.articles.map(a => a.url));
  const newArticles: LearnedArticle[] = [];
  let skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const url of urls) {
    if (existingUrls.has(url)) { skipped++; continue; }
    try {
      console.log('[학습] 스크래핑:', url);
      const { title, body, date } = await scrapeArticle(url);
      console.log('[학습] GPT 분석 중:', title || url);
      const analysis = await analyzeArticle(title, body, url);
      const article: LearnedArticle = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        url,
        title: analysis.title || title || url,
        source: getSource(url),
        sourceType: 'url',
        date: date || new Date().toISOString().slice(0, 10),
        tags: Array.isArray(analysis.tags) ? analysis.tags : ['기타'],
        summary: analysis.summary || '',
        region: analysis.region || '',
        tone: analysis.tone || '중립',
        key_data: Array.isArray(analysis.key_data) ? analysis.key_data : [],
        building_relevance: analysis.building_relevance || '',
        analyzedAt: new Date().toISOString(),
      };
      newArticles.push(article);
      existingUrls.add(url);
    } catch (e: any) {
      failed++;
      errors.push(`${url}: ${e.message}`);
    }
  }

  if (newArticles.length > 0) {
    data.articles.unshift(...newArticles);
    saveData(data);
  }

  return { added: newArticles.length, skipped, failed, articles: newArticles, errors };
}

export async function addArticlesFromPdf(files: { originalname: string; buffer: Buffer }[]): Promise<{ added: number; skipped: number; failed: number; articles: LearnedArticle[]; errors: string[] }> {
  const pdfParse = require('pdf-parse');
  const data = loadData();
  const existingUrls = new Set(data.articles.map(a => a.url));
  const newArticles: LearnedArticle[] = [];
  let skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const file of files) {
    const pdfUrl = `pdf://${file.originalname}`;
    if (existingUrls.has(pdfUrl)) { skipped++; console.log('[학습] PDF 스킵 (중복):', file.originalname); continue; }

    try {
      console.log('[학습] PDF 파싱 시작:', file.originalname, 'size:', file.buffer.length);
      let pdfData: any;
      try {
        pdfData = await pdfParse(file.buffer);
      } catch (parseErr: any) {
        console.error('[학습] PDF 파싱 에러:', file.originalname, parseErr.message);
        errors.push(`${file.originalname}: PDF 읽기 실패 — ${parseErr.message}`);
        failed++; continue;
      }
      const rawText = pdfData.text;
      console.log('[학습] PDF text 타입:', typeof rawText, 'isArray:', Array.isArray(rawText));
      const text = String(rawText || '').substring(0, 8000);
      console.log('[학습] PDF 텍스트 추출 완료:', file.originalname, '길이:', text.length);
      if (!text || text.trim().length < 50) {
        errors.push(`${file.originalname}: 이미지나 그래픽으로만 작성된 PDF는 지원하지 않습니다. 텍스트가 포함된 PDF 파일을 업로드해주세요.`);
        failed++; continue;
      }

      console.log('[학습] PDF GPT 분석 중:', file.originalname);
      const analysis = await analyzeArticle(file.originalname, text, pdfUrl);
      const article: LearnedArticle = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        url: pdfUrl,
        title: analysis.title || file.originalname,
        source: 'PDF 업로드',
        sourceType: 'pdf',
        date: new Date().toISOString().slice(0, 10),
        tags: Array.isArray(analysis.tags) ? analysis.tags : ['기타'],
        summary: analysis.summary || '',
        region: analysis.region || '',
        tone: analysis.tone || '중립',
        key_data: Array.isArray(analysis.key_data) ? analysis.key_data : [],
        building_relevance: analysis.building_relevance || '',
        analyzedAt: new Date().toISOString(),
      };
      newArticles.push(article);
      existingUrls.add(pdfUrl);
      console.log('[학습] PDF 분석 완료:', file.originalname);
    } catch (e: any) {
      console.error('[학습] PDF 처리 실패:', file.originalname, e.message, e.stack?.slice(0, 200));
      failed++;
      errors.push(`${file.originalname}: ${e.message}`);
    }
  }

  if (newArticles.length > 0) {
    data.articles.unshift(...newArticles);
    saveData(data);
  }

  return { added: newArticles.length, skipped, failed, articles: newArticles, errors };
}

// ── 콘텐츠 생성 시 참조 데이터 생성 ───
export function buildLearningContext(): string {
  const articles = getArticles().slice(0, 20);
  if (articles.length === 0) return '';

  const { stats } = getArticleStats();
  const topTags = stats.slice(0, 5).map(s => s.tag).join(', ');
  const toneCount: Record<string, number> = {};
  articles.forEach(a => { toneCount[a.tone] = (toneCount[a.tone] || 0) + 1; });
  const topTone = Object.entries(toneCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '분석';

  const recent10 = articles.slice(0, 10);
  const summaries = recent10.map((a, i) => `${i + 1}. ${a.summary}`).join('\n');
  const keyData = recent10.flatMap(a => a.key_data).filter(Boolean).slice(0, 15).join(', ');
  const relevance = recent10.map(a => a.building_relevance).filter(Boolean).join(' / ');

  return `
[참조 데이터 — 이 팀이 그동안 다뤄온 콘텐츠 성향]
주요 관심 태그: ${topTags}
최근 다룬 주제들:
${summaries}
최근 기사의 핵심 수치들: ${keyData}
빌딩 매매 연관성: ${relevance}
선호하는 톤: ${topTone}

위 데이터는 톤과 주제 선호도를 파악하기 위한 참고자료입니다.
단, 콘텐츠의 관점은 반드시 앞서 지시한 '빌딩 매매/상권 분석' 관점을 우선 적용하세요.`;
}
